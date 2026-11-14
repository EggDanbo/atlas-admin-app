<script setup lang="ts">
import type { ContactGroup, ContactMember } from '@/service/api/contact'
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import contactApi from '@/service/api/contact'
import styles from './index.module.scss'

const groups = ref<ContactGroup[]>([])
const keyword = ref('')
const loading = ref(true)

async function load() {
  loading.value = true
  const { isSuccess, data } = await contactApi.list()
  if (isSuccess && data)
    groups.value = data
  loading.value = false
}

useDidShow(() => void load())

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw)
    return groups.value
  return groups.value
    .map(group => ({
      ...group,
      members: group.members.filter(m => m.name.includes(kw) || m.role.includes(kw)),
    }))
    .filter(group => group.members.length > 0)
})

const total = computed(() => groups.value.reduce((sum, g) => sum + g.members.length, 0))

function initial(name: string) {
  return name.charAt(0)
}

function openMember(member: ContactMember) {
  Taro.showModal({
    title: member.name,
    content: `${member.role}\n电话：${member.phone}\n邮箱：${member.email}`,
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
      <PageNavbar title="通讯录" />

      <SpSearchBar v-model="keyword" placeholder="搜索姓名或职位" />

      <view :class="styles.hint">
        共 {{ total }} 位同事 · 点击卡片查看联系方式
      </view>

      <view v-if="loading" :class="styles.tip">
        加载中…
      </view>
      <SpEmpty v-else-if="!filtered.length" description="没有匹配的同事" />

      <template v-else>
        <view v-for="group in filtered" :key="group.id" :class="styles.group">
          <view :class="styles['group-title']">
            {{ group.name }}
            <text :class="styles['group-count']">
              {{ group.members.length }}
            </text>
          </view>
          <view :class="styles.card">
            <view
              v-for="(member, index) in group.members"
              :key="member.id"
              :class="[styles.member, index === group.members.length - 1 ? styles['member--last'] : '']"
              @click="openMember(member)"
            >
              <view :class="styles.avatar">
                {{ initial(member.name) }}
              </view>
              <view :class="styles['member-main']">
                <text :class="styles['member-name']">
                  {{ member.name }}
                </text>
                <text :class="styles['member-role']">
                  {{ member.role }}
                </text>
              </view>
              <view :class="styles.call">
                联系
              </view>
            </view>
          </view>
        </view>
      </template>
    </view>
  </AuthLayout>
</template>
