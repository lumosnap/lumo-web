<template>
  <div class="bg-slate-50 font-sans text-slate-900 flex flex-col" :class="isV2 ? 'min-h-screen' : 'h-screen overflow-hidden'">
    <!-- Loading State (Skeleton) -->
    <div v-if="loading" class="flex-1 flex flex-col md:flex-row overflow-hidden animate-fade-in">
      <!-- Left Sidebar Skeleton -->
      <aside
        class="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-6 flex flex-col gap-6 shrink-0 z-10">
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="h-4 w-20 bg-slate-200 rounded animate-pulse"></div>
            <div class="h-6 w-16 bg-emerald-50 rounded-full animate-pulse"></div>
          </div>
          <div class="h-10 w-3/4 bg-slate-200 rounded mb-2 animate-pulse"></div>
          <div class="h-4 w-1/2 bg-slate-200 rounded animate-pulse"></div>
        </div>

        <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
            <div class="flex-1">
              <div class="h-4 w-24 bg-slate-200 rounded mb-1 animate-pulse"></div>
              <div class="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div class="h-10 w-full bg-white rounded-xl border border-slate-200 animate-pulse"></div>
        </div>
      </aside>

      <!-- Right Grid Skeleton -->
      <main class="flex-1 overflow-hidden bg-slate-50 p-4 md:p-8">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="i in 10" :key="i" class="aspect-[4/5] rounded-xl bg-slate-200 animate-pulse"></div>
        </div>
      </main>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
      <div class="text-6xl mb-6">😕</div>
      <h1 class="text-3xl font-bold mb-4 text-slate-900">Album Not Found</h1>
      <p class="text-slate-500 mb-8 leading-relaxed">
        This album link may have expired or the album doesn't exist. Please check with the photographer for a valid
        link.
      </p>
      <NuxtLink to="/"
        class="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-colors">
        Go to Homepage
      </NuxtLink>
    </div>

    <!-- Main Content Area (Split View) -->
    <div v-else-if="albumInfo" class="flex-1 flex flex-col md:flex-row animate-fade-in"
      :class="isV2 ? '' : 'overflow-hidden'">

      <!-- Left Sidebar (v2: page scrolls on window, so the sidebar sticks) -->
      <aside
        class="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-6 flex flex-col gap-6 shrink-0 overflow-y-auto z-10 shadow-sm md:shadow-none"
        :class="isV2 ? 'md:sticky md:top-0 md:h-screen md:self-start' : ''">
        <!-- Album Info -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-indigo-600 uppercase tracking-wider">{{ albumInfo.ownerName }}</div>
            <div
              class="flex items-center gap-1.5 text-emerald-600 text-[10px] font-medium bg-emerald-50 px-2 py-1 rounded-full">
              <Icon name="lucide:check-circle-2" size="12" /> Synced
            </div>
          </div>
          <h1 class="text-3xl font-serif italic text-slate-900 mb-2">{{ albumInfo.title }}</h1>
          <p class="text-sm text-slate-400 font-medium">
            {{ formattedEventDate }} • {{ albumInfo.totalImages }} Photos
          </p>
        </div>

        <!-- Client Profile Card -->
        <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">

          <!-- Favorites Toggle -->
          <button @click="toggleShowFavorites"
            class="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-xl shadow-sm border transition-all duration-200"
            :class="showFavoritesOnly
              ? 'bg-rose-50 text-rose-600 border-rose-100 ring-2 ring-rose-100'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
            <Icon name="lucide:heart" size="16" :fill="showFavoritesOnly ? 'currentColor' : 'none'" />
            <span>{{ showFavoritesOnly ? 'Show All Images' : `Show Favorites (${(isV2 ? v2Favs.size : albumInfo?.favoritedPhotosCount) || 0})`
              }}</span>
          </button>

          <!-- v2: stack burst frames into one tile (only for albums with bursts) -->
          <label v-if="hasBursts" class="mt-3 flex items-center justify-between gap-3 text-sm font-medium text-slate-600 px-1 cursor-pointer">
            <span class="flex items-center gap-2"><Icon name="lucide:layers" size="16" />Stack bursts</span>
            <input v-model="stackBursts" type="checkbox" role="switch" class="w-5 h-5 accent-indigo-600 cursor-pointer" />
          </label>
        </div>
      </aside>

      <!-- Right Grid Area -->
      <main class="flex-1 bg-slate-50 p-4 md:p-8 relative" :class="isV2 ? 'min-w-0' : 'overflow-y-auto'"
        ref="scrollContainer" @scroll="handleScroll">

        <!-- Grid Loading State -->
        <div v-if="gridLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="i in 10" :key="i" class="aspect-[4/5] rounded-xl bg-slate-200 animate-pulse"></div>
        </div>

        <!-- Browse v2: set tabs (only when the album has sets), sticky over the grid -->
        <div v-if="isV2 && manifest && sets.length"
          class="sticky top-0 z-30 -mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-4 px-4 md:px-8 bg-slate-50/95 backdrop-blur-sm">
          <SetTabs v-model="selectedSet" :sets="sets" :total="allCount" :base="manifest.base"
            panel="set-panel" />
        </div>

        <!-- Browse v2: set picked before the full manifest arrived (SSR only shipped the URL's set) -->
        <div v-if="isV2 && manifest && !gridImages" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="i in 10" :key="i" class="aspect-[4/5] rounded-xl bg-slate-200 animate-pulse"></div>
        </div>

        <!-- Browse v2: virtualized grid over the full manifest -->
        <div v-else-if="isV2 && manifest && gridImages && (showFavoritesOnly ? gridImages.some(i => v2Favs.has(i.id)) : gridImages.length > 0)"
          v-bind="sets.length ? { id: 'set-panel', role: 'tabpanel', 'aria-labelledby': `set-tab-${selectedSet ?? 'all'}` } : {}">
          <BrowseGrid :token="token" :images="gridImages" :base="manifest.base" :favs="v2Favs" :comments="v2Comments"
            :counts="v2Counts" :client-name="clientName" :favorites-only="showFavoritesOnly" :stack-bursts="stackBursts"
            :event-date="manifest.album.eventDate" :labels="manifest.labels" :set-id="selectedSet"
            :sticky-top="sets.length ? 56 : 0" @favorite="toggleFavoriteV2" @comment="openCommentSidebarV2"
            @heart="showHeartAnimation" />
        </div>

        <!-- Empty State -->
        <div v-else-if="images.length === 0"
          class="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
          <div class="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6 text-4xl">
            {{ showFavoritesOnly ? '💔' : '📷' }}
          </div>
          <h2 class="text-xl font-bold text-slate-900 mb-2">
            {{ showFavoritesOnly ? 'No favorites yet' : 'No photos found' }}
          </h2>
          <p class="text-slate-500 max-w-xs">
            <span v-if="showFavoritesOnly">Tap the heart icon on photos you love to add them to your collection.</span>
            <span v-else>This album seems to be empty.</span>
          </p>
          <button v-if="showFavoritesOnly" @click="toggleShowFavorites"
            class="mt-6 px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            View All Photos
          </button>
        </div>

        <!-- Image Grid (Photoswipe) -->
        <div v-else id="gallery" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <a v-for="(image, index) in images" :key="image.id" :href="image.url" :data-pswp-width="image.width"
            :data-pswp-height="image.height" target="_blank"
            class="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 block">
            <img :src="image.thumbnailUrl || image.url" :alt="image.originalFilename"
              :loading="index < 20 ? 'eager' : 'lazy'" :fetchpriority="index < 20 ? 'high' : 'auto'" decoding="async"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

            <!-- Gradient Overlay -->
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            </div>

            <!-- Scrim Overlay for Buttons -->
            <div
              class="absolute top-0 right-0 w-80 h-20 bg-gradient-to-b from-black/30 via-black/15 to-transparent pointer-events-none">
            </div>

            <!-- Favorite Button (Overlay) -->
            <button @click.stop.prevent="toggleFavorite(image)"
              class="absolute top-3 right-3 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 px-2 gap-1.5 min-w-8"
              :class="[
                pendingFavorites.has(image.id) ? 'opacity-70 cursor-wait' : '',
                image.userFavorite
                  ? 'bg-rose-500 text-white shadow-lg'
                  : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'
              ]" :disabled="pendingFavorites.has(image.id)">
              <Icon name="lucide:heart" size="14" class="shrink-0"
                :class="{ 'animate-pulse': pendingFavorites.has(image.id) }"
                :fill="image.userFavorite || image.favoriteCount > 0 ? 'currentColor' : 'none'" />
              <span v-if="image.favoriteCount > 0" class="text-xs font-bold">{{ image.favoriteCount }}</span>
            </button>

            <!-- Note Indicator (Overlay) -->
            <button @click.stop.prevent="openCommentSidebar(image)"
              class="absolute top-3 right-14 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 px-2 gap-1.5 min-w-8"
              :class="image.userFavorite?.notes
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'">
              <Icon name="lucide:message-square" size="14" class="shrink-0" fill="currentColor" />
              <span v-if="image.notesCount && image.notesCount > 0" class="text-xs font-bold">{{ image.notesCount
                }}</span>
            </button>

            <!-- Filename (Overlay) -->
            <div
              class="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p class="text-white text-xs font-medium truncate">{{ image.originalFilename }}</p>
            </div>
          </a>
        </div>

        <!-- Loading More Indicator -->
        <div v-if="loadingMore" class="py-8 flex justify-center">
          <div class="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    </div>

    <!-- Client Name Modal -->
    <Teleport to="body">
      <div v-if="showNameModal"
        class="fixed inset-0 z-[200000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in relative overflow-hidden">
          <!-- Background Decoration -->
          <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-white -z-10"></div>

          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-slate-900 mb-2 font-serif">Welcome!</h2>
            <p class="text-slate-500 text-sm font-medium">
              Let's get you set up to browse photos
            </p>
          </div>

          <form @submit.prevent="saveName">
            <!-- Animal Carousel -->
            <div class="mb-8">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Pick your
                spirit animal</label>

              <div class="relative flex items-center justify-center h-48">
                <!-- Prev Button -->
                <button type="button" @click="prevAnimal"
                  class="absolute left-0 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm">
                  <Icon name="lucide:chevron-left" size="16" />
                </button>

                <!-- Carousel Window -->
                <div class="overflow-hidden w-full px-10 py-8">
                  <div class="flex items-center justify-center transition-transform duration-300 ease-out"
                    :style="{ transform: `translateX(0)` }">
                    <div v-for="(animal, index) in visibleAnimals" :key="animal?.name || index"
                      @click="selectAnimal(index)"
                      class="flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform px-2"
                      :class="index === 1 ? 'scale-125 opacity-100 z-10' : 'scale-75 opacity-40 blur-[1px]'">
                      <template v-if="animal">
                        <div class="text-6xl mb-2 transition-transform duration-300"
                          :class="{ 'animate-bounce-subtle': index === 1 }">
                          {{ animal.emoji }}
                        </div>
                        <div class="text-xs font-bold capitalize transition-colors duration-300"
                          :class="index === 1 ? 'text-indigo-600' : 'text-transparent'">
                          {{ animal.name }}
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Next Button -->
                <button type="button" @click="nextAnimal"
                  class="absolute right-0 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm">
                  <Icon name="lucide:chevron-right" size="16" />
                </button>
              </div>
            </div>

            <!-- Name Input -->
            <div class="mb-8">
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon name="lucide:user" size="18"
                    class="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input v-model="nameInput" type="text" placeholder="Enter your name"
                  class="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium text-lg"
                  autofocus required minlength="1" maxlength="50" />
              </div>
            </div>

            <button type="submit"
              class="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              :disabled="!nameInput.trim()">
              Start Browsing
            </button>

            <p class="mt-6 text-center text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Keep the name and animal consistent across devices to keep the data synced.
            </p>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Comment Sidebar -->
    <CommentSidebar :is-open="showCommentSidebar" :image="currentCommentImage" :client-name="clientName"
      :loading="commentLoading" @close="closeCommentSidebar" @submit="handleSubmitComment" />

    <!-- Double Tap Heart Animation -->
    <Teleport to="body">
      <div v-for="anim in heartAnimations" :key="anim.id" class="fixed pointer-events-none z-[200000]"
        :style="{ left: anim.x + 'px', top: anim.y + 'px' }">
        <div class="heart-burst">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"
            viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE -->
            <path fill="#f43f5e" stroke="#f43f5e" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676a.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
          </svg>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { animals } from '~/utils/animalNames'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import CommentSidebar from '~/components/CommentSidebar.vue'
