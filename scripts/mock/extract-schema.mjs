#!/usr/bin/env node
/**
 * 从 src/pages 下的页面定义（define.ts）提取列表/详情字段，
 * 生成 src/mock/schema.generated.ts，供本地数据引擎按真实字段结构造数。
 *
 * 运行：node scripts/mock/extract-schema.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const PAGES_DIR = path.join(ROOT, 'src/pages')
const API_DIR = path.join(ROOT, 'src/service/api')
const OUT_FILE = path.join(ROOT, 'src/mock/schema.generated.ts')

/** 读取目录下所有文件（递归） */
function walk(dir, filter = () => true) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full, filter))
    }
    else if (filter(full)) {
      out.push(full)
    }
  }
  return out
}

/** 提取大括号/中括号配对的片段 */
function sliceBalanced(source, startIndex, open = '[', close = ']') {
  let depth = 0
  for (let i = startIndex; i < source.length; i++) {
    if (source[i] === open) {
      depth++
    }
    else if (source[i] === close) {
      depth--
      if (depth === 0)
        return source.slice(startIndex, i + 1)
    }
  }
  return ''
}

function parseFields(file) {
  const source = fs.readFileSync(file, 'utf-8')
  const anchor = source.indexOf('export const fields')
  if (anchor === -1)
    return []
  const start = source.indexOf('[', anchor)
  const block = sliceBalanced(source, start)
  const fields = []
  for (const match of block.matchAll(/\{([^{}]*)\}/g)) {
    const body = match[1]
    const key = body.match(/key:\s*'([^']+)'/)?.[1]
    if (!key)
      continue
    const num = name => Number(body.match(new RegExp(`${name}:\\s*(\\d+)`))?.[1] ?? 0)
    fields.push({
      key,
      label: body.match(/label:\s*'([^']*)'/)?.[1] || '',
      title: body.match(/title:\s*'([^']*)'/)?.[1] || '',
      listOrder: num('id'),
      detailOrder: num('idx'),
      transform: /useTransform:\s*true/.test(body),
    })
  }
  return fields
}

function parseTransform(file) {
  const source = fs.readFileSync(file, 'utf-8')
  const enumBlock = source.match(/enum:\s*\{([\s\S]*?)\}/)?.[1] || ''
  const enums = {}
  for (const m of enumBlock.matchAll(/(\w+):\s*'([^']+)'/g)) enums[m[1]] = m[2]
  const numberBlock = source.match(/number:\s*\[([^\]]*)\]/)?.[1] || ''
  const numbers = [...numberBlock.matchAll(/'([^']+)'/g)].map(m => m[1])
  const customAnchor = source.indexOf('custom:')
  let customBlock = ''
  if (customAnchor !== -1) {
    const start = source.indexOf('{', customAnchor)
    customBlock = sliceBalanced(source, start, '{', '}')
  }
  const customs = [...customBlock.matchAll(/^\s*(\w+):/gm)].map(m => m[1])
  return { enums, numbers, customs }
}

