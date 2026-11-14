# AGENTS.md

## 项目信息

- **名称**：atlas-admin-app
- **描述**：Atlas 工作台 · 移动端演示应用（人事 / 费用 / 资产 / 档案 / 客户项目）
- **技术栈**：Taro 4.x + Vue 3 + NutUI + TypeScript + Pinia + Alova + SCSS
- **构建工具**：Webpack 5（Taro 内置）
- **目标平台**：H5 + 微信小程序
- **包管理**：pnpm，Node.js v18+

## Tech Stack

| 类别     | 技术                 | 版本      | 用法                                                    |
| -------- | -------------------- | --------- | ------------------------------------------------------- |
| 跨端     | Taro                 | 4.2.0     | H5 + 微信小程序                                         |
| 框架     | Vue                  | ^3.5.13   | Composition API + `<script setup>`                      |
| 语言     | TypeScript           | ^5.7.3    | 严格模式                                                |
| 构建     | Webpack 5            | Taro 内置 | `defineConfig<'webpack5'>`                              |
| UI       | NutUI Taro           | ^4.3.14   | 按需自动导入（unplugin-vue-components + NutUIResolver） |
| 状态     | Pinia                | ^3.0.4    | 纯内存，手动管理 Taro Storage                           |
| HTTP     | Alova                | ^3.5.1    | 自定义本地适配器（零网络请求）                          |
| 样式     | SCSS                 | —         | CSS Modules（`*.module.scss`），全局变量自动注入        |
| 日期     | date-fns             | ^4.1.0    | 禁止 moment.js / dayjs                                  |
| 加密     | crypto-js            | ^4.2.0    | AES-CBC（`utils/crypto.ts`）                            |
| 测试     | Playwright           | ^1.59.1   | E2E 测试                                                |
| 代码规范 | @antfu/eslint-config | ^8.1.1    | ESLint 9 flat config + lint-staged                      |

## Project Structure