import BrowseGrid from '~/components/BrowseGrid.vue'
import SetTabs from '~/components/SetTabs.vue'
import type { ShareManifest } from '~/composables/useApi'
import { useShareStore } from '~/stores/share'
import { browseHead, mergeFeedback, resolveSets, setImages, type BrowseSet, PSWP_BASE_OPTIONS, renderLightboxButtons, thumbUrl, toShareImage, type ShareComment } from '~/utils/browse'

// Disable default layout for this page
definePageMeta({
  layout: false
})



const route = useRoute()
const api = useApi()
const shareStore = useShareStore()
const token = route.params.token as string

// Browse v2 (virtualized grid over the manifest) is opt-in via ?browse=v2, or via an album-level
// browseV2 flag that redirects here (see below). Default path is untouched: one share fetch, no manifest.
const isV2 = route.query.browse === 'v2'

// Periodic flush starts in onMounted, after clientName loads.

// Flush changes on leave/close
onBeforeUnmount(() => {
  shareStore.stopPeriodicFlush()
  if (clientName.value) {
    shareStore.flushChanges(token, clientName.value)
  }
})

// Also handle browser close/refresh
if (import.meta.client) {
  window.addEventListener('beforeunload', () => {
    if (clientName.value) {
      shareStore.flushChanges(token, clientName.value)
    }
  })
}