/** 页面目录 -> 接口模块基础路径 */
function resolveApiBase(pageDir, sources) {
  const urls = new Set()
  for (const source of sources) {
    for (const m of source.matchAll(/from '@\/service\/api\/([^']+)'/g)) {
      const mod = m[1]
      const candidates = [
        path.join(API_DIR, `${mod}.ts`),
        path.join(API_DIR, mod, 'index.ts'),
      ]
      // 聚合入口会把具体接口拆到同级文件，全部读入再按页面路径匹配
      const files = []
      for (const file of candidates) {
        if (fs.existsSync(file))
          files.push(file)
      }
      const modDir = path.join(API_DIR, mod)
      if (fs.existsSync(modDir) && fs.statSync(modDir).isDirectory()) {
        files.push(...walk(modDir, f => f.endsWith('.ts')))
      }
      for (const file of new Set(files)) {
        const text = fs.readFileSync(file, 'utf-8')
        for (const u of text.matchAll(/'(atlas\/[^']+)'/g)) urls.add(u[1])
        for (const u of text.matchAll(/`(atlas\/[^`]+)`/g)) {
          const base = u[1].replace(/\/(get|search|getlist|create|update|delete|updatestoped)$/, '')
          urls.add(base)
        }
      }
    }
  }
  const rel = pageDir.replace(/\\/g, '/')
  // 聚合查询页的接口名与目录名不一致，单独指定
  const OVERRIDES = {
    'pense': 'pense/query',
    'staff/apply': 'staff/apply/query',
  }
  if (OVERRIDES[rel])
    return OVERRIDES[rel]
  const list = [...urls]
  const normalized = list.map(u => u.replace(/^atlas\//, '').replace(/\/(get|search|getlist)$/, ''))
  let idx = normalized.findIndex(u => u === rel)
  if (idx === -1)
    idx = normalized.findIndex(u => u.startsWith(`${rel}/`))
  if (idx === -1)
    idx = normalized.findIndex(u => rel.endsWith(u))
  if (idx === -1)
    idx = normalized.findIndex(u => u.split('/').pop() === rel.split('/').pop())
  return idx === -1 ? null : list[idx].replace(/^atlas\//, '')
}

const pages = []
for (const file of walk(PAGES_DIR, f => f.endsWith('index.vue'))) {
  const dir = path.dirname(file)
  const rel = path.relative(PAGES_DIR, dir).replace(/\\/g, '/')
  const defineFile = path.join(dir, 'define.ts')
  if (!fs.existsSync(defineFile))
    continue

  const fields = parseFields(defineFile)
  if (!fields.length)
    continue

  const source = fs.readFileSync(file, 'utf-8')
  const detailFile = path.join(dir, 'detail.vue')
  const detailSource = fs.existsSync(detailFile) ? fs.readFileSync(detailFile, 'utf-8') : ''
  const title = source.match(/PageNavbar\s+title="([^"]+)"/)?.[1]
    || source.match(/PageNavbar\s+:title="([^"]+)"/)?.[1]
    || rel
  const base = resolveApiBase(rel, [source, detailSource])
  if (!base) {
    console.warn(`[skip] 无法解析接口模块：${rel}`)
    continue
  }
  const { enums, numbers, customs } = parseTransform(defineFile)
  const detailItemKeys = [...new Set([...detailSource.matchAll(/\bitem\.([a-z]\w*)/g)].map(m => m[1]))]
    .filter(k => !['length', 'value', 'label', 'key'].includes(k))
  const detailFormKeys = [...new Set([...detailSource.matchAll(/\bformModel\.([a-z]\w*)/g)].map(m => m[1]))]
    .filter(k => !['transform', 'value', 'length'].includes(k))
  pages.push({ page: rel, title, base, fields, enums, numbers, customs, detailItemKeys, detailFormKeys })
}

const header = `/* eslint-disable */
// 本文件由 scripts/mock/extract-schema.mjs 自动生成，请勿手工修改。
// 数据来源：src/pages/**/define.ts + src/service/api/**。
// 重新生成：node scripts/mock/extract-schema.mjs

export interface MockField {
  key: string
  label: string
  title: string
  listOrder: number
  detailOrder: number
  transform?: boolean
}

export interface MockModule {
  /** 页面目录，同时作为数据域标识 */
  page: string
  /** 列表/详情标题 */
  title: string
  /** 接口基础路径（不含 atlas/ 前缀） */
  base: string
  fields: MockField[]
  enums: Record<string, string>
  numbers: string[]
  customs: string[]
  /** 详情页明细表格用到的字段 */
  detailItemKeys: string[]
  /** 详情页表单模型用到的字段 */
  detailFormKeys: string[]
}

export const MOCK_MODULES: MockModule[] = ${JSON.stringify(pages, null, 2)}
`

fs.writeFileSync(OUT_FILE, header)
console.log(`生成 ${path.relative(ROOT, OUT_FILE)}：${pages.length} 个模块，${pages.reduce((n, p) => n + p.fields.length, 0)} 个字段`)