```
src/
├── app.config.ts              # Taro 应用配置（页面路由、TabBar、subPackages）
├── app.scss                   # 全局样式（reset + NutUI CSS 变量覆盖 + 全局 utility classes）
├── app.ts                     # 应用入口（createApp + Pinia + 指令 + 全局组件）
├── index.html                 # H5 入口 HTML
├── assets/
│   └── images/                # 静态图片（TabBar 图标等）
├── styles/
│   ├── variables.scss         # 全局 SCSS 变量（主题色、间距、字号）
│   ├── mixins.scss            # SCSS mixins（ellipsis, page-base, bottom-bar）
│   ├── custom_theme.scss      # NutUI 主题变量覆盖
│   ├── reset.scss             # 样式重置
│   ├── common.scss            # 全局通用样式（布局、表单、详情等 semantic 拆分）
│   └── theme.ts               # 颜色常量（与 variables.scss 同步，JS 端使用）
├── components/                # 共享组件（barrel export 模式）
│   ├── AppProvider/           # NutUI ConfigProvider 主题配置
│   ├── AuthLayout/            # 认证布局（三态：loading/auth/guest）+ LoginPrompt
│   ├── Card/                  # 通用卡片容器
│   ├── DraftBox/              # 草稿箱
│   ├── FileUpload/            # 文件上传（含水印、预览、分片上传）
│   ├── PageNavbar/            # H5 页面导航栏
│   ├── PickerPopup/           # 选择器弹窗
│   ├── SearchFilterBar/       # 搜索 + 筛选栏
│   ├── SectionTitle/          # 区块标题
│   ├── SpBackTop/             # 回到顶部
│   ├── SpBottomBar/           # 底部操作栏
│   ├── SpCascader/            # 级联选择器（基于 NutUI Cascader）
│   ├── SpDatePicker/          # 日期选择器
│   ├── SpKvGroup/ SpKvRow/    # 键值对展示组
│   ├── SpListStatus/          # 列表状态（loading/empty/finished）
│   ├── SpPicker/              # 选择器（基于 NutUI Picker）
│   ├── SpSliderCaptcha/       # 滑块验证码
│   ├── UserSelect/            # 人员选择器（单选/多选）
│   └── Watermark/             # 水印（全局注册）
├── directives/
│   ├── index.ts               # setupDirectives() 注册入口
│   └── permission.ts          # v-permission / v-perm / v-permHide
├── setups/
│   └── globalComponent.ts     # setupGlobalComponent() — Watermark 全局注册
├── constants/
│   ├── auth.ts                # PASSWORD_LOGIN 功能开关
│   ├── config.ts              # 应用配置（从环境变量读取）
│   └── enum.ts                # HTTP 状态码（HttpStatus）、NO_ERROR_TIP_CODES
├── hooks/                     # 核心 Composable
│   ├── list/
│   │   ├── types.ts           # UseListPageOptions / UseListPageReturn
│   │   └── useListPage.ts     # 列表页 hook（服务端分页、去重、加载更多）
│   ├── detail/
│   │   ├── types.ts           # UseDetailPageOptions / UseFormPageOptions / FieldTransformConfig
│   │   ├── useDetailPage.ts   # 详情页 hook（加载、删除、刷新事件）
│   │   ├── useFormPage.ts     # 表单页 hook（新增/编辑、验证、脏检查）
│   │   └── utils.ts           # createTransformer、getNestedValue、setNestedValue
│   ├── permission/
│   │   └── usePermission.ts   # 权限检查（hasPermission / hasEvery / hasSome）
│   ├── help/
│   │   └── useFormValid.ts    # NutUI 表单校验
│   ├── useAuthLoad.ts         # 认证感知加载（替代 useLoad，等待 auth 初始化）
│   ├── useEnum.ts             # 枚举便捷访问（getLabel / getOptions）
│   ├── usePullDown.ts         # 下拉刷新（返回 pullingDown ref，修复 H5 fixed 跳动）
│   ├── useWxJSSDK.ts          # 微信 JSSDK 初始化
│   └── useWecomJSSDK.ts       # 企微 JSSDK 初始化
├── mock/                      # 本地数据引擎
│   ├── engine.ts              # 接口分派与数据生成
│   ├── schema.generated.ts    # 页面字段结构（脚本生成）
│   ├── datasets.ts            # 枚举/权限/待办/消息
│   ├── dict.ts                # 字段语义 → 值
│   ├── skeleton.ts            # 骨架数据
│   └── util.ts                # Mock 工具函数
├── pages/                     # 页面
│   ├── index/                 # 首页（TabBar）+ components/（MenuGrid, TodoList, UserCard）
│   ├── login/                 # 登录页 + components/（PasswordLogin, SmsLogin）
│   ├── oauthCallback/         # OAuth 回调页（H5 微信/企微）
│   ├── mine/                  # 我的（TabBar）
│   │   ├── profile/           # 个人资料编辑
│   │   └── password/          # 修改密码
│   ├── organ/user/            # 人员管理（index/detail/edit）— 参考实现
│   └── expense/               # 费用管理（待废弃）
├── service/
│   ├── http/                  # Alova 实例配置
│   │   ├── alova.ts           # 实例创建 + Token 自动刷新（createServerTokenAuthentication）
│   │   ├── adapter.ts         # 本地适配器（统一走 src/mock）
│   │   ├── config.ts          # 请求/Mock/错误配置
│   │   ├── helper.ts          # Token 注入、401 处理、URL 规范化、业务错误处理
│   │   └── index.ts           # 导出
│   └── api/                   # API 接口模块
│       ├── identity/          # 认证（authorize, permit, profile, sliderCaptcha, wechat, wechatwork）
│       ├── organ/             # 组织架构（user, team, room, outer）
│       ├── expense/           # 费用
│       ├── draftbox/          # 草稿箱
│       └── misc/              # 通用（common: appinfo, enums; file: 文件上传）
├── stores/
│   ├── index.ts               # Pinia 实例
│   ├── app.ts                 # 系统信息（statusBarHeight, platform 等）
│   ├── appinfo.ts             # 应用信息（appname, version, logincaptcha）
│   ├── auth.ts                # 核心认证 Store（登录态/权限/多平台认证/Token 管理）
│   └── enums.ts               # 枚举 Store（自动加载 + 选项缓存 + 反向查找）
├── types/
│   ├── global.d.ts            # 全局类型（Recordable, AppInfo, SystemEnums 等）
│   ├── service.d.ts           # 请求/响应类型（Service namespace）
│   ├── auth.d.ts              # 认证类型（Auth.Permission, UserCurrent, AccessToken 等）
│   ├── file.d.ts              # 文件上传类型
│   ├── wechat.d.ts            # 微信认证类型
│   ├── wechatwork.d.ts        # 企微认证类型
│   ├── alova.d.ts             # Alova 扩展类型
│   ├── components.d.ts        # 组件自动导入类型（unplugin 生成）
│   └── env.d.ts               # 环境变量类型
└── utils/
    ├── auth.ts                # safeBack / saveLoginRedirect / consumeLoginRedirect
    ├── crypto.ts              # AES 加解密（crypto-js CBC 模式）
    ├── date.ts                # date-fns 封装（formatDate / formatDateTime，zhCN locale）
    ├── is.ts                  # 类型守卫
    ├── link.ts                # 外部链接生成
    ├── permission.ts          # 权限树匹配（前缀 + 精确）
    ├── platform.ts            # 平台检测（weapp / h5-wechat / h5-wecom / h5-browser）
    ├── promisify.ts           # 回调转 Promise
    ├── router.ts              # 路由常量、TabBar 检测、basename 处理、getCurrentPageInfo
    ├── storage.ts             # Taro Storage 封装
    ├── token.ts               # Token 读写 + 过期检测（3 分钟缓冲）
    └── helper/
        └── treeHelper.ts      # 树操作工具（filter / forEach / findNodeAll / findPath）
```