// Types from API
type AlbumData = NonNullable<Awaited<ReturnType<typeof api.getAlbum>>['data']>
type ImageData = AlbumData['images'][number] & { notesCount?: number }

// Server-side data fetching
// Use limit 40 to render only 40 images first
const { data: albumData } = await useAsyncData(
  `album-${token}`,
  () => api.getAlbum(token, 1, undefined, false, 40),
  {
    // Don't watch route or other reactive refs automatically unless specified
    // We handle client-side updates manually
    immediate: !isV2
  }
)

// Album-level opt-in: if the share response carries album.browseV2, hop to ?browse=v2.
// Zero cost for albums without the flag.
if (!isV2 && albumData.value?.data?.album.browseV2) {
  const query = new URLSearchParams(route.query as Record<string, string>)
  query.set('browse', 'v2')
  await navigateTo(`${route.path}?${query}`, { replace: true, external: true })
}

// v2 SSR: only the first rows go into the payload (LCP); the full manifest is fetched on mount
// (CDN/browser-cached via ETag) so 10k images don't bloat the HTML.
const V2_SSR_IMAGES = 15
const { data: manifestHead } = await useAsyncData(
  `manifest-${token}`,
  async () => {
    const m = await api.getManifest(token)
    if (!m) return null
    // Sets resolved here (chips render from SSR, ids stripped: the full manifest brings them).
    // The head is the ?set= set's first tiles (+ burst frames) with moment labels from that whole set.
    const resolved = resolveSets(m.sets ?? [], m.images)
    const head = resolved.find(s => s.id === route.query.set)
    const { images, labels } = browseHead(head ? setImages(m.images, head) : m.images, V2_SSR_IMAGES, m.album.eventDate)
    return {
      ...m, images, labels, sets: [],
      resolved: resolved.map(s => ({ ...s, ids: [] })),
      headSet: head?.id ?? null,
      total: m.images.length,
      hasBursts: m.images.some(i => i.b !== null), // whole album, so the switch is in the SSR HTML (no shift)
    }
  },
  { immediate: isV2 }
)
type ManifestHead = { labels: Record<string, string>; resolved: BrowseSet[]; headSet: string | null; total: number; hasBursts: boolean }
const manifest = shallowRef<ShareManifest & Partial<ManifestHead> | null>(manifestHead.value ?? null)
const stackBursts = ref(true)
const hasBursts = computed(() => manifest.value?.hasBursts ?? !!manifest.value?.images.some(i => i.b !== null))
const allCount = computed(() => manifest.value?.total ?? manifest.value?.images.length ?? 0)

