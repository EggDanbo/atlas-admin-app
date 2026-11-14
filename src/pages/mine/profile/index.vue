<script setup lang="ts">
import { Check, Right } from '@nutui/icons-vue-taro'
import Taro from '@tarojs/taro'
import { computed, reactive, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { useFileUpload } from '@/components/FileUpload/src/useFileUpload'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import { appConfig } from '@/constants/config'
import { useAuthLoad } from '@/hooks/useAuthLoad'
import { profile as api } from '@/service/api/identity'
import { team as teamApi } from '@/service/api/organ'
import { useAuthStore } from '@/stores/auth'
import { safeBack } from '@/utils/auth'
import { rules as patternRules } from '@/utils/rules'
import styles from './index.module.scss'

const authStore = useAuthStore()
const loading = ref(false)
/** 资料加载完成前禁用保存，避免加载结果覆盖用户输入 */
const ready = ref(false)
const teamTreeOptions = ref<any[]>([])
const teamVisible = ref(false)
/** 已下钻的层级，最后一项的子级即为当前列表 */
const teamPath = ref<any[]>([])
const { uploadFile } = useFileUpload()

const formData = reactive({
  team_id: '',
  team_name: '',
  name: '',
  mobile_number: '',
  id_no: '',
  wkno: '',
  code: '',
  working: true,
  user_pic: [] as FileStorage.FileResourceModel[],
})

/** 字段错误提示：行内展示，替代表单校验弹窗 */
const errors = reactive<Record<string, string>>({})

const photoUrl = computed(() => formData.user_pic[0]?.url || '')
const avatarText = computed(() => (formData.name || 'A').trim().charAt(0))

/** 头部副标题：单位 · 工号 */
const metaText = computed(() => {
  const parts = [formData.team_name, formData.wkno ? `工号 ${formData.wkno}` : ''].filter(Boolean)
  return parts.join(' · ') || '资料待完善'
})

/** 资料完整度：姓名 / 手机号 / 单位 / 身份证 / 工号 / 照片 */
const complete = computed(() => {
  const fields = [
    formData.name,
    formData.mobile_number,
    formData.team_id,
    formData.id_no,
    formData.wkno,
    formData.user_pic.length > 0 ? '1' : '',
  ]
  const filled = fields.filter(v => String(v || '').trim().length > 0).length
  return Math.round((filled / fields.length) * 100)
})

async function loadTeamTree() {
  const { isSuccess, data } = await teamApi.tree()
  if (isSuccess && data)
    teamTreeOptions.value = data
}

async function loadProfile() {
  const { isSuccess, data } = await api.info()
  if (isSuccess && data) {
    formData.team_id = data.team_id || ''
    formData.team_name = data.team_name || ''
    formData.name = data.name || ''
    formData.mobile_number = data.mobile_number || ''
    formData.id_no = data.id_no || ''
    formData.wkno = data.wkno || ''
    formData.code = data.code || ''
    formData.working = data.working ?? true

    if (data.user_pic && data.user_url) {
      formData.user_pic = [{
        id: data.user_pic,
        url: data.user_url,
        name: 'user_pic',
        image: true,
        content_type: 'image/jpeg',
        size: '',
      }]
    }
    else {
      formData.user_pic = []
    }
  }
  ready.value = true
}

/** 选择 / 更换人员照片 */
async function pickAvatar() {
  if (!ready.value || loading.value)
    return
  try {
    const res = await Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    const path = res.tempFilePaths?.[0]
    if (!path)
      return
    const size = res.tempFiles?.[0]?.size ?? 0

    // 演示环境不走真实上传，直接用本地临时路径预览
    if (appConfig.useMock) {
      formData.user_pic = [{
        id: `local-${Date.now()}`,
        url: path,
        name: '人员照片',
        image: true,
        content_type: 'image/jpeg',
        size: String(size),
      }]
      return
    }

    const file = await uploadFile(
      { path, name: 'avatar.jpg', size, type: 'image/jpeg' },
      { watermark: false, watermarkPos: 3, watermarkText: '' },
    )
    if (file)
      formData.user_pic = [file]
  }
  catch {
    // 用户取消选择或上传中断，保持原状
  }
}

function clearError(key: string) {
  if (errors[key])
    delete errors[key]
}

/** 在部门树中查找目标节点，返回从根到该节点的链路 */
function findTeamPath(nodes: any[], targetId: string, trail: any[] = []): any[] | null {
  for (const node of nodes) {
    const path = [...trail, node]
    if (String(node.value) === String(targetId))
      return path
    if (node.children?.length) {
      const found = findTeamPath(node.children, targetId, path)
      if (found)
        return found
    }
  }
  return null
}

/** 当前层级可选部门 */
const teamLevelList = computed(() => {
  const last = teamPath.value[teamPath.value.length - 1]
  return last ? (last.children || []) : teamTreeOptions.value
})

function openTeamPicker() {
  if (!ready.value || loading.value)
    return
  const path = formData.team_id ? findTeamPath(teamTreeOptions.value, formData.team_id) : null
  // 定位到当前所选部门的同级，避免每次从根节点重新找
  teamPath.value = path ? path.slice(0, -1) : []
  teamVisible.value = true
}

function drillTeam(node: any) {
  if (node.children?.length) {
    teamPath.value = [...teamPath.value, node]
    return
  }
  formData.team_id = String(node.value)
  formData.team_name = [...teamPath.value, node].map((item: any) => item.text).join('/')
  clearError('team_id')
  teamVisible.value = false
}

/** 保存前校验：返回首个错误文案 */
function validate() {
  for (const key of Object.keys(errors))
    delete errors[key]

  if (!formData.name.trim())
    errors.name = '请输入姓名'
  if (!formData.mobile_number.trim())
    errors.mobile_number = '请输入手机号码'
  else if (!patternRules.isMobileNumber.test(formData.mobile_number))
    errors.mobile_number = '手机号码格式不正确'
  if (!formData.team_id)
    errors.team_id = '请选择所属单位'
  if (formData.id_no && !/^\d{17}[\dx]$/i.test(formData.id_no.trim()))
    errors.id_no = '身份证号格式不正确'
  if (formData.code && !/^\w{3,30}$/.test(formData.code.trim()))
    errors.code = '登录账号为 3-30 位字母、数字或下划线'

  const first = Object.values(errors)[0]
  if (first)
    showToast(first)
  return !first
}

async function handleSave() {
  if (!ready.value || loading.value || !validate())
    return

  loading.value = true
  try {
    const { isSuccess, message } = await api.updateProfile({
      team_id: formData.team_id,
      team_name: formData.team_name || undefined,
      name: formData.name.trim(),
      mobile_number: formData.mobile_number.trim(),
      id_no: formData.id_no.trim() || undefined,
      wkno: formData.wkno.trim() || undefined,
      code: formData.code.trim() || undefined,
      working: formData.working,
      user_pic: formData.user_pic[0]?.id || undefined,
      user_url: formData.user_pic[0]?.url || undefined,
    })
    if (!isSuccess) {
      showToast(message || '保存失败')
      return
    }

    // 同步全局用户信息，返回「我的」后即时生效
    const { isSuccess: profileSuccess, data: profileData } = await api.get()
    if (profileSuccess && profileData)
      authStore.userInfo = { ...authStore.userInfo, ...profileData }

    showToast('资料已保存')
    setTimeout(safeBack, 600)
  }
  catch {
    showToast('保存失败，请稍后重试')
  }
  finally {
    loading.value = false
  }
}

useAuthLoad(() => {
  loadTeamTree()
  loadProfile()
})
</script>

<template>
  <AuthLayout>
    <view class="sp-page sp-page--with-bar" :class="styles.page">
      <PageNavbar title="个人信息" />
      <Watermark />

      <!-- 个人卡：照片 + 身份 + 完整度 -->
      <view :class="styles.hero">
        <view :class="styles['hero-glow']" />
        <view :class="styles['hero-glow2']" />

        <view :class="styles['hero-top']">
          <view :class="styles['avatar-wrap']" @click="pickAvatar">
            <image
              v-if="photoUrl"
              :class="styles.avatar"
              :src="photoUrl"
              mode="aspectFill"
            />
            <view v-else :class="styles['avatar-text']">
              {{ avatarText }}
            </view>
            <view :class="styles['avatar-badge']">
              ＋
            </view>
          </view>

          <view :class="styles['hero-info']">
            <view :class="styles['hero-title']">
              <text :class="styles['hero-name']">
                {{ formData.name || '未填写姓名' }}
              </text>
              <view
                :class="[
                  styles['hero-status'],
                  { [styles['hero-status--off']]: !formData.working },
                ]"
              >
                <view :class="styles['status-dot']" />
                <text>{{ formData.working ? '工作中' : '免打扰' }}</text>
              </view>
            </view>
            <text :class="styles['hero-meta']">
              {{ metaText }}
            </text>
            <text :class="styles['hero-hint']">
              点击头像更换人员照片
            </text>
          </view>
        </view>

        <view :class="styles['hero-progress']">
          <view :class="styles['progress-head']">
            <text :class="styles['progress-label']">
              资料完整度
            </text>
            <text :class="styles['progress-value']">
              {{ complete }}%
            </text>
          </view>
          <view :class="styles['progress-track']">
            <view :class="styles['progress-fill']" :style="{ width: `${complete}%` }" />
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <SpCard title="基本信息" hint="用于考勤与审批流转">
        <SpFormRow label="姓名" required :error="errors.name">
          <input
            v-model="formData.name"
            class="sp-form-input"
            placeholder="请输入姓名"
            placeholder-class="sp-form-placeholder"
            maxlength="20"
            @input="clearError('name')"
          >
        </SpFormRow>

        <SpFormRow label="手机号码" required :error="errors.mobile_number">
          <input
            v-model="formData.mobile_number"
            class="sp-form-input"
            type="number"
            placeholder="请输入手机号码"
            placeholder-class="sp-form-placeholder"
            maxlength="11"
            @input="clearError('mobile_number')"
          >
        </SpFormRow>

        <SpFormRow
          label="所属单位"
          required
          arrow
          :error="errors.team_id"
          @click="openTeamPicker"
        >
          <text class="sp-form-value" :class="[{ 'sp-form-value--placeholder': !formData.team_name }]">
            {{ formData.team_name || '请选择' }}
          </text>
        </SpFormRow>
      </SpCard>

      <!-- 其他信息 -->
      <SpCard title="其他信息" hint="选填，用于身份核验">
        <SpFormRow label="身份证号" :error="errors.id_no">
          <input
            v-model="formData.id_no"
            class="sp-form-input"
            placeholder="请输入身份证号"
            placeholder-class="sp-form-placeholder"
            maxlength="18"
            @input="clearError('id_no')"
          >
        </SpFormRow>

        <SpFormRow label="工号">
          <input
            v-model="formData.wkno"
            class="sp-form-input"
            placeholder="请输入工号"
            placeholder-class="sp-form-placeholder"
            maxlength="20"
          >
        </SpFormRow>

        <SpFormRow label="登录账号" :error="errors.code">
          <input
            v-model="formData.code"
            class="sp-form-input"
            placeholder="区分大小写"
            placeholder-class="sp-form-placeholder"
            maxlength="30"
            @input="clearError('code')"
          >
        </SpFormRow>
      </SpCard>

      <!-- 工作状态 -->
      <SpCard title="提醒设置">
        <view :class="[styles.row, styles['row--switch']]">
          <view :class="styles['row-main']">
            <text :class="styles['row-label']">
              工作状态
            </text>
            <text :class="styles['row-desc']">
              {{ formData.working ? '工作中，正常接收待办与考勤提醒' : '免打扰，暂时不再接收消息提醒' }}
            </text>
          </view>
          <nut-switch v-model="formData.working" />
        </view>
      </SpCard>

      <view :class="styles.notice">
        <text :class="styles['notice-title']">
          资料说明
        </text>
        <text :class="styles['notice-item']">
          · 姓名、手机号与所属单位会同步到考勤打卡与审批流程
        </text>
        <text :class="styles['notice-item']">
          · 人员照片仅用于工作台展示，人脸识别照片请前往「人脸采集」更新
        </text>
      </view>

      <!-- 底部操作栏 -->
      <view class="sp-bottom-bar">
        <view class="sp-bottom-bar-inner">
          <nut-button
            type="primary"
            style="flex: 1;"
            :loading="loading"
            :disabled="!ready"
            @click="handleSave"
          >
            保存修改
          </nut-button>
        </view>
      </view>

      <nut-popup
        v-model:visible="teamVisible"
        position="bottom"
        round
        :z-index="2100"
        :style="{ backgroundColor: '#fff' }"
      >
        <view :class="styles.sheet">
          <view :class="styles['sheet-head']">
            <text :class="styles['sheet-title']">
              选择所属单位
            </text>
            <text :class="styles['sheet-close']" @click="teamVisible = false">
              ✕
            </text>
          </view>

          <view :class="styles['sheet-crumb']">
            <text
              :class="[styles['crumb-item'], { [styles['crumb-item--active']]: !teamPath.length }]"
              @click="teamPath = []"
            >
              全部
            </text>
            <text
              v-for="(node, index) in teamPath"
              :key="node.value"
              :class="[styles['crumb-item'], { [styles['crumb-item--active']]: index === teamPath.length - 1 }]"
              @click="teamPath = teamPath.slice(0, index + 1)"
            >
              {{ node.text }}
            </text>
          </view>

          <view :class="styles['sheet-list']">
            <view
              v-for="node in teamLevelList"
              :key="node.value"
              :class="[styles['sheet-item'], { [styles['sheet-item--current']]: String(node.value) === formData.team_id }]"
              @click="drillTeam(node)"
            >
              <text :class="styles['sheet-item-text']">
                {{ node.text }}
              </text>
              <text v-if="node.children?.length" :class="styles['sheet-item-extra']">
                {{ node.children.length }} 个下级
              </text>
              <view :class="styles['sheet-item-arrow']">
                <Check
                  v-if="String(node.value) === formData.team_id"
                  size="16"
                  color="#4f46e5"
                />
                <Right v-else-if="node.children?.length" size="14" color="#c2c6d4" />
              </view>
            </view>
          </view>
        </view>
      </nut-popup>
    </view>
  </AuthLayout>
</template>
