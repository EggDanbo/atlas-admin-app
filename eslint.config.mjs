import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'dist/**',
    '.swc/**',
    '**/*.md',
    'src/mock/schema.generated.ts',
  ],
  isInEditor: false,
  stylistic: {
    indent: 2,
    quotes: 'single',
  },
  vue: {
    overrides: {
      // script -> template -> style
      'vue/block-order': [
        'error',
        {
          order: ['script', 'template', 'style'],
        },
      ],
      'vue/one-component-per-file': 'off',
      'vue/custom-event-name-casing': 'off',
    },
  },
  typescript: true,
  jsonc: true,
  formatters: {
    css: true,
    html: true,
  },
  rules: {
    'dot-notation': 'off',
    'no-console': 'off',
    'no-useless-call': 'off',
    'perfectionist/sort-exports': 'off',
    'vue/operator-linebreak': 'off',
    'max-lines': 'off',
    'max-lines-per-function': 'off',
    'max-statements': 'off',
    'node/prefer-global/process': 'off',
    'ts/no-require-imports': 'off',
    'vue/block-lang': ['error', {
      script: {
        lang: 'ts',
      },
    }],
  },
}, {
  // 这些文件里的 50PX 是刻意保留的物理像素（跳过 px→rem），Prettier 会改成小写
  files: ['src/app.scss', 'src/styles/common/_layout.scss'],
  rules: {
    'format/prettier': 'off',
  },
})
