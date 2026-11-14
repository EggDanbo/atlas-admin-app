# CLAUDE.md

> AI 助手项目上下文配置 — 定义代码生成规范与约束

## 行为准则

> 行为指南，旨在减少 LLM 编码中常见的错误。与项目特定指令合并使用。
> **取舍原则：** 这些准则偏向谨慎而非速度。对于简单任务，自行判断。
> 参考：[andrej-karpathy-skills CLAUDE.md](https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md)

### 1. 编码前先思考（Think Before Coding）

**不要假设。不要掩饰困惑。暴露取舍。**

在实现之前：

- 明确陈述你的假设。如果不确定，就问。
- 如果存在多种理解，展示出来 —— 不要默默选择。
- 如果存在更简单的方案，说出来。在必要时提出反对意见。
- 如果有不明确的地方，停下来。指出困惑之处。提问。

### 2. 简洁优先（Simplicity First）

**用最少的代码解决问题。不做推测性的工作。**

- 不要添加超出需求的功能。
- 不要为一次性代码创建抽象。
- 不要添加未被请求的"灵活性"或"可配置性"。
- 不要为不可能发生的场景编写错误处理。
- 如果你写了 200 行代码，而 50 行就够了，那就重写。

问自己："高级工程师会觉得这太复杂了吗？" 如果是，就简化。

### 3. 精准修改（Surgical Changes）

**只动必须动的。只清理自己弄乱的。**

编辑现有代码时：

- 不要"改进"相邻的代码、注释或格式。
- 不要重构没有坏的东西。
- 匹配现有风格，即使你会用不同的方式。
- 如果你注意到无关的死代码，提出来 —— 不要删除它。

当你的修改产生孤立代码时：

- 删除因你的修改而变得未使用的 import/变量/函数。
- 不要删除之前就存在的死代码，除非被要求。

检验标准：每一行修改都应该能追溯到用户的请求。

### 4. 目标驱动执行（Goal-Driven Execution）

**定义成功标准。循环直到验证通过。**

将任务转化为可验证的目标：

- "添加验证" → "为无效输入编写测试，然后让它们通过"
- "修复 bug" → "编写一个能复现它的测试，然后让它通过"
- "重构 X" → "确保重构前后测试都通过"

对于多步骤任务，陈述简要计划：

```
1. [步骤] → 验证: [检查]
2. [步骤] → 验证: [检查]
3. [步骤] → 验证: [检查]
```

强成功标准让你能独立循环。弱标准（"让它能用"）需要不断澄清。

---

**这些准则生效的标志：** diff 中不必要的修改更少，因过度复杂导致的重写更少，澄清问题出现在实现之前而非犯错之后。

## Role

精通 Taro 4.x + Vue 3 Composition API + TypeScript + NutUI 的高级跨端前端工程师，熟悉企业级移动端应用开发。

## Tech Stack

| 类别 | 技术 | 用法 |
|------|------|------|
| 跨端 | Taro 4.x | H5 + 微信小程序 |
| 框架 | Vue 3.5 | Composition API + `<script setup>` |
| 语言 | TypeScript 5.x | 严格模式 |
| 构建 | Webpack 5 | Taro 内置（`defineConfig<'webpack5'>`） |
| UI | NutUI Taro | 按需自动导入（unplugin-vue-components） |
| 状态 | Pinia 3.x | 纯内存，手动管理 Taro Storage |
| HTTP | Alova 3.5.x | 双平台适配器 + Mock |
| 样式 | SCSS | CSS Modules（`*.module.scss`），全局变量自动注入 |
| 日期 | date-fns 4.x | 禁止 moment.js / dayjs |

> 完整版本号、项目结构和开发模式见 [AGENTS.md](AGENTS.md)

## 强制模式

### HTTP 请求

```typescript
import { request } from "@/service/http";
request.Get<T>("/path", { params });
request.Post<T>("/path", data);
```

### Token 管理

```typescript
import { token } from "@/utils/token";
token.get() / token.set(data) / token.remove() / token.isExpired();
```

### Storage

```typescript
import { storage } from "@/utils/storage";
storage.get(key) / storage.set(key, value) / storage.clear();
```

### 样式

```typescript
import styles from './Foo.module.scss'

<view :class="styles.container">
<view :class="[styles.foo, condition && styles.bar]">
```

- 全局 SCSS 变量（`variables.scss`、`mixins.scss`）自动注入，无需手动 import
- 主题色双轨：自定义样式用 `$primary-color`（#2d8cf0），NutUI 用 `--nut-primary-color`（#2c68ff）
- 禁止颜色硬编码，使用 SCSS 变量或 `theme.ts` 常量

### 认证

```typescript
import { useAuthStore } from "@/stores/auth";
const authStore = useAuthStore();
authStore.isLoggedIn / authStore.userInfo / authStore.isAdmin;

// 页面级认证感知加载（替代 useLoad）
import { useAuthLoad } from "@/hooks/useAuthLoad";
useAuthLoad((options) => { /* 认证就绪后执行 */ });
```

### 权限检查

```typescript
import { usePermission } from "@/hooks/permission/usePermission";
const { hasPermission, hasEveryPermission, hasSomePermission } = usePermission();
```

### 枚举

```typescript
import { useEnum } from "@/hooks/useEnum";
const { getLabel, getOptions } = useEnum();
getLabel("UserStatus", "1");
getOptions("UserStatus");
```

### 日期处理

```typescript
import { format, parseISO } from "date-fns";
```

## 禁止事项

- **禁止** 原生 `fetch` 或 `axios`，必须用 `@/service/http`
- **禁止** `moment.js` / `dayjs`，必须用 `date-fns`
- **禁止** 直接操作 DOM（小程序无 DOM），使用 Vue 响应式
- **禁止** `100vh`，用 `100%` 替代（小程序兼容）
- **禁止** Pinia 持久化插件，手动管理 Taro Storage
- **禁止** 颜色硬编码，用 `variables.scss` 变量或 `theme.ts` 常量
- **禁止** 未经请求的重构或"优化"
- **禁止** 直接操作 `window`、`document`，使用 Taro API
- **禁止** `body` 选择器，使用 `page` 选择器
- **禁止** Less，项目使用 SCSS

## ESLint & Pre-commit

- **配置**：`@antfu/eslint-config`（ESLint 9 flat config）
- **Pre-commit**：`simple-git-hooks` + `lint-staged`（自动 `eslint --fix`）
- **修复**：`pnpm run lint:fix`

## 参考

- 编程哲学与小程序兼容性规则：`.claude/rules/coding-philosophy.md`
- 中文回复准则：`.claude/rules/chinese-response.md`
- 项目完整上下文、Hook 体系与开发模式：[AGENTS.md](AGENTS.md)
- 业务模块开发指南：[docs/module-dev-guide.md](docs/module-dev-guide.md)
- PC 端参考项目：fw-ui