## 核心 Hook 体系

### useListPage — 列表页

服务端分页列表的通用逻辑。配合 `usePullDownRefresh` + `useReachBottom` 使用。

```typescript
const { list, loading, finished, isEmpty, queryModel, search, loadMore } =
  useListPage({
    api: { search: (params) => api.search(params) },
    createQueryModel: () => ({ filter: undefined as string | undefined }),
    idField: "user_id",
    pageSize: 20,
    immediate: false,
  });
```

**选项**：`api.search` / `createQueryModel` / `idField`（去重键，默认 `'id'`）/ `pageSize`（默认 20）/ `immediate`（默认 true）

**返回**：`list` / `loading` / `finished` / `isEmpty` / `total` / `page` / `queryModel` / `search()` / `loadMore()` / `reload()` / `reset()`

### useDetailPage — 详情页

数据加载、删除、刷新事件订阅、可编辑判断。通过 `useAuthLoad` 自动等待认证初始化。

```typescript
const { formModel, loaded, loading, canEdit, handleDelete } = useDetailPage({
  api,
  createFormModel,
  idField: "user_id",
  refreshEvent: "organ:user:refresh",
  transform: createTransformer({
    string: ["types"],
    enum: { types: "organ_user_types" },
  }),
  canEdit: (d) => d.stoped === "0",
  deleteConfirm: "删除后无法恢复，确定要删除该人员吗？",
});
```

**选项**：`api.get` / `api.delete` / `createFormModel` / `idField`（支持嵌套如 `'role.id'`）/ `refreshEvent` / `transform` / `canEdit` / `deleteConfirm`

**返回**：`formModel` / `loaded` / `loading` / `canEdit` / `pageOptions` / `handleDelete()`

### useFormPage — 表单页（新增/编辑）

自动判断新增/编辑模式，表单验证、脏检查、取消确认。

```typescript
const { formModel, isEdit, loading, formRef, submit, handleCancel } =
  useFormPage({
    api,
    createFormModel,
    rules: { name: [{ required: true, message: "请输入姓名" }] },
    refreshEvent: "organ:user:refresh",
    transform: createTransformer({ string: ["types"] }),
    onInit() {
      loadTeamTree();
    },
    async onLoaded(data) {
      await loadRoomList(data.team_id);
    },
  });
```

**选项**：`api.get/create/update` / `createFormModel` / `rules` / `refreshEvent` / `transform` / `beforeSubmit` / `afterSave`（默认 `'back'`）/ `onInit` / `onLoaded` / `messages`

**返回**：`formModel` / `isEdit` / `loading` / `pageOptions` / `formRef` / `submit()` / `handleCancel()`

### createTransformer — 数据转换器

处理 API 响应与表单模型之间的类型转换。枚举和自定义转换结果存入 `data.transform` 字段。

```typescript
const transform = createTransformer({
  string: ["types", "gender"], // 转为字符串
  number: ["amount"], // 转为数字（null/空/'0' → null）
  nullIfZero: ["room_id"], // 0/'0' → null
  enum: { types: "organ_user_types" }, // 枚举值 → 标签 → data.transform.types
  custom: { birthday: (val) => format(val, "yyyy-MM-dd") },
});

// 模板中使用
{
  {
    formModel.transform.types;
  }
}
```

### 辅助 Hooks

| Hook                    | 用途                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| `useAuthLoad(cb)`       | 替代 `useLoad`，等待认证初始化后执行回调                                  |
| `useEnum()`             | `getLabel(key, val, matchBy?)` / `getOptions(key)` — 枚举便捷访问         |
| `usePermission()`       | `hasPermission` / `hasEveryPermission` / `hasSomePermission` — 管理员绕过 |
| `useFormValid(formRef)` | `validForm()` / `resetForm()` — NutUI 表单校验                            |
| `usePullDown(cb)`       | 下拉刷新，返回 `pullingDown` ref（修复 H5 fixed 元素跳动）                |

## 业务模块开发模式