// Sets: chip bar + filter. Selection lives in ?set= (replaceState, so no navigation/refetch).
const sets = computed(() => manifest.value?.resolved ?? resolveSets(manifest.value?.sets ?? [], manifest.value?.images ?? []))
const selectedSet = ref<string | null>(manifest.value?.headSet ?? null)
// Images of the selected set; null while only the SSR head (of another set) is here.
const gridImages = computed(() => {
  const m = manifest.value
  if (!m) return null
  if (m.labels) return m.headSet === selectedSet.value ? m.images : null
  const s = sets.value.find(s => s.id === selectedSet.value)
  return s ? setImages(m.images, s) : m.images
})
watch(sets, list => { if (selectedSet.value && !list.some(s => s.id === selectedSet.value)) selectedSet.value = null })
watch(selectedSet, id => {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('set', id)
  else url.searchParams.delete('set')
  window.history.replaceState(window.history.state, '', url)
})
const v2Favs = reactive(new Set<number>())
const v2Comments = reactive(new Map<number, ShareComment[]>())
const v2Counts = reactive(new Map<number, number>()) // favorites per image, all clients

// Initialize state from SSR data
const loading = ref(false)
const error = ref(isV2 ? !manifest.value : !albumData.value?.success)
const albumInfo = ref<AlbumData['album'] | null>(
  isV2
    ? (manifest.value && { ...manifest.value.album, shareLinkToken: token, favoritedPhotosCount: 0, ownerName: manifest.value.album.ownerName ?? '' })
    : albumData.value?.data?.album || null
)
const images = ref<ImageData[]>(albumData.value?.data?.images || [])
const pagination = ref<AlbumData['pagination'] | null>(albumData.value?.data?.pagination || null)

// Preload first 40 images for LCP and preconnect to CDN
if (images.value.length > 0) {
  const firstImage = images.value[0]
  const imageUrl = firstImage?.thumbnailUrl || firstImage?.url
  let imageDomain = ''
  try {
    if (imageUrl) {
      const urlObj = new URL(imageUrl, useRuntimeConfig().public.apiBase)
      imageDomain = urlObj.origin
    }
  } catch (e) { /* ignore */ }

  useHead({
    link: [
      ...(imageDomain ? [{
        rel: 'preconnect',
        href: imageDomain,
        crossorigin: 'anonymous' as const
      }] : []),
      ...images.value.slice(0, 40).map(img => ({
        rel: 'preload',
        as: 'image' as const,
        href: img.thumbnailUrl || img.url
      }))
    ]
  })
}

