<script setup lang="ts">
import { reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import styles from './PasswordLogin.module.scss'

const props = defineProps<{
  loading: boolean
  logincaptcha: boolean | undefined
  captchaVerify?: () => Promise<string>
}>()

const emit = defineEmits<{
  'error': [msg: string]
  'loading-change': [val: boolean]
}>()

const authStore = useAuthStore()

const passwordForm = reactive({
  username: 'demo',
  password: '123456',
})

async function handlePasswordLogin() {
  if (!passwordForm.username || !passwordForm.password) {
    emit('error', '请输入用户名和密码')
    return
  }

  // 滑块验证
  let verifyToken: string | undefined
  if (props.logincaptcha) {
    try {
      verifyToken = await props.captchaVerify?.()
    }
    catch {
      return
    }
  }

  emit('error', '')
  emit('loading-change', true)
  try {
    const { isSuccess, message } = await authStore.login({
      type: 'password',
      username: passwordForm.username,
      password: passwordForm.password,
      verifyToken,
    })
    if (!isSuccess)
      emit('error', message || '登录失败')
  }
  finally {
    emit('loading-change', false)
  }
}
</script>

<template>
  <view :class="styles['pwd-login']">
    <view :class="styles['pwd-field']">
      <nut-input
        v-model="passwordForm.username"
        placeholder="请输入用户名或手机号码"
        type="text"
        clearable
      />
    </view>
    <view :class="styles['pwd-field']">
      <nut-input
        v-model="passwordForm.password"
        type="password"
        placeholder="请输入密码"
        show-password
      />
    </view>

    <nut-button
      block
      :loading="loading"
      :class="styles['pwd-btn']"
      @click="handlePasswordLogin"
    >
      登 录
    </nut-button>
  </view>
</template>
