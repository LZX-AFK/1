<template>
  <view class="home-page">
    <view v-if="pageState === 'error'" class="error-bar" @tap="fetchHomeData">
      <text class="error-bar__icon">!</text>
      <text class="error-bar__text">{{ t('home.error') }}</text>
      <text class="error-bar__retry">{{ t('common.retry') }}</text>
    </view>
    <scroll-view v-if="pageState === 'loading'" scroll-y class="page__scroll">
      <view class="skel skel--greet" />
      <view class="skel skel--course" />
      <view class="skel skel--cta" />
      <view class="skel skel--heading" />
      <view class="skel skel--card" />
      <view class="skel skel--card" />
    </scroll-view>
    <scroll-view v-else-if="pageState === 'normal'" scroll-y class="page__scroll">
      <view class="h-greet">
        <view class="h-greet__left">
          <text class="h-greet__title">{{ greetingText }}, {{ userStore.displayName }} 👋</text>
          <text class="h-greet__sub">{{ t('home.subtitle') }}</text>
        </view>
        <view class="h-device" @tap="goToProfile">
          <text class="h-device__icon">🎧</text>
          <text class="h-device__text">{{ deviceStore.state.batteryLevel }}%</text>
        </view>
      </view>
      <view class="h-sec">
        <view class="h-sec__head">
          <text class="h-sec__icon">📅</text>
          <text class="h-sec__title">{{ t('home.todayClass') }}</text>
          <text class="h-sec__more" @tap="goToCourses">{{ t('common.viewAll') }} ›</text>
        </view>
        <template v-if="todayCourse">
          <view class="h-course" @tap="goToCourseDetail">
            <view class="h-course__accent" />
            <view class="h-course__time">
              <text class="h-course__time-h">{{ courseTimeLabel }}</text>
              <text class="h-course__time-p">{{ coursePeriodLabel }}</text>
            </view>
            <view class="h-course__sep" />
            <view class="h-course__body">
              <text class="h-course__name">{{ todayCourse.name }}</text>
              <view class="h-course__meta">
                <text class="h-course__meta-t">👤 {{ todayCourse.instructor }}</text>
                <text class="h-course__meta-t">📍 {{ todayCourse.location }}</text>
              </view>
            </view>
            <view class="h-course__badge">
              <text class="h-course__badge-t">{{ t('home.upcoming') }}</text>
            </view>
          </view>
        </template>
        <template v-else>
          <EmptyState icon="📚" :title="t('home.emptyCourse')" :description="t('home.emptyCourseDesc')" :action-text="t('home.addCourse')" compact @action="goToCourses" />
        </template>
      </view>
      <view class="h-cta" @tap="goToLive">
        <view class="h-cta__watermark" />
        <view class="h-cta__content">
          <view class="h-cta__mic"><text class="h-cta__mic-icon">🎙</text><view class="h-cta__mic-ring" /></view>
          <view class="h-cta__text">
            <text class="h-cta__title">{{ t('home.startRecording') }}</text>
            <text class="h-cta__sub">{{ t('home.recordingSubtitle') }}</text>
          </view>
          <view class="h-cta__arrow"><text class="h-cta__arrow-t">→</text></view>
        </view>
      </view>
      <view class="h-sec">
        <view class="h-sec__head">
          <text class="h-sec__icon">📝</text>
          <text class="h-sec__title">{{ t('home.recentNotes') }}</text>
          <text class="h-sec__more" @tap="goToKnowledge">{{ t('common.viewAll') }} ›</text>
        </view>
        <template v-if="recentNotes.length">
          <view v-for="note in recentNotes" :key="note.id" class="h-note" @tap="goToNoteDetail(note)">
            <view class="h-note__accent" />
            <view class="h-note__body">
              <view class="h-note__top"><text class="h-note__course">{{ note.courseName || 'Biology 101' }}</text><text class="h-note__date">{{ note.date }}</text></view>
              <text class="h-note__title">{{ note.title }}</text>
              <text class="h-note__desc">{{ note.description }}</text>
              <view v-if="note.tags && note.tags.length" class="h-note__tags">
                <text v-for="(tag, i) in note.tags.slice(0, 3)" :key="i" class="h-note__tag">{{ tag }}</text>
                <text v-if="note.tags.length > 3" class="h-note__tag h-note__tag--more">+{{ note.tags.length - 3 }}</text>
              </view>
            </view>
          </view>
        </template>
        <template v-else>
          <EmptyState icon="📝" :title="t('home.emptyNote')" :description="t('home.emptyNoteDesc')" compact />
        </template>
      </view>
      <view class="h-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/useUserStore'
import { useCourseStore } from '@/stores/useCourseStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import EmptyState from '@/components/EmptyState.vue'
import type { Course, AINote } from '@/types'