// v2: preconnect to the image base + preload the first row
if (isV2 && manifest.value?.images.length) {
  const { base, images: head } = manifest.value
  let imageDomain = ''
  try { imageDomain = new URL(base, useRuntimeConfig().public.apiBase).origin } catch (e) { /* ignore */ }
  useHead({
    link: [
      ...(imageDomain ? [{ rel: 'preconnect', href: imageDomain, crossorigin: 'anonymous' as const }] : []),
      ...head.slice(0, 5).map(img => ({
        rel: 'preload',
        as: 'image' as const,
        href: thumbUrl(base, img),
        fetchpriority: 'high' as const
      }))
    ]
  })
}

const showFavoritesOnly = ref(false)
const pendingFavorites = ref<Set<number>>(new Set())
const showNameModal = ref(false)
const nameInput = ref('')
const selectedAnimalIndex = ref(0)
const loadingMore = ref(false)
const gridLoading = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)
let lightbox: PhotoSwipeLightbox | null = null

// Double-tap detection state
const lastTapTime = ref(0)
const lastTapPosition = ref({ x: 0, y: 0 })
const DOUBLE_TAP_DELAY = 300 // ms between taps to count as double-tap

// Heart animation state
const heartAnimations = ref<Array<{ id: number; x: number; y: number }>>([])
let animationIdCounter = 0

// Pagination threshold for loading next page (75%)
const LOAD_THRESHOLD = 0.75

// Carousel Logic
const visibleAnimals = computed(() => {
  const total = animals.length
  const current = selectedAnimalIndex.value
  const prev = (current - 1 + total) % total
  const next = (current + 1) % total
  return [animals[prev], animals[current], animals[next]]
})

function nextAnimal() {
  selectedAnimalIndex.value = (selectedAnimalIndex.value + 1) % animals.length
}

function prevAnimal() {
  selectedAnimalIndex.value = (selectedAnimalIndex.value - 1 + animals.length) % animals.length
}

function selectAnimal(viewIndex: number) {
  // viewIndex is 0 (prev), 1 (current), 2 (next)
  if (viewIndex === 0) prevAnimal()
  if (viewIndex === 2) nextAnimal()
}

// Methods
async function toggleShowFavorites() {
  showFavoritesOnly.value = !showFavoritesOnly.value
  if (isV2) return // BrowseGrid filters client-side
  gridLoading.value = true

  // Destroy lightbox as the gallery element will be removed
  if (lightbox) {
    lightbox.destroy()
    lightbox = null
  }

  // Reset pagination and images
  pagination.value = null
  images.value = []

  const token = route.params.token as string
  const result = await api.getAlbum(token, 1, clientName.value, showFavoritesOnly.value)

  if (result.success && result.data) {
    images.value = result.data.images
    pagination.value = result.data.pagination
  }

  gridLoading.value = false

  // Re-initialize lightbox after DOM update
  await nextTick()
  initLightbox()
}

// Client name from localStorage
const CLIENT_NAME_KEY = 'lumosnap_client_name'
const clientName = ref('')

// Computed
const favoriteIds = computed(() => {
  const set = new Set<number>()
  images.value.forEach(img => {
    if (img.userFavorite) {
      set.add(img.id)
    }
  })
  return set
})

const formattedEventDate = computed(() => {
  if (!albumInfo.value?.eventDate) return undefined
  return new Date(albumInfo.value.eventDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Infinite Scroll Handler
const handleScroll = () => {
  if (!scrollContainer.value || loadingMore.value || !pagination.value?.hasNextPage) return

  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  const scrollPercentage = scrollTop / (scrollHeight - clientHeight)

  // Trigger at 75% scroll
  if (scrollPercentage >= LOAD_THRESHOLD) {
    loadMoreImages()
  }
}

// Load more images (pagination)
async function loadMoreImages() {
  if (!pagination.value?.hasNextPage || loadingMore.value) return

  loadingMore.value = true
  const token = route.params.token as string
  const nextPage = pagination.value.currentPage + 1

  const result = await api.getAlbum(token, nextPage, clientName.value, showFavoritesOnly.value)
  if (result.success && result.data) {
    images.value = [...images.value, ...result.data.images]
    pagination.value = result.data.pagination

    // Wait for Vue to update DOM
    // PhotoSwipe filters will automatically pick up the new images
    await nextTick()
  }

  loadingMore.value = false
}

// Check if we should load more based on current position
async function loadMoreIfNeeded(currentIndex: number, totalItems: number) {
  if (!pagination.value?.hasNextPage || loadingMore.value) return

  // Load more when we've viewed 75% of loaded items
  if (currentIndex >= totalItems * LOAD_THRESHOLD) {
    await loadMoreImages()
  }
}

function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  img.classList.remove('opacity-0')
}

// Methods
function openLightbox(image: ImageData) {
  if (!lightbox) return

  const index = images.value.findIndex(img => img.id === image.id)
  if (index !== -1) {
    const galleryElement = document.querySelector('#gallery') as HTMLElement
    if (galleryElement) {
      lightbox.loadAndOpen(index, { gallery: galleryElement })
    }
  }
}

async function toggleFavorite(image: ImageData) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }

  const isFavorited = !!image.userFavorite
  const index = images.value.findIndex(img => img.id === image.id)

  if (index === -1) return

  // Optimistic update - update UI immediately
  if (images.value[index]) {
    if (isFavorited) {
      // Removing favorite
      images.value[index].userFavorite = null
      images.value[index].favoriteCount = Math.max(0, images.value[index].favoriteCount - 1)
      shareStore.addChange(image.id, 'unfavorite')
    } else {
      // Adding favorite
      images.value[index].userFavorite = {
        id: 0, // Temp ID
        notes: '',
        createdAt: new Date().toISOString()
      }
      images.value[index].favoriteCount += 1
      shareStore.addChange(image.id, 'favorite')
    }
  }

  // Update lightbox UI immediately for instant feedback
  updateLightboxUI()
}

