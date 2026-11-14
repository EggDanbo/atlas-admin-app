<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import wechatAuth from '@/service/api/identity/wechat'
import wechatWorkAuth from '@/service/api/identity/wechatwork'
import { useAuthStore } from '@/stores/auth'
import { isH5Wecom, isWeapp } from '@/utils/platform'
import styles from './SmsLogin.module.scss'

defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  'error': [msg: string]
  'loading-change': [val: boolean]
}>()

const authStore = useAuthStore()

const smsForm = reactive({
  mobile: '',
  code: '',
})
const smsCountdown = ref(0)
const smsSending = ref(false)
let smsTimer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (smsTimer) {
    clearInterval(smsTimer)
    smsTimer = null
  }
})

async function sendSmsCode() {
  if (!smsForm.mobile) {
    emit('error', '请输入手机号')
    return
  }
  if (!authStore.key) {
    emit('error', '获取身份信息失败，请返回重试')
    return
  }

  emit('error', '')
  const api = isWeapp()
    ? authStore.key ? wechatAuth.sendAppVerifyCode : null
    : isH5Wecom()
      ? wechatWorkAuth.sendVerifyCode
      : wechatAuth.sendVerifyCode

  if (!api)
    return

  smsSending.value = true
  try {
    const { isSuccess, message } = await api({ key: authStore.key, mobile: smsForm.mobile })
    if (isSuccess) {
      smsCountdown.value = 60
      smsTimer = setInterval(() => {
        smsCountdown.value--
        if (smsCountdown.value <= 0) {
          clearInterval(smsTimer!)
          smsTimer = null
        }
      }, 1000)
    }
    else {
      emit('error', message || '发送验证码失败')
    }
  }
  finally {
    smsSending.value = false
  }
}

async function handleSmsLogin() {
  if (!smsForm.mobile || !smsForm.code) {
    emit('error', '请输入手机号和验证码')
    return
  }
  emit('error', '')
  emit('loading-change', true)
  try {
    const { isSuccess, message } = await authStore.login({
      type: 'sms',
      mobile: smsForm.mobile,
      verifyCode: smsForm.code,
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
  <view :class="styles['sms-login']">
    <view :class="styles['sms-field']">
      <nut-input
        v-model="smsForm.mobile"
        placeholder="请输入手机号"
        type="number"
        maxlength="11"
        clearable
      />
    </view>
    <view :class="styles['sms-field']">
      <nut-input
        v-model="smsForm.code"
        placeholder="请输入验证码"
        type="number"
        maxlength="6"
      >
        <template #right>
          <view
            :class="[styles['sms-send'], (smsCountdown > 0 || smsSending) && styles['sms-send--disabled']]"
            @tap="smsCountdown <= 0 && !smsSending && sendSmsCode()"
          >
            {{ smsCountdown > 0 ? `${smsCountdown}s` : smsSending ? '发送中...' : '获取验证码' }}
          </view>
        </template>
      </nut-input>
    </view>

    <nut-button
      block
      :loading="loading"
      :class="styles['sms-btn']"
      @click="handleSmsLogin"
    >
      验证码登录
    </nut-button>
  </view>
</template>
