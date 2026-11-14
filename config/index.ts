import fs from 'node:fs'
import path from 'node:path'
import NutUIResolver from '@nutui/auto-import-resolver'
import { defineConfig } from '@tarojs/cli'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import Components from 'unplugin-vue-components/webpack'
import { IgnorePlugin } from 'webpack'

// 手动加载 env 文件（Taro 的 dotenvParse 不写入 process.env）
const mode = process.env.NODE_ENV || 'development'
const appPath = path.resolve(__dirname, '..')
function loadEnvVars() {
  const result: Record<string, string> = {}
  const files = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(appPath, file), 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#'))
          continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1)
          continue
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (key.startsWith('TARO_APP_'))
          result[key] = val
      }
    }
    catch {}
  }
  // 允许运行时环境变量覆盖文件值（CI / GitHub Pages 构建时注入 basename 等）
  for (const [key, val] of Object.entries(process.env)) {
    if (key.startsWith('TARO_APP_') && val)
      result[key] = val
  }
  return result
}
const envVars = loadEnvVars()

export default defineConfig<'webpack5'>({
  projectName: 'atlas-admin-app',
  date: '2026-04-10',
  sass: {
    resource: [
      path.resolve(__dirname, '..', 'src/styles/custom_theme.scss'),
      path.resolve(__dirname, '..', 'src/styles/variables.scss'),
      path.resolve(__dirname, '..', 'src/styles/mixins.scss'),
    ],
  },
  designWidth(input) {
    if (input?.file?.replace(/\\+/g, '/').indexOf('@nutui/nutui-taro') > -1) {
      return 375
    }
    return 750
  },
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    375: 2 / 1,
  },
  sourceRoot: 'src',
  // 允许把产物输出到工作区外（沙箱/CI 中避免清理 dist 时的文件回收开销）
  outputRoot: process.env.ATLAS_OUT_DIR || 'dist/atlas-admin-app',
  plugins: ['@tarojs/plugin-html'],
  defineConstants: {
    'process.env.TARO_APP_API_URL': JSON.stringify(envVars.TARO_APP_API_URL || ''),
    'process.env.TARO_APP_API_URL_PREFIX': JSON.stringify(envVars.TARO_APP_API_URL_PREFIX || '/api'),
    'process.env.TARO_APP_API_AUTH_PREFIX': JSON.stringify(envVars.TARO_APP_API_AUTH_PREFIX || 'mis'),
    'process.env.TARO_APP_USE_MOCK': JSON.stringify(envVars.TARO_APP_USE_MOCK || 'false'),
    'process.env.TARO_APP_PASSWORD_LOGIN': JSON.stringify(envVars.TARO_APP_PASSWORD_LOGIN || 'false'),
    'process.env.TARO_APP_H5_BASENAME': JSON.stringify(envVars.TARO_APP_H5_BASENAME || 'app'),
    'process.env.TARO_APP_FILE_PREVIEW_BASE': JSON.stringify(envVars.TARO_APP_FILE_PREVIEW_BASE || ''),
    'process.env.TARO_APP_FACE_LIVENESS_ENABLE': JSON.stringify(envVars.TARO_APP_FACE_LIVENESS_ENABLE || 'false'),
    'process.env.TARO_APP_FACE_LIVENESS_MODEL_URL': JSON.stringify(envVars.TARO_APP_FACE_LIVENESS_MODEL_URL || ''),
    '__VUE_OPTIONS_API__': 'true',
    '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': 'false',
  },
  copy: { patterns: [], options: {} },
  framework: 'vue3',
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false,
    },
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  cache: {
    enable: false, // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
  },
  mini: {
    postcss: {
      cssModules: {
        enable: true,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
    sassLoaderOption: {
      sassOptions: {
        silenceDeprecations: ['import'],
      },
    },
    webpackChain(chain) {
      chain.plugin('unplugin-vue-components').use(Components({
        resolvers: [NutUIResolver({ taro: true, importStyle: 'css' })],
        dts: 'src/types/components.d.ts',
      }))

      // 小程序端排除 file-viewer（依赖浏览器 API，仅 H5 使用）
      chain.plugin('ignore-file-viewer').use(IgnorePlugin, [{
        resourceRegExp: /@file-viewer/,
      }])

      // 开发模式下通过 TerserPlugin 压缩 JS，解决包体积过大无法预览的问题
      if (mode !== 'production') {
        chain.optimization.minimize(true)
        chain.optimization.minimizer('terser').use(TerserPlugin, [{
          terserOptions: {
            compress: true,
            keep_classnames: true,
            keep_fnames: true,
          },
        }])
      }
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true,
    },
  },
  h5: {
    postcss: {
      cssModules: {
        enable: true,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
    sassLoaderOption: {
      sassOptions: {
        silenceDeprecations: ['import'],
      },
    },
    webpackChain(chain) {
      chain.plugin('unplugin-vue-components').use(Components({
        resolvers: [NutUIResolver({ taro: true, importStyle: 'css' })],
        dts: 'src/types/components.d.ts',
      }))
      // file-viewer worker/wasm/字体资产（仅开发模式；生产由独立 file-viewer 服务承接，见 .env）
      if (mode !== 'production') {
        chain.plugin('copy-file-viewer-assets').use(CopyWebpackPlugin, [{
          patterns: [
            { from: 'node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/build/pdf.worker.mjs', to: 'static/vendor/pdf/pdf.worker.mjs', noErrorOnMissing: true },
            { from: 'node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/wasm/*.wasm', to: 'static/vendor/pdf/wasm/[name][ext]', noErrorOnMissing: true },
            { from: 'node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/cmaps/*', to: 'static/vendor/pdf/cmaps/[name][ext]', noErrorOnMissing: true },
            { from: 'node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/standard_fonts/*', to: 'static/vendor/pdf/standard_fonts/[name][ext]', noErrorOnMissing: true },
            { from: 'node_modules/.pnpm/@file-viewer+docx@*/node_modules/@file-viewer/docx/dist/docx-preview.worker.js', to: 'static/vendor/docx/docx.worker.js', noErrorOnMissing: true },
            { from: 'node_modules/.pnpm/@file-viewer+docx@*/node_modules/@file-viewer/docx/dist/jszip.min.js', to: 'static/vendor/docx/jszip.min.js', noErrorOnMissing: true },
            { from: 'node_modules/.pnpm/@file-viewer+pptx@*/node_modules/@file-viewer/pptx/dist/worker/pptx.worker.js', to: 'static/vendor/pptx/pptx.worker.js', noErrorOnMissing: true },
            { from: 'node_modules/.pnpm/@file-viewer+renderer-spreadsheet@*/node_modules/@file-viewer/renderer-spreadsheet/dist/spreadsheet/worker/sheetjs/sheet.worker.js', to: 'static/vendor/xlsx/sheet.worker.js', noErrorOnMissing: true },
          ],
        }])
      }
      // Taro 默认 minifier（SWC）会破坏 JS 私有字段（class 私有方法 #x 被错转为 #"x"），
      // 导致 PDF renderer chunk 语法非法、加载失败。强制改用 terser + 关闭 mangle。
      chain.optimization.minimizers.clear()
      chain.optimization.minimizer('terser').use(TerserPlugin, [{
        terserOptions: {
          compress: true,
          mangle: false,
          keep_classnames: true,
          keep_fnames: true,
        },
      }])

      // Taro H5 默认 splitChunks.chunks 为 'initial'，异步页面 chunk 不参与公共模块提取，
      // 导致 NutUI / OpenLayers 等被整份复制进每个页面 chunk（约 20 个 300KB+ 的重复 chunk）。
      // 改为 'all' 让共享模块提取到公共 chunk，按需加载且只加载一次。
      chain.optimization.splitChunks({
        chunks: 'all',
        maxInitialRequests: Infinity,
        maxAsyncRequests: Infinity,
        hidePathInfo: true,
        minSize: 0,
        cacheGroups: {
          default: false,
          taro: {
            name: 'taro',
            test: /[\\/]node_modules[\\/]@tarojs[\\/]/,
            priority: 100,
          },
          vendors: {
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            minChunks: 2,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 1,
          },
        },
      })
    },
    publicPath: `/${envVars.TARO_APP_H5_BASENAME || 'app'}/`,
    staticDirectory: 'static',
    router: {
      mode: 'browser',
      basename: `/${envVars.TARO_APP_H5_BASENAME || 'app'}`,
    },
    devServer: {
      port: Number(process.env.DEV_PORT) || 5097,
      host: '0.0.0.0',
    },
  },
})