async function handleSubmitComment(note: string) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }

  if (!currentCommentImage.value) return

  if (isV2) {
    const id = currentCommentImage.value.id
    shareStore.addChange(id, 'comment', note)
    if (!v2Favs.has(id)) {
      v2Favs.add(id) // Implicit favorite, as in v1
      v2Counts.set(id, (v2Counts.get(id) ?? 0) + 1)
      shareStore.addChange(id, 'favorite')
    }
    // One comment per user per image — replace existing.
    const others = (v2Comments.get(id) ?? []).filter(c => c.clientName !== clientName.value)
    v2Comments.set(id, [...others, { clientName: clientName.value, notes: note, createdAt: new Date().toISOString() }])
    openCommentSidebarV2(id)
    return
  }

  commentLoading.value = true
  const image = currentCommentImage.value

  // Queue the change
  shareStore.addChange(image.id, 'comment', note)

    // Update local state
    const index = images.value.findIndex(img => img.id === image.id)
    if (index !== -1 && images.value[index]) {
      const updatedImage = images.value[index]
      const isFavorited = !!updatedImage.userFavorite

      // Update userFavorite if it doesn't exist or just update the notes
      if (!updatedImage.userFavorite) {
         updatedImage.userFavorite = {
          id: 0,
          notes: note,
          createdAt: new Date().toISOString()
        }
        updatedImage.favoriteCount += 1 // Implicit favorite
        shareStore.addChange(image.id, 'favorite') // Ensure it's favorited if not already
      } else {
        updatedImage.userFavorite.notes = note
      }


      // Optimistic update for comments list
      const newCommentObj = {
        clientName: clientName.value,
        notes: note,
        createdAt: new Date().toISOString()
      }

      // One comment per user per image — replace existing.
      if (updatedImage.comments) {
          updatedImage.comments = updatedImage.comments.filter(c => c.clientName !== clientName.value)
          updatedImage.comments.push(newCommentObj)
      } else {
        updatedImage.comments = [newCommentObj]
      }

      // Update current image ref for sidebar
      currentCommentImage.value = updatedImage
    }

  commentLoading.value = false
  updateLightboxUI()
}

function updateLightboxUI() {
  if (!lightbox || !lightbox.pswp) return

  const currIndex = lightbox.pswp.currIndex
  const image = images.value[currIndex]
  if (!image) return

  renderLightboxButtons({
    favorited: !!image.userFavorite,
    favCount: image.favoriteCount || 0,
    pending: pendingFavorites.value.has(image.id),
    hasNote: !!image.userFavorite?.notes,
    noteCount: image.notesCount || 0
  })
}

async function fetchAlbum(page = 1, isBackground = false) {
  const token = route.params.token as string
  const result = await api.getAlbum(token, page, clientName.value, showFavoritesOnly.value)

  if (!result.success || !result.data) {
    if (page === 1 && !isBackground) {
      error.value = true
      loading.value = false
    }
    return
  }

  if (page === 1) {
    albumInfo.value = result.data.album
    images.value = result.data.images
    pagination.value = result.data.pagination
    if (!isBackground) {
      loading.value = false
    }

    // Only rebuild the lightbox on a foreground refresh; background updates
    // rely on images.value reactivity.
    await nextTick()

    if (!isBackground) {
      if (lightbox) {
        lightbox.destroy()
        lightbox = null
      }
      initLightbox()
    } else {
        // If background refresh, update UI elements (icons)
        updateLightboxUI()
    }
  } else {
    images.value = [...images.value, ...result.data.images]
    pagination.value = result.data.pagination
  }
}

async function saveName() {
  if (!nameInput.value.trim()) return

  const animal = animals[selectedAnimalIndex.value]
  if (!animal) return

  const cleanName = nameInput.value.trim().toLowerCase().replace(/\s+/g, '')
  const fullName = `${animal.emoji} ${cleanName}-${animal.name}`

  clientName.value = fullName
  localStorage.setItem(CLIENT_NAME_KEY, fullName)
  showNameModal.value = false
  nameInput.value = ''

  // Start periodic flush with new name
  shareStore.startPeriodicFlush(token, clientName.value)

  // Refetch data with new name to sync favorites
  if (isV2) await loadFeedback()
  else await fetchAlbum(1, true)
}

