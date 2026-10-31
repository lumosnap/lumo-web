<template>
  <!-- Mobile: main's p-4 is narrower than the scrubber (w-8), so reserve the rest whenever the grid has
       moments (known from the SSR rows too, so no shift on mount). measure() subtracts it. -->
  <div ref="root" :class="{ 'pr-4 md:pr-0': layout.moments.length > 0 }">
    <!-- SSR + first client render: plain grid of the first rows (LCP, no hydration mismatch) -->
    <template v-if="!mounted">
      <template v-for="row in ssrRows" :key="row.key">
        <h2 v-if="row.type === 'header'" class="h-12 mb-4 flex items-end pb-2 text-sm font-semibold text-slate-700 tabular-nums">{{ row.label }}</h2>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 [&+h2]:mt-4">
          <BrowseTile v-for="t in row.tiles" :key="t.img.id" :image="t.img" :index="t.index" :burst="t.frames?.length"
            :base="base" :favs="favs" :comments="comments" :counts="counts" :client-name="clientName" eager
            :high="t.index < SSR_HIGH" @open="openTile(t)" @favorite="emit('favorite', $event)"
            @comment="emit('comment', $event)" />
        </div>
      </template>
    </template>

    <!-- After mount: window-virtualized rows (moment headers + image rows, mixed heights) -->
    <template v-else>
      <!-- Sticky label of the moment at the top of the viewport; sits exactly over the inline header -->
      <div v-if="activeLabel" class="sticky z-20 h-0" :style="{ top: `${stickyTop}px` }" aria-hidden="true">
        <div class="h-12 flex items-end pb-2 text-sm font-semibold text-slate-700 tabular-nums bg-slate-50/95 backdrop-blur-sm">{{ activeLabel }}</div>
      </div>
      <div class="relative w-full" :style="{ height: `${virt.getTotalSize()}px` }">
        <div v-for="{ v, row } in virtualRows" :key="String(v.key)" :ref="measureEl" :data-index="v.index"
          class="absolute top-0 left-0 w-full" :style="{ transform: `translateY(${v.start - margin}px)` }">
          <h2 v-if="row.type === 'header'" class="h-12 flex items-end pb-2 text-sm font-semibold text-slate-700 tabular-nums">{{ row.label }}</h2>
          <div v-else class="grid gap-4" :style="{ height: `${tileH}px`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }">
            <BrowseTile v-for="t in row.tiles" :key="t.img.id" :image="t.img" :index="t.index" :burst="t.frames?.length"
              :base="base" :favs="favs" :comments="comments" :counts="counts" :client-name="clientName"
              @open="openTile(t)" @favorite="emit('favorite', $event)" @comment="emit('comment', $event)" />
          </div>
        </div>
      </div>
      <!-- Teleported: the page's fade-in transform would otherwise trap position:fixed -->
      <Teleport to="body">
        <MomentScrubber v-if="momentLabels.length > 1 && scrubberRoom" :labels="momentLabels" :active="activeMoment" @jump="jumpToMoment" />
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useWindowVirtualizer } from '@tanstack/vue-virtual'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import BrowseTile from '~/components/BrowseTile.vue'
import MomentScrubber from '~/components/MomentScrubber.vue'
import {
  buildRows, columnsFor, fileName, imageUrl, PSWP_BASE_OPTIONS, renderLightboxButtons, thumbUrl,
  type ManifestImage, type ShareComment, type Tile
} from '~/utils/browse'

const props = defineProps<{
  token: string
  images: ManifestImage[]
  base: string
  favs: Set<number>
  comments: Map<number, ShareComment[]>
  counts: Map<number, number>
  clientName: string
  favoritesOnly: boolean
  stackBursts: boolean
  eventDate: string | null
  labels?: Record<string, string> // SSR head only: moment labels computed from the full album
  setId?: string | null // selected set: scroll position is saved per (token, set)
  stickyTop?: number // height of the sticky bar above the grid (set tabs), 0 without
}>()

const emit = defineEmits<{ favorite: [id: number]; comment: [id: number]; heart: [x: number, y: number] }>()

const SSR_HIGH = 5 // first row at xl
const GAP = 16 // gap-4
const HEADER_H = 48 // h-12
const stickyTop = computed(() => props.stickyTop ?? 0)
const scrollKey = () => `lumosnap_scroll_${props.token}${props.setId ? `:${props.setId}` : ''}`

const root = ref<HTMLElement | null>(null)
const mounted = ref(false)

// Favorites-only is a snapshot taken when the filter flips (like v1's refetch),
// so un-hearting inside the filtered view doesn't reshuffle the grid.
const list = shallowRef<ManifestImage[]>(props.images)
watch(() => [props.images, props.favoritesOnly] as const, ([imgs, only]) => {
  const favs = toRaw(props.favs)
  list.value = only ? imgs.filter(img => favs.has(img.id)) : imgs
})