> 详见 [docs/module-dev-guide.md](docs/module-dev-guide.md)

| 列表页                           | 详情页              | 表单页(新增/编辑)   |
| -------------------------------- | ------------------- | ------------------- |
| `useListPage`                    | `useDetailPage`     | `useFormPage`       |
| `SearchFilterBar`                | `createTransformer` | validation rules    |
| `Card`                           | `canEdit`           | dirty check         |
| `SpListStatus`                   | `handleDelete`      | cancel confirm      |
| `usePullDown` + `useReachBottom` |                     | `createTransformer` |

**关键模式**：

- API 模块提供 `search / get / create / update / delete` 方法
- `createFormModel()` 同时定义表单结构和类型（`type FormModel = ReturnType<typeof createFormModel> & Recordable`）
- `refreshEvent` 用于跨页面通信（编辑/删除后触发，列表页刷新）
- `useAuthLoad` 替代 `useLoad` 确保认证就绪
- 页面配置文件 `*.config.ts` 包含 `navigationBarTitleText` 和 `enablePullDownRefresh`

## 关键约定

### Taro 入口（app.ts）

- **必须用 `createApp()`**（不是 `defineComponent`），Taro 框架依赖此方式
- `render` 方法会被 Taro 覆盖，不需要实现
- `onLaunch` 中初始化 `appStore` / `appInfoStore` / `authStore`

### NutUI

- **按需自动导入**：`unplugin-vue-components` + `NutUIResolver`
- **主题色双轨制**：`$primary-color: #2d8cf0`（SCSS）/ `--nut-primary-color: #2c68ff`（CSS 变量）
- **designWidth**：混合方案（全局 750 + NutUI 375）
- 全局 SCSS 变量通过 `config/index.ts` 的 `sass.resource` 自动注入

### HTTP 与 API

- **单实例 Alova** + `createServerTokenAuthentication`
- **Token 自动注入**：`meta.withToken` 控制（默认 true）
- **Token 过期自动刷新**：401 或 code `42001` 触发，Promise 去重防止并发
- **本地适配器**：所有环境统一走 `src/mock`，不再发起真实网络请求
- **响应结构**：`{ code: 0, data, message }`

### CSS Modules

- **启用**：`config/index.ts` 的 `postcss.cssModules`
- **命名规则**：`[name]__[local]___[hash:base64:5]`
- 全局 SCSS 变量无需手动 import（`sass.resource` 自动注入）

### 路由与认证

- **认证架构**：`AuthLayout` 组件（三态：loading/auth/guest）+ `authStore`
- **登录页**：`/pages/login/index.vue`（密码 + 短信 + 微信手机号）
- **OAuth 回调**：`/pages/oauthCallback/index.vue`（H5 微信/企微）
- **TabBar**：首页 + 我的（原生 2 个）
- **redirect 机制**：`saveLoginRedirect` / `consumeLoginRedirect`
- **栈底安全**：`pages.length <= 1` 时用 `reLaunch` 而非 `navigateBack`
- **路由常量**：集中管理在 `utils/router.ts` 的 `routes` 对象

### H5 开发

- 服务器端需要 `BROWSER=none` 环境变量
- H5 路由支持可配置 basename（`TARO_APP_H5_BASENAME`）
- 页面生命周期用 `Taro.useLoad()` / `Taro.useShow()`

## 环境变量

| 变量                       | 说明          | 默认值  |
| -------------------------- | ------------- | ------- |
| `TARO_APP_API_URL`         | 后端 API 地址 | —       |
| `TARO_APP_API_URL_PREFIX`  | API 路径前缀  | `/api`  |
| `TARO_APP_API_AUTH_PREFIX` | 认证模块前缀  | `mis`   |
| `TARO_APP_USE_MOCK`        | 启用 Mock     | `true`  |
| `TARO_APP_PASSWORD_LOGIN`  | 启用密码登录  | `false` |
| `TARO_APP_H5_BASENAME`     | H5 子路径部署 | `app`   |
| `TARO_APP_FILE_PREVIEW_BASE` | 独立文件预览服务地址（留空=内置预览页，仅开发模式有效） | 空 |

## 注意事项

- 生产环境不出现账号密码登录
- 日期库用 date-fns（禁止 moment.js / dayjs）
- Taro 4.x + Vite 模式存在兼容问题，暂用 Webpack 5
- 环境变量通过 `TARO_APP_` 前缀注入，`config/index.ts` 手动加载 `.env` 文件
- 平台检测：`utils/platform.ts` 的 `getAuthPlatform()` 返回 `weapp / h5-wechat / h5-wecom / h5-browser`