function closeCommentSidebar() {
  showCommentSidebar.value = false
  currentCommentImage.value = null
}

// Double-tap to favorite handler
function handleDoubleTap(x: number, y: number) {
  const currIndex = lightbox?.pswp?.currIndex
  if (currIndex === undefined) return

  const image = images.value[currIndex]
  if (image) {
    // Toggle favorite
    toggleFavorite(image)

    // Show heart animation at tap position
    showHeartAnimation(x, y)
  }
}

// Show heart burst animation at position
function showHeartAnimation(x: number, y: number) {
  const id = animationIdCounter++
  heartAnimations.value.push({ id, x, y })

  // Remove animation after it completes (1.5s)
  setTimeout(() => {
    heartAnimations.value = heartAnimations.value.filter(a => a.id !== id)
  }, 1500)
}

// PhotoSwipe picks up new images automatically via the numItems/itemData filters.

function initLightbox() {
  lightbox = new PhotoSwipeLightbox({
    ...PSWP_BASE_OPTIONS,
    // Keep gallery/children for DOM click interception
    gallery: '#gallery',
    children: 'a',
    pswpModule: () => import('photoswipe'),
  })

  // Filter to tell PhotoSwipe how many items we have (dynamic)
  // This allows newly loaded images to be recognized in the lightbox
  lightbox.addFilter('numItems', (numItems) => {
    // Return the actual number of images we have (including dynamically loaded ones)
    // When images are loaded, the DOM anchors are added, and this filter tells PhotoSwipe about them
    return images.value.length
  })

  // Add Favorite Button
  lightbox.on('uiRegister', () => {
    lightbox!.pswp!.ui!.registerElement({
      name: 'favorite-button',
      order: 9,
      isButton: true,
      tagName: 'button',
      html: '<div class="pswp-custom-icon pswp-favorite-icon flex items-center justify-center w-full h-full"></div>',
      onClick: (event, el, pswp) => {
        const currentIndex = pswp.currIndex
        const image = images.value[currentIndex]
        if (image) {
          toggleFavorite(image)
        }
      }
    })

    // Add Notes Button
    lightbox!.pswp!.ui!.registerElement({
      name: 'notes-button',
      order: 10,
      isButton: true,
      tagName: 'button',
      html: '<div class="pswp-custom-icon pswp-comment-icon flex items-center justify-center w-full h-full"></div>',
      onClick: (event, el, pswp) => {
        const currentIndex = pswp.currIndex
        const image = images.value[currentIndex]
        if (image) {
          openCommentSidebar(image)
        }
      }
    })
  })

  lightbox.on('change', () => {
    updateLightboxUI()

    // Check if we need to load more images (silent pagination)
    if (lightbox?.pswp) {
      const currentIndex = lightbox.pswp.currIndex
      const totalItems = images.value.length
      loadMoreIfNeeded(currentIndex, totalItems)
    }
  })

  lightbox.on('openingAnimationStart', () => {
    updateLightboxUI()
  })

  // Add click event listener for double-tap detection after lightbox is ready
  lightbox.on('afterInit', () => {
    const pswpElement = lightbox?.pswp?.element
    if (pswpElement) {
      pswpElement.addEventListener('click', (e: MouseEvent) => {
        // Don't trigger if clicking on buttons
        if ((e.target as HTMLElement).closest('button')) return

        const now = Date.now()
        const point = { x: e.clientX, y: e.clientY }

        // Check if this is a double-tap (within time and distance threshold)
        if (now - lastTapTime.value < DOUBLE_TAP_DELAY) {
          const distance = Math.hypot(point.x - lastTapPosition.value.x, point.y - lastTapPosition.value.y)
          if (distance < 50) { // Within 50px - same location
            e.preventDefault()
            e.stopPropagation()
            handleDoubleTap(point.x, point.y)
            return
          }
        }

        lastTapTime.value = now
        lastTapPosition.value = point
      })
    }
  })

  lightbox.init()
}

// Comment Sidebar State
const showCommentSidebar = ref(false)
const currentCommentImage = ref<ImageData | null>(null)
const commentLoading = ref(false)

function openCommentSidebar(image: ImageData) {
  currentCommentImage.value = image
  showCommentSidebar.value = true
}

// Browse v2: favorites/comments live in v2Favs/v2Comments/v2Counts (loaded from /feedback); writes
// still go through shareStore's batched queue. Unsynced changes are replayed over the server state
// (read after the response lands) so a reload can't undo a heart or comment made meanwhile.
async function loadFeedback() {
  const fb = await api.getFeedback(token, clientName.value)
  if (!fb) return
  const m = mergeFeedback(fb, shareStore.unsyncedChanges(), clientName.value)
  v2Favs.clear()
  m.favs.forEach(id => v2Favs.add(id))
  v2Counts.clear()
  m.counts.forEach((n, id) => v2Counts.set(id, n))
  v2Comments.clear()
  m.comments.forEach((list, id) => v2Comments.set(id, list))
}

