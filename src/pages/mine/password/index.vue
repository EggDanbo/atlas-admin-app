<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import { profile as api } from '@/service/api/identity'
import { useAuthStore } from '@/stores/auth'
import { safeBack } from '@/utils/auth'
import styles from './index.module.scss'

const authStore = useAuthStore()

const form = reactive({
  oldpassword: '',
  newpassword: '',
  confirm: '',
})

const errors = reactive<Record<string, string>>({})
const visible = reactive({ old: false, next: false, confirm: false })
const loading = ref(false)

const accountText = computed(() => authStore.userInfo?.code || 'demo')

/** 密码强度：长度 + 字符种类，1~3 段对应 弱 / 中 / 强 */
const strength = computed(() => {
  const value = form.newpassword
  if (!value)
    return { level: 0, label: '', color: '' }
  const score = [
    value.length >= 6,
    /[a-z]/i.test(value) && /\d/.test(value),
    value.length >= 10,
  ].filter(Boolean).length || 1
  const level = Math.min(3, score)
  return {
    level,
    label: ['弱', '中', '强'][level - 1],
    color: ['#f43f5e', '#f59e0b', '#0d9488'][level - 1],
  }
})

/** 密码要求实时勾选 */
const rules = computed(() => {
  const value = form.newpassword
  return [
    { key: 'length', text: '至少 6 个字符', ok: value.length >= 6 },
    { key: 'mix', text: '同时包含字母与数字', ok: /[a-z]/i.test(value) && /\d/.test(value) },
    { key: 'diff', text: '与手机号、工号不重复', ok: !!value && ![authStore.userInfo?.mobile_number, authStore.userInfo?.wkno].includes(value) },
  ]
})

const matched = computed(() => !!form.confirm && form.confirm === form.newpassword)

function clearError(key: string) {
  if (errors[key])
    delete errors[key]
}

function validate() {
  for (const key of Object.keys(errors))
    delete errors[key]

  if (!form.oldpassword)
    errors.oldpassword = '请输入旧密码'
  if (!form.newpassword)
    errors.newpassword = '请输入新密码'
  else if (form.newpassword.length < 6)
    errors.newpassword = '新密码不能少于 6 位'
  else if (form.newpassword === form.oldpassword)
    errors.newpassword = '新密码不能与旧密码相同'
  if (!form.confirm)
    errors.confirm = '请再次输入新密码'
  else if (form.confirm !== form.newpassword)
    errors.confirm = '两次输入的密码不一致'

  const first = Object.values(errors)[0]
  if (first)
    showToast(first)
  return !first
}

async function handleSubmit() {
  if (loading.value || !validate())
    return

  loading.value = true
  try {
    const { isSuccess, message } = await api.changePassword({
      oldpassword: form.oldpassword,
      newpassword: form.newpassword,
    })
    if (!isSuccess) {
      showToast(message || '修改失败，请稍后重试')
      return
    }

    showToast('密码修改成功')
    form.oldpassword = ''
    form.newpassword = ''
    form.confirm = ''
    setTimeout(safeBack, 700)
  }
  catch {
    showToast('修改失败，请稍后重试')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page sp-page--with-bar" :class="styles.page">
      <PageNavbar title="修改密码" />
      <Watermark />

      <!-- 安全提示卡 -->
      <view :class="styles.hero">
        <view :class="styles['hero-glow']" />
        <view :class="styles['hero-icon']">
          <view :class="styles['lock-shackle']" />
          <view :class="styles['lock-body']" />
        </view>
        <view :class="styles['hero-info']">
          <text :class="styles['hero-title']">
            账号安全
          </text>
          <text :class="styles['hero-meta']">
            当前账号 {{ accountText }} · 建议每 3 个月更换一次密码
          </text>
        </view>
      </view>

      <!-- 修改密码 -->
      <SpCard title="修改密码" hint="修改后立即生效">
        <SpFormRow label="旧密码" required :error="errors.oldpassword">
          <input
            v-model="form.oldpassword"
            class="sp-form-input"
            :password="!visible.old"
            placeholder="请输入当前密码"
            placeholder-class="sp-form-placeholder"
            maxlength="32"
            @input="clearError('oldpassword')"
          >
          <text class="sp-form-eye" @click="visible.old = !visible.old">
            {{ visible.old ? '隐藏' : '显示' }}
          </text>
        </SpFormRow>

        <SpFormRow label="新密码" required>
          <input
            v-model="form.newpassword"
            class="sp-form-input"
            :password="!visible.next"
            placeholder="请输入新密码"
            placeholder-class="sp-form-placeholder"
            maxlength="32"
            @input="clearError('newpassword')"
          >
          <text class="sp-form-eye" @click="visible.next = !visible.next">
            {{ visible.next ? '隐藏' : '显示' }}
          </text>
        </SpFormRow>

        <!-- 强度：有输入才出现，避免空条看起来像「很弱」 -->
        <view v-if="form.newpassword" :class="styles.strength">
          <view :class="styles['strength-bars']">
            <view
              v-for="index in 3"
              :key="index"
              :class="[styles['strength-bar'], { [styles['strength-bar--on']]: strength.level >= index }]"
              :style="strength.level >= index ? { backgroundColor: strength.color } : {}"
            />
          </view>
          <text :class="styles['strength-label']" :style="{ color: strength.color }">
            {{ strength.label }}
          </text>
        </view>
        <view v-if="errors.newpassword" class="sp-form-error">
          {{ errors.newpassword }}
        </view>

        <SpFormRow
          label="确认密码"
          required
          :error="errors.confirm"
          :success="matched ? '两次输入一致' : ''"
        >
          <input
            v-model="form.confirm"
            class="sp-form-input"
            :password="!visible.confirm"
            placeholder="请再次输入新密码"
            placeholder-class="sp-form-placeholder"
            maxlength="32"
            @input="clearError('confirm')"
          >
          <text class="sp-form-eye" @click="visible.confirm = !visible.confirm">
            {{ visible.confirm ? '隐藏' : '显示' }}
          </text>
        </SpFormRow>
      </SpCard>

      <!-- 密码要求 -->
      <SpCard title="密码要求" hint="满足项会自动勾选">
        <view :class="styles.rules">
          <view v-for="item in rules" :key="item.key" :class="styles.rule">
            <view :class="[styles['rule-dot'], { [styles['rule-dot--ok']]: item.ok }]">
              <text v-if="item.ok" :class="styles['rule-check']">
                ✓
              </text>
            </view>
            <text :class="[styles['rule-text'], { [styles['rule-text--ok']]: item.ok }]">
              {{ item.text }}
            </text>
          </view>
        </view>
      </SpCard>

      <view :class="styles.notice">
        如忘记当前密码，请联系管理员重置；管理员账号的密码由后台统一维护。
      </view>

      <!-- 底部操作栏 -->
      <view class="sp-bottom-bar">
        <view class="sp-bottom-bar-inner">
          <nut-button
            type="primary"
            style="flex: 1;"
            :loading="loading"
            @click="handleSubmit"
          >
            确认修改
          </nut-button>
        </view>
      </view>
    </view>
  </AuthLayout>
</template>
