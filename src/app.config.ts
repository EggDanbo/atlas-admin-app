// 内置文件预览页仅开发模式注册（本地调试用）；生产由独立 file-viewer 服务承接，
// 见 .env 的 TARO_APP_FILE_PREVIEW_BASE。不注册则页面及其依赖不进生产包。
const IS_DEV = process.env.NODE_ENV !== 'production'

export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/mine/index',
  ],
  subPackages: [
    {
      root: 'pages/login',
      pages: [
        'index',
      ],
    },
    {
      root: 'pages/oauthCallback',
      pages: [
        'index',
      ],
    },
    {
      root: 'pages/checkin',
      pages: [
        'index',
        'records',
        'stats',
      ],
    },
    {
      root: 'pages/apply',
      pages: [
        'index',
        'list',
        'leave',
        'detail',
      ],
    },
    {
      root: 'pages/contact',
      pages: [
        'index',
      ],
    },
    {
      root: 'pages/rules',
      pages: [
        'index',
        'detail',
        'edit',
      ],
    },
    {
      root: 'pages/team',
      pages: [
        'index',
      ],
    },
    {
      root: 'pages/board',
      pages: [
        'index',
      ],
    },
    {
      root: 'pages/mine/profile',
      pages: [
        'index',
      ],
    },
    {
      root: 'pages/mine/password',
      pages: [
        'index',
      ],
    },
    {
      root: 'pages/mine/face',
      pages: [
        'index',
      ],
    },
    ...(IS_DEV
      ? [{
          root: 'pages/mine/preview',
          pages: [
            'index',
          ],
        }]
      : []),
    {
      root: 'pages/user',
      pages: [
        'message/index',
      ],
    },
  ],
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f5f6fa',
    navigationBarTitleText: 'Atlas 工作台',
  },
  tabBar: {
    color: '#9aa0b4',
    selectedColor: '#4f46e5',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/images/tab/home.png',
        selectedIconPath: 'assets/images/tab/home-active.png',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/images/tab/mine.png',
        selectedIconPath: 'assets/images/tab/mine-active.png',
      },
    ],
  },
  permission: {
    'scope.userLocation': {
      desc: '需要获取您的位置以提供相关服务',
    },
  },
})