// Layout
const cols = ref(5)
const width = ref(0)
const margin = ref(0)
const tileH = computed(() => width.value ? ((width.value - (cols.value - 1) * GAP) / cols.value) * 1.25 : 300) // aspect-[4/5]
const rowOpts = computed(() => ({ stackBursts: props.stackBursts, eventDate: props.eventDate, labels: props.labels }))
const layout = computed(() => buildRows(list.value, cols.value, rowOpts.value))
// SSR: the page ships only the first tiles; one row per moment, laid out by the responsive CSS grid.
const ssrRows = computed(() => mounted.value ? [] : buildRows(list.value, Infinity, rowOpts.value).rows)

const virt = useWindowVirtualizer(computed(() => ({
  count: layout.value.rows.length,
  estimateSize: (i: number) => (layout.value.rows[i]?.type === 'header' ? HEADER_H : tileH.value),
  getItemKey: (i: number) => layout.value.rows[i]?.key ?? i,
  gap: GAP,
  overscan: 4,
  scrollMargin: margin.value,
  scrollPaddingStart: stickyTop.value,
})))
watch(tileH, () => virt.value.measure())
const virtualRows = computed(() => virt.value.getVirtualItems().map(v => ({ v, row: layout.value.rows[v.index]! })))
const measureEl = (el: unknown) => virt.value.measureElement(el as HTMLElement | null)

// Moments: the one whose rows are at the top of the viewport drives the sticky label + scrubber.
const momentLabels = computed(() => layout.value.moments.map(m => m.label))
const activeMoment = computed(() => {
  const top = virt.value.range?.startIndex ?? 0
  const ms = layout.value.moments
  let i = -1
  while (i + 1 < ms.length && ms[i + 1]!.row <= top) i++
  return i
})
const activeLabel = computed(() => momentLabels.value[activeMoment.value] ?? '')
function jumpToMoment(i: number) {
  const m = layout.value.moments[i]
  if (m) virt.value.scrollToIndex(m.row, { align: 'start', behavior: 'instant' }) // main.css sets smooth
}

function measure() {
  if (!root.value) return
  cols.value = columnsFor(window.innerWidth)
  width.value = root.value.clientWidth - parseFloat(getComputedStyle(root.value).paddingRight)
  margin.value = root.value.getBoundingClientRect().top + window.scrollY
}

function scrollToImage(index: number) {
  const row = layout.value.rowOf[index]
  if (row !== undefined) virt.value.scrollToIndex(row, { align: 'auto', behavior: 'instant' })
}

// Scroll persistence: first image id at/after the top row + pixel offset from that image's row.
let saveTimer: ReturnType<typeof setTimeout> | null = null
function saveScroll() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (props.favoritesOnly) return
    const item = virt.value.getVirtualItemForOffset(window.scrollY)
    if (!item) return
    const rows = layout.value.rows
    const at = rows[item.index]?.type === 'images' ? item.index : item.index + 1
    const row = rows[at]
    const start = virt.value.measurementsCache[at]?.start
    if (row?.type !== 'images' || start === undefined) return
    sessionStorage.setItem(scrollKey(), JSON.stringify({ id: row.tiles[0]!.img.id, off: window.scrollY - start }))
  }, 200)
}

let restored = false
// Set switch: restore that set's position (or its top) once its list lands. Sync, so it runs before the list watcher.
watch(() => props.setId, () => {
  restored = false
  if (saveTimer) clearTimeout(saveTimer)
}, { flush: 'sync' })
async function restoreScroll() {
  if (restored || props.favoritesOnly) return
  const saved = JSON.parse(sessionStorage.getItem(scrollKey()) || 'null') as { id: number; off: number } | null
  if (!saved) {
    restored = true
    const top = margin.value - stickyTop.value
    if (mounted.value && window.scrollY > top) window.scrollTo({ top, behavior: 'instant' })
    return
  }
  const index = layout.value.visible.findIndex(img => img.id === saved.id)
  if (index === -1) return // full manifest may not be here yet
  restored = true
  await nextTick()
  const start = virt.value.measurementsCache[layout.value.rowOf[index]!]?.start
  if (start !== undefined) window.scrollTo({ top: start + saved.off, behavior: 'instant' })
}
watch(list, restoreScroll)

// Lightbox: driven by the data array, so it covers the whole album with no load-more.
// A stacked burst opens over its own frames only; everything else indexes the flat visible list.
let lightbox: PhotoSwipeLightbox | null = null
const currIndex = ref(-1)
const burst = shallowRef<{ frames: ManifestImage[]; index: number } | null>(null)
const items = () => burst.value?.frames ?? layout.value.visible

function openTile(t: Tile) {
  burst.value = t.frames ? { frames: t.frames, index: t.index } : null
  lightbox?.loadAndOpen(t.frames ? t.frames.indexOf(t.img) : t.index)
}