function toggleFavoriteV2(id: number) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }
  const had = v2Favs.has(id)
  if (had) v2Favs.delete(id)
  else v2Favs.add(id)
  v2Counts.set(id, Math.max(0, (v2Counts.get(id) ?? 0) + (had ? -1 : 1)))
  shareStore.addChange(id, had ? 'unfavorite' : 'favorite')
}

function openCommentSidebarV2(id: number) {
  const img = manifest.value?.images.find(i => i.id === id)
  if (!img || !manifest.value) return
  currentCommentImage.value = toShareImage(img, manifest.value.base, v2Favs.has(id), v2Counts.get(id) ?? 0, v2Comments.get(id) ?? [], clientName.value)
  showCommentSidebar.value = true
}



// Load data on mount
onMounted(async () => {
  if (isV2) {
    // Full manifest (SSR only shipped the first rows)
    api.getManifest(token).then(m => { if (m) manifest.value = m })
    const savedName = localStorage.getItem(CLIENT_NAME_KEY)
    if (savedName) {
      clientName.value = savedName
      shareStore.startPeriodicFlush(token, savedName)
      loadFeedback()
    } else {
      showNameModal.value = true
    }
    return // BrowseGrid owns its lightbox
  }

  // Client-side hydration and updates
  const savedName = localStorage.getItem(CLIENT_NAME_KEY)
  if (savedName) {
    clientName.value = savedName

    // Start periodic flush
    shareStore.startPeriodicFlush(token, savedName)

    // If we have a client name, we need to re-fetch/update to get favorite status
    // But we don't want to flash loading if we already have images
    const result = await api.getAlbum(token, 1, savedName, showFavoritesOnly.value)
    if (result.success && result.data) {
      // Merge data to keep preloaded images visible but update favorites
      images.value = result.data.images
      albumInfo.value = result.data.album
      pagination.value = result.data.pagination
    }
  }

  // If no SSR data and we failed to load on server or client, show error
  if (!albumInfo.value && !loading.value) {
    // If we are here, it might be that useAsyncData failed or returned error
    // Error state is already set by the specific check above
  }

  // Show name modal if no client name
  if (!clientName.value) {
    showNameModal.value = true
  }

  // Initialize lightbox on mount (ensure DOM is ready)
  await nextTick()
  if (images.value.length > 0) {
    // Small delay to ensure ClientOnly has fully rendered the gallery div
    setTimeout(() => {
      initLightbox()
    }, 50)
  }
})

onUnmounted(() => {
  if (lightbox) {
    lightbox.destroy()
    lightbox = null
  }
})
</script>

<style>
/* Photoswipe UI Overrides */
.pswp__button {
  background: none !important;
  transition: all 0.2s ease;
  opacity: 0.8;
}

.pswp__button:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Force all icons to be white */
.pswp__button svg {
  stroke: white !important;
  fill: none !important;
  width: 24px !important;
  height: 24px !important;
}

/* Specific fix for heart icon fill state */
.pswp-favorite-icon svg.text-rose-500 {
  stroke: #f43f5e !important;
  /* rose-500 */
  fill: #f43f5e !important;
}

.pswp__button--arrow--left,
.pswp__button--arrow--right {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border-radius: 50%;
  width: 48px !important;
  height: 48px !important;
  margin-top: -24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.pswp__button--arrow--left:hover,
.pswp__button--arrow--right:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.pswp__button--close,
.pswp__button--zoom {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border-radius: 12px;
  width: 44px !important;
  height: 44px !important;
  margin: 10px 10px 0 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
}

.pswp__button--close:hover,
.pswp__button--zoom:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.pswp-custom-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.pswp__button--favorite-button,
.pswp__button--notes-button {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border-radius: 12px;
  width: 44px !important;
  height: 44px !important;
  margin: 10px 10px 0 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.pswp__button--favorite-button:hover,
.pswp__button--notes-button:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.pswp__counter {
  font-family: var(--font-sans);
  font-weight: 500;
  opacity: 0.8;
  margin-top: 15px;
  margin-left: 20px;
}

/* Instagram-style Heart Burst Animation */
.heart-burst {
  animation: heartBurst 1.5s ease-out forwards;
  position: relative;
}

@keyframes heartBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0) rotate(-15deg);
  }

  15% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.3) rotate(0deg);
  }

  30% {
    transform: translate(-50%, -50%) scale(0.9) rotate(5deg);
  }

  45% {
    transform: translate(-50%, -50%) scale(1.1) rotate(0deg);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5) rotate(0deg);
  }
}
</style>