const { t } = useI18n()
const userStore = useUserStore()
const courseStore = useCourseStore()
const deviceStore = useDeviceStore()
const pageState = ref<'loading' | 'normal' | 'error'>('loading')

const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return t('home.morning')
  if (hour >= 12 && hour < 18) return t('home.afternoon')
  return t('home.evening')
})

const courseTimeLabel = computed(() => { const s = todayCourse.value?.schedule ?? ''; const m = s.match(/(\d{1,2}:\d{2})/); return m ? m[1] : '10:00' })
const coursePeriodLabel = computed(() => { const s = todayCourse.value?.schedule ?? ''; return s.includes('AM') ? t('home.am') : s.includes('PM') ? t('home.pm') : t('home.am') })

const todayCourse = computed<Course | null>(() => courseStore.courses.length ? courseStore.courses[0] : null)
const recentNotes = computed<AINote[]>(() => courseStore.aiNotes.slice(0, 2))

async function fetchHomeData() { pageState.value = 'loading'; try { await new Promise<void>(r => { setTimeout(r, 600) }); pageState.value = 'normal' } catch { pageState.value = 'error' } }
function goToProfile() { uni.switchTab({ url: '/pages/profile/index' }) }
function goToCourses() { uni.switchTab({ url: '/pages/courses/index' }) }
function goToKnowledge() { uni.switchTab({ url: '/pages/knowledge/index' }) }
function goToLive() { uni.navigateTo({ url: '/pages/record/live', fail: (err: any) => { console.error('[Home] navigate to live failed:', err); uni.showToast({ title: t('home.cannotEnterRecord'), icon: 'none' }) } }) }
function goToCourseDetail() { uni.navigateTo({ url: '/pages/courses/detail?id=c1' }) }
function goToNoteDetail(note: AINote) { uni.navigateTo({ url: `/pages/record/summary?id=${note.id}` }) }
onMounted(() => { fetchHomeData() })
</script>

<style lang="scss" scoped>
.home-page { min-height:100vh; background:#FAFAF5; padding:0 32rpx; padding-top:calc(72rpx + env(safe-area-inset-top)); padding-bottom:calc(180rpx + env(safe-area-inset-bottom)); box-sizing:border-box; overflow-x:hidden; position:relative;
  &::after { content:''; position:absolute; bottom:0; left:0; right:0; height:560rpx; background:linear-gradient(180deg,transparent,rgba(31,41,55,.018)),radial-gradient(ellipse 420rpx 200rpx at 50% 90%,rgba(31,41,55,.04),transparent 70%); pointer-events:none; z-index:0; } }