function updateLightboxUI() {
  if (!lightbox?.pswp) return
  const img = items()[lightbox.pswp.currIndex]
  if (!img) return
  const comments = props.comments.get(img.id) ?? []
  const favorited = props.favs.has(img.id)
  renderLightboxButtons({
    favorited,
    favCount: props.counts.get(img.id) ?? 0,
    pending: false,
    hasNote: comments.some(c => c.clientName === props.clientName && !!c.notes?.trim()),
    noteCount: comments.filter(c => c.notes?.trim()).length,
  })
}

// Repaint when the open image's favorite/comments change (heart, double-tap, sidebar submit).
watch(() => {
  const img = items()[currIndex.value]
  return img ? [props.favs.has(img.id), props.counts.get(img.id), props.comments.get(img.id)] : null
}, updateLightboxUI)

function initLightbox() {
  lightbox = new PhotoSwipeLightbox({
    ...PSWP_BASE_OPTIONS,
    dataSource: [],
    pswpModule: () => import('photoswipe'),
  })

  lightbox.addFilter('numItems', () => items().length)
  lightbox.addFilter('itemData', (_data, index) => {
    const img = items()[index]
    if (!img) return {}
    return {
      src: imageUrl(props.base, img),
      msrc: thumbUrl(props.base, img),
      width: img.w,
      height: img.h,
      alt: fileName(img),
      thumbCropped: true,
    }
  })
  // Look the tile up live; if its row isn't mounted PhotoSwipe falls back to a fade.
  lightbox.addFilter('thumbEl', (el, _data, index) =>
    (root.value?.querySelector<HTMLElement>(`[data-idx="${burst.value?.index ?? index}"] img`) ?? el) as HTMLElement)

  lightbox.on('uiRegister', () => {
    lightbox!.pswp!.ui!.registerElement({
      name: 'favorite-button',
      order: 9,
      isButton: true,
      tagName: 'button',
      html: '<div class="pswp-custom-icon pswp-favorite-icon flex items-center justify-center w-full h-full"></div>',
      onClick: (_e, _el, pswp) => {
        const img = items()[pswp.currIndex]
        if (img) emit('favorite', img.id)
      }
    })

    lightbox!.pswp!.ui!.registerElement({
      name: 'notes-button',
      order: 10,
      isButton: true,
      tagName: 'button',
      html: '<div class="pswp-custom-icon pswp-comment-icon flex items-center justify-center w-full h-full"></div>',
      onClick: (_e, _el, pswp) => {
        const img = items()[pswp.currIndex]
        if (img) emit('comment', img.id)
      }
    })
  })

  lightbox.on('change', () => {
    currIndex.value = lightbox?.pswp?.currIndex ?? -1
    updateLightboxUI()
    scrollToImage(burst.value?.index ?? currIndex.value)
  })
  lightbox.on('openingAnimationStart', () => {
    currIndex.value = lightbox?.pswp?.currIndex ?? -1
    updateLightboxUI()
  })
  lightbox.on('close', () => scrollToImage(burst.value?.index ?? currIndex.value))
  lightbox.on('destroy', () => { currIndex.value = -1; burst.value = null })

  // Double-tap to favorite (same thresholds as v1)
  lightbox.on('afterInit', () => {
    let lastTime = 0
    let last = { x: 0, y: 0 }
    lightbox?.pswp?.element?.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      const now = Date.now()
      const point = { x: e.clientX, y: e.clientY }
      if (now - lastTime < 300 && Math.hypot(point.x - last.x, point.y - last.y) < 50) {
        e.preventDefault()
        e.stopPropagation()
        const img = lightbox?.pswp ? items()[lightbox.pswp.currIndex] : undefined
        if (img) {
          emit('favorite', img.id)
          emit('heart', point.x, point.y)
        }
        return
      }
      lastTime = now
      last = point
    })
  })

  lightbox.init()
}

// On mobile the album card sits above the grid; keep the fixed scrubber off it until the grid reaches the top.
const scrubberRoom = ref(false)
const checkScrubberRoom = () => {
  if (root.value) scrubberRoom.value = window.innerWidth >= 768 || root.value.getBoundingClientRect().top <= 80
}

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  measure()
  checkScrubberRoom()
  window.addEventListener('scroll', checkScrubberRoom, { passive: true })
  window.addEventListener('resize', checkScrubberRoom)
  mounted.value = true
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(root.value!)
  window.addEventListener('resize', measure)
  window.addEventListener('scroll', saveScroll, { passive: true })
  restoreScroll()
  initLightbox()
})

onUnmounted(() => {
  window.removeEventListener('scroll', checkScrubberRoom)
  window.removeEventListener('resize', checkScrubberRoom)
  resizeObserver?.disconnect()
  window.removeEventListener('resize', measure)
  window.removeEventListener('scroll', saveScroll)
  if (saveTimer) clearTimeout(saveTimer)
  lightbox?.destroy()
  lightbox = null
})
</script>
