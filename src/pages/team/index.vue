<script setup lang="ts">
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import { user as organUser } from '@/service/api/organ'
import styles from './index.module.scss'

const members = ref<Recordable[]>([])
const keyword = ref('')
const loading = ref(true)

async function load() {
  loading.value = true
  const { isSuccess, data } = await organUser.search({ page: 1, pagesize: 50 })
  if (isSuccess && data)
    members.value = data.list || []
  loading.value = false
}

useDidShow(() => void load())

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw)
    return members.value
  return members.value.filter(m =>
    `${m.name}${m.position}${m.team_name}${m.code}`.includes(kw),
  )
})

const activeCount = computed(() => members.value.filter(m => m.stoped !== 1).length)

function isDisabled(member: Recordable) {
  return member.stoped === 1
}

function initial(name: string) {
  return (name || '·').charAt(0)
}

function openMember(member: Recordable) {
  Taro.showModal({
    title: member.name,
    content: [
      `${member.team_name} · ${member.room_name}`,
      `职位：${member.position}`,
      `工号：${member.code}`,
      `手机：${member.mobile}`,
    ].join('\n'),
    confirmText: '呼叫',
    cancelText: '关闭',
  }).then((res) => {
    if (res.confirm)
      showToast(`正在呼叫 ${member.name}`)
  })
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="成员管理" />

      <SpSearchBar v-model="keyword" placeholder="搜索姓名、职位或工号" />

      <view :class="styles.summary">
        <text :class="styles['summary-main']">
          共 {{ members.length }} 人
        </text>
        <text :class="styles['summary-sub']">
          在职 {{ activeCount }} · 停用 {{ members.length - activeCount }}
        </text>
      </view>

      <view :class="styles.card">
        <view v-if="loading" :class="styles.tip">
          加载中…
        </view>
        <SpEmpty v-else-if="!filtered.length" description="没有匹配的成员" />
        <template v-else>
          <view
            v-for="member in filtered"
            :key="member.user_id"
            :class="styles.row"
            @click="openMember(member)"
          >
            <view :class="[styles.avatar, isDisabled(member) && styles['avatar--off']]">
              <text>{{ initial(member.name) }}</text>
            </view>
            <view :class="styles['row-main']">
              <view :class="styles['row-head']">
                <text :class="[styles.name, isDisabled(member) && styles['name--off']]">
                  {{ member.name }}
                </text>
                <text :class="[styles.tag, isDisabled(member) ? styles['tag--off'] : styles['tag--on']]">
                  {{ isDisabled(member) ? '已停用' : '在职' }}
                </text>
              </view>
              <text :class="styles.meta">
                {{ member.team_name }} · {{ member.position }}
              </text>
            </view>
            <text :class="styles.code">
              {{ member.code }}
            </text>
          </view>
        </template>
      </view>

      <view class="sp-footnote">
        <text class="sp-footnote-text">
          点击成员查看工号与联系方式 · 仅用于演示
        </text>
      </view>
    </view>
  </AuthLayout>
</template>
