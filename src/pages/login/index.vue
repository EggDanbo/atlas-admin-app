<script setup lang="ts">
import Taro from '@tarojs/taro'
import { computed, onMounted, ref } from 'vue'
import { SpSliderCaptcha } from '@/components/SpSliderCaptcha'
import { SpToast } from '@/components/SpToast'
import { PASSWORD_LOGIN } from '@/constants/auth'
import { useAppInfoStore } from '@/stores/appinfo'
import { useAuthStore } from '@/stores/auth'
import { isWeapp } from '@/utils/platform'
import PasswordLogin from './components/PasswordLogin.vue'
import SmsLogin from './components/SmsLogin.vue'
import styles from './index.module.scss'

const authStore = useAuthStore()
const appInfoStore = useAppInfoStore()
// appInfo 是异步加载的，必须用 computed 保持响应，否则页脚会一直显示兜底版本号
const logincaptcha = computed(() => appInfoStore.logincaptcha)
const appname = computed(() => appInfoStore.appname || 'Atlas 工作台')
const version = computed(() => {
  const raw = String(appInfoStore.version || '1.0.0001')
  return /^v/i.test(raw) ? raw : `v${raw}`
})

const formError = ref('')
const loading = ref(false)
const captchaRef = ref<InstanceType<typeof SpSliderCaptcha>>()

// 滑块验证函数，传递给 PasswordLogin
function captchaVerify() {
  return captchaRef.value!.verify()
}

// 是否显示各登录方式
const showPhoneLogin = computed(() => isWeapp())
const showSmsLogin = computed(() => !!authStore.key)
// 演示环境没有真实微信 OAuth：微信 / 企业微信里也保留账号密码登录，
// 否则从微信打开只能看到一句提示，进不去也退不出来
const showPasswordLogin = computed(() => PASSWORD_LOGIN && !isWeapp())
const showWechatOnlyTip = computed(() => !isWeapp() && !PASSWORD_LOGIN)

// 前置检查：等待 appInfo 和 key 都加载完毕
const appInfoReady = ref(false)
onMounted(async () => {
  await Promise.all([
    appInfoStore.asyncAppInfo(),
    authStore.ensureKey(),
  ])
  appInfoReady.value = true
})

// ==================== 事件处理 ====================

function handleError(msg: string) {
  formError.value = msg
}

function handleLoadingChange(val: boolean) {
  loading.value = val
}

async function handleGetPhoneNumber(e: any) {
  const phoneCode = e.detail?.code
  if (!phoneCode) {
    formError.value = '获取手机号授权失败'
    return
  }

  try {
    const { code: loginCode } = await Taro.login()
    loading.value = true
    const { isSuccess, message } = await authStore.login({
      type: 'phone',
      phoneCode,
      loginCode,
    })
    if (!isSuccess)
      formError.value = message || '登录失败'
  }
  catch {
    formError.value = '登录失败'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <view :class="styles['login-page']">
    <!-- 装饰层 -->
    <view :class="styles['login-deco']">
      <view :class="[styles['login-deco__circle'], styles['login-deco__circle--a']]" />
      <view :class="[styles['login-deco__circle'], styles['login-deco__circle--b']]" />
      <view :class="[styles['login-deco__dot'], styles['login-deco__dot--1']]" />
      <view :class="[styles['login-deco__dot'], styles['login-deco__dot--2']]" />
      <view :class="[styles['login-deco__dot'], styles['login-deco__dot--3']]" />
    </view>

    <!-- 头部 -->
    <view :class="styles['login-header']">
      <view :class="styles['login-logo']">
        <view :class="styles['login-logo-mark']">
          <text :class="[styles['login-logo-bar'], styles['login-logo-bar--1']]" />
          <text :class="[styles['login-logo-bar'], styles['login-logo-bar--2']]" />
          <text :class="[styles['login-logo-bar'], styles['login-logo-bar--3']]" />
        </view>
      </view>
      <text :class="styles['login-title']">
        {{ appname }}
      </text>
      <text :class="styles['login-sub']">
        一体化管理系统 · 移动端
      </text>
    </view>

    <!-- 非微信环境提示 -->
    <view v-if="showWechatOnlyTip" :class="styles['login-card']">
      <text :class="styles['login-card__tip']">
        请在微信中打开
      </text>
    </view>

    <!-- 登录表单（等待 appInfo 加载完毕，确保 logincaptcha 值准确） -->
    <view v-else-if="appInfoReady" :class="styles['login-card']">
      <text v-if="formError" :class="styles['login-card__error']">
        {{ formError }}
      </text>

      <!-- 微信手机号一键登录（仅小程序） -->
      <template v-if="showPhoneLogin">
        <nut-button
          block
          open-type="getPhoneNumber"
          :loading="loading"
          :class="styles['login-card__btn']"
          @getphonenumber="handleGetPhoneNumber"
        >
          微信手机号快捷登录
        </nut-button>
        <view :class="styles['login-divider']">
          <text :class="styles['login-divider__text']">
            其他登录方式
          </text>
        </view>
      </template>

      <!-- 短信验证码登录 -->
      <SmsLogin
        v-if="showSmsLogin"
        :loading="loading"
        @error="handleError"
        @loading-change="handleLoadingChange"
      />

      <!-- 密码登录 -->
      <template v-if="showPasswordLogin">
        <view v-if="showSmsLogin" :class="styles['login-divider']">
          <text :class="styles['login-divider__text']">
            或
          </text>
        </view>
        <PasswordLogin
          :loading="loading"
          :logincaptcha="logincaptcha"
          :captcha-verify="captchaVerify"
          @error="handleError"
          @loading-change="handleLoadingChange"
        />
      </template>
    </view>

    <view :class="styles['login-demo']">
      <text :class="styles['login-demo__title']">
        演示环境
      </text>
      <text :class="styles['login-demo__text']">
        账号 demo · 密码 123456（任意密码均可登录）
      </text>
    </view>

    <view :class="styles['login-foot']">
      <text :class="styles['login-foot__ver']">
        {{ appname }} · {{ version }}
      </text>
    </view>

    <!-- 滑块验证（根层级，避免被 login-card 层叠上下文影响） -->
    <SpSliderCaptcha v-if="logincaptcha" ref="captchaRef" />
    <SpToast />
  </view>
</template>