/* #ifdef H5 */.home-page { max-width:430px; margin:0 auto; }/* #endif */
.page__scroll { width:100%; height:100vh; box-sizing:border-box; position:relative; z-index:1; }
.h-safe { height:32rpx; }
.error-bar { display:flex; align-items:center; gap:12rpx; padding:20rpx 32rpx; margin:0 0 16rpx; background:#FEF2F2; border-radius:16rpx; border:1rpx solid #FECACA; &:active{opacity:.7;} }
.error-bar__icon { width:44rpx; height:44rpx; border-radius:50%; background:#FEE2E2; color:#DC2626; font-size:24rpx; font-weight:700; display:flex; align-items:center; justify-content:center; }
.error-bar__text { font-size:26rpx; color:#DC2626; flex:1; }
.error-bar__retry { font-size:26rpx; color:#4F46E5; font-weight:600; }
.skel { background:linear-gradient(90deg,#EDE9E3 25%,#F5F3F0 50%,#EDE9E3 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:24rpx; margin-bottom:28rpx; }
.skel--greet{height:88rpx}.skel--course{height:180rpx}.skel--cta{height:200rpx}.skel--heading{height:44rpx;width:200rpx}.skel--card{height:220rpx}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.h-greet { display:flex; align-items:flex-start; justify-content:space-between; padding:16rpx 0 32rpx; gap:16rpx; }
.h-greet__left { flex:1; min-width:0; }
.h-greet__title { font-size:44rpx; font-weight:700; color:#0F172A; display:block; line-height:1.25; letter-spacing:-.5rpx; }
.h-greet__sub { font-size:26rpx; color:#6B7280; display:block; margin-top:8rpx; }
.h-device { display:flex; align-items:center; gap:10rpx; padding:14rpx 24rpx; border-radius:40rpx; background:#FFF; box-shadow:0 2rpx 16rpx rgba(15,23,42,.06); flex-shrink:0; margin-top:4rpx; &:active{opacity:.7;} }
.h-device__icon{font-size:24rpx}.h-device__text{font-size:24rpx;color:#4B5563;font-weight:500}
.h-sec{margin-top:40rpx}
.h-sec__head{display:flex;align-items:center;margin-bottom:22rpx;gap:10rpx}
.h-sec__icon{font-size:30rpx}
.h-sec__title{font-size:34rpx;font-weight:700;color:#0F172A;flex:1;letter-spacing:-.3rpx}
.h-sec__more{font-size:26rpx;color:#4F46E5;font-weight:500;&:active{opacity:.7}}
.h-course{display:flex;align-items:center;gap:22rpx;background:#FFF;border-radius:24rpx;padding:28rpx;box-shadow:0 2rpx 20rpx rgba(15,23,42,.05);position:relative;overflow:hidden;&:active{transform:scale(.985)}}
.h-course__accent{position:absolute;left:0;top:28rpx;bottom:28rpx;width:8rpx;background:#4F46E5;border-radius:0 4rpx 4rpx 0}
.h-course__time{display:flex;flex-direction:column;align-items:center;justify-content:center;width:120rpx;height:120rpx;background:#EEF2FF;border-radius:18rpx;flex-shrink:0;margin-left:4rpx}
.h-course__time-h{font-size:36rpx;font-weight:700;color:#4F46E5}
.h-course__time-p{font-size:24rpx;color:#6366F1;margin-top:4rpx;font-weight:500}
.h-course__sep{width:2rpx;height:72rpx;background:#E5E7EB;flex-shrink:0}
.h-course__body{flex:1;min-width:0}
.h-course__name{font-size:32rpx;font-weight:600;color:#0F172A;display:block}
.h-course__meta{display:flex;flex-direction:column;gap:5rpx;margin-top:10rpx}
.h-course__meta-t{font-size:24rpx;color:#6B7280}
.h-course__badge{padding:8rpx 20rpx;background:#FEF3C7;border-radius:10rpx;flex-shrink:0;align-self:center}
.h-course__badge-t{font-size:22rpx;color:#D97706;font-weight:600}
.h-cta{margin-top:40rpx;border-radius:28rpx;position:relative;overflow:hidden;background:linear-gradient(135deg,#1F2937,#374151 60%,#4F46E5);box-shadow:0 4rpx 24rpx rgba(31,41,55,.18);&:active{opacity:.94}}
.h-cta__watermark{position:absolute;right:-60rpx;bottom:-60rpx;width:280rpx;height:280rpx;border-radius:50%;background:radial-gradient(circle,rgba(79,70,229,.18),transparent 70%);pointer-events:none}
.h-cta__content{display:flex;align-items:center;gap:28rpx;padding:44rpx 36rpx;position:relative;z-index:1}
.h-cta__mic{width:100rpx;height:100rpx;border-radius:50%;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative}
.h-cta__mic-icon{font-size:40rpx;position:relative;z-index:1}
.h-cta__mic-ring{position:absolute;inset:-8rpx;border-radius:50%;border:2rpx solid rgba(99,102,241,.35);animation:mic-pulse 2.5s infinite}
@keyframes mic-pulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.6;transform:scale(1.12)}}
.h-cta__text{flex:1}
.h-cta__title{font-size:38rpx;font-weight:700;color:#FFF;display:block}
.h-cta__sub{font-size:26rpx;color:rgba(255,255,255,.55);display:block;margin-top:8rpx}
.h-cta__arrow{width:68rpx;height:68rpx;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.h-cta__arrow-t{font-size:36rpx;color:rgba(255,255,255,.7)}
.h-note{display:flex;background:#FFF;border-radius:22rpx;padding:28rpx;box-shadow:0 2rpx 16rpx rgba(15,23,42,.04);margin-bottom:20rpx;position:relative;overflow:hidden;&:active{transform:scale(.985)}}
.h-note__accent{position:absolute;left:0;top:0;bottom:0;width:8rpx;background:linear-gradient(180deg,#4F46E5,#6366F1);border-radius:0 4rpx 4rpx 0}
.h-note__body{flex:1;padding-left:16rpx}
.h-note__top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10rpx}
.h-note__course{font-size:24rpx;color:#4F46E5;font-weight:600}
.h-note__date{font-size:22rpx;color:#9CA3AF}
.h-note__title{font-size:30rpx;font-weight:600;color:#0F172A;display:block;line-height:1.35}
.h-note__desc{font-size:26rpx;color:#6B7280;display:block;margin-top:8rpx;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.h-note__tags{display:flex;flex-wrap:wrap;gap:10rpx;margin-top:14rpx}
.h-note__tag{font-size:22rpx;padding:6rpx 18rpx;border-radius:8rpx;background:#F0EEFF;color:#4F46E5;font-weight:500}
.h-note__tag--more{background:#F5F3F0;color:#6B7280}
</style>
