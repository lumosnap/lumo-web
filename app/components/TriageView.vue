<template>
  <!-- One by one: the photos of the view not yet decided, one at a time, on the lightbox's night stage.
       Keep adds to the list; Skip remembers "not this one" on this device. Every action is a button (swipe and
       keys are shortcuts to the same buttons). -->
  <div role="dialog" aria-modal="true" aria-labelledby="triage-title" tabindex="-1" class="gallery outline-none fixed inset-0 z-[150000] bg-night text-white flex flex-col select-none"
    @keydown="onKey">
    <div class="h-16 shrink-0 px-2 flex items-center gap-2">
      <button ref="closeBtn" type="button" class="tri-round" aria-label="Close one by one" @click="emit('close')">
        <Icon name="lucide:x" size="20" />
      </button>
      <div class="flex-1 min-w-0 px-1">
        <h2 id="triage-title" class="text-[15px] font-medium truncate">{{ title }}</h2>
        <!-- The limit that can stop Keep comes first; how many are left to look at is quieter -->
        <p class="text-[13px] text-white/65 tabular-nums truncate"><span v-if="chapter" class="text-white/90">{{ chapter }} · </span>{{ current ? `${images.length.toLocaleString('en-US')} left to see` : 'Done' }}</p>
      </div>
      <!-- The list's count: the one number that moves on Keep -->
      <p class="shrink-0 h-10 px-3.5 rounded-full bg-night-2 flex items-center gap-1.5 text-sm tabular-nums" :aria-label="`${listName}: ${counter}`">
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" class="text-heart" :class="{ 'heart-pop': pop }" @animationend="pop = false"><path :d="HEART" /></svg>
        {{ counter }}
      </p>
    </div>

    <!-- Stage. The thumbnail paints at once under the full photo, so a slow phone never shows black. -->
    <div v-if="current" class="relative flex-1 min-h-0 mx-2 overflow-hidden touch-none"
      @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="cancel">
      <div :key="current.id" class="absolute inset-0 flex items-center justify-center will-change-transform"
        :style="{ transform: `translateX(${dx}px) rotate(${dx / 40}deg)`, transition: dragging ? 'none' : 'transform 0.2s var(--ease-soft), opacity 0.2s', opacity: fly ? 0 : 1 }">
        <div class="relative max-w-full max-h-full" :style="{ aspectRatio: `${current.w} / ${current.h}`, height: '100%' }">
          <img :src="thumbUrl(base, current)" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-contain" draggable="false" />
          <img :src="imageUrl(base, current)" :alt="fileName(current)" class="absolute inset-0 w-full h-full object-contain" draggable="false" />
        </div>
      </div>
      <!-- Swipe cue: says which way the photo is going before it is let go -->
      <span aria-hidden="true" class="tri-cue left-4 bg-card text-ink" :style="{ opacity: Math.max(0, Math.min(1, dx / THRESHOLD)) }">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-heart"><path :d="HEART" /></svg>Keep
      </span>
      <span aria-hidden="true" class="tri-cue right-4 bg-night-2 text-white" :style="{ opacity: Math.max(0, Math.min(1, -dx / THRESHOLD)) }">
        <Icon name="lucide:x" size="16" />Skip
      </span>
    </div>

    <!-- Done: every photo of the view is decided -->
    <div v-else class="flex-1 flex flex-col items-center justify-center text-center px-8">
      <span class="mb-5 w-14 h-14 rounded-full bg-night-2 flex items-center justify-center" aria-hidden="true">
        <Icon name="lucide:check" size="24" />
      </span>
      <p class="text-2xl tracking-tight text-balance">You’ve seen them all</p>
      <p class="mt-2 text-white/70 tabular-nums text-balance">{{ title }}<template v-if="skippedHere"> · {{ skippedHere.toLocaleString('en-US') }} skipped</template> · {{ counter }} in {{ listName }}</p>
      <div class="mt-7 flex flex-wrap justify-center gap-2">
        <button v-if="next" type="button" class="btn bg-card text-ink" @click="emit('next')">{{ next }}</button>
        <button type="button" class="btn" :class="next ? 'bg-night-2 text-white' : 'bg-card text-ink'" @click="emit('close')">Back to photos</button>
        <button v-if="skippedHere" type="button" class="btn bg-night-2 text-white" @click="emit('reset')">See the skipped ones again</button>
      </div>
    </div>

    <!-- Why Keep cannot add this one (a full list or chapter, a sent list). Polite: it changes with the photo. -->
    <p class="min-h-10 px-5 pt-2 text-center text-sm text-white/80 text-balance" aria-live="polite">{{ current ? blocked ?? '' : '' }}</p>

    <div v-if="current" class="shrink-0 px-3 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-2 max-w-xl w-full mx-auto">
      <button type="button" class="tri-round w-12 h-12" :disabled="!canUndo" aria-label="Undo" aria-keyshortcuts="U" @click="emit('undo')">
        <Icon name="lucide:undo-2" size="20" />
      </button>
      <button type="button" class="tri-act bg-night-2 text-white" aria-keyshortcuts="S ArrowLeft" @click="decide('skip')">
        <Icon name="lucide:x" size="20" />Skip<kbd>S</kbd>
      </button>
      <button type="button" class="tri-act bg-card text-ink" :aria-disabled="!!blocked || undefined" aria-keyshortcuts="K ArrowRight"
        @click="decide('keep')">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" class="text-heart"><path :d="HEART" /></svg>Keep<kbd>K</kbd>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fileName, imageUrl, thumbUrl, type ManifestImage } from '~/utils/browse'

const props = defineProps<{
  images: ManifestImage[] // the queue: undecided photos of the view, in grid order; [0] is shown
  base: string
  title: string // the view: "Haldi", "All photos"
  listName: string
  counter: string // "212 / 300"
  blocked: string | null // why Keep cannot add the current photo
  canUndo: boolean
  skippedHere: number
  chapter?: string // "14 / 40 picked" when the view is a limited chapter
  next?: string // done screen: where to go next ("Next: Getting ready 0 / 30", "Send Main album")
}>()
const emit = defineEmits<{ keep: [id: number]; skip: [id: number]; undo: []; close: []; reset: []; next: [] }>()

const HEART = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
const THRESHOLD = 90 // px of drag that commits a swipe
const current = computed(() => props.images[0])
const closeBtn = ref<HTMLButtonElement | null>(null)
const pop = ref(false)
watch(() => props.counter, () => { pop.value = true })

// Next two full photos load while this one is looked at.
watch(() => props.images.slice(1, 3).map(i => i.id).join(), () => {
  for (const img of props.images.slice(1, 3)) new Image().src = imageUrl(props.base, img)
}, { immediate: true })

const reduce = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const dx = ref(0)
const fly = ref(false)
const dragging = ref(false)
let startX = 0
let busy = false

const send = (kind: 'keep' | 'skip', id: number) => (kind === 'keep' ? emit('keep', id) : emit('skip', id))
function decide(kind: 'keep' | 'skip') {
  const img = current.value
  if (!img || busy) return
  if (kind === 'keep' && props.blocked) { dx.value = 0; return } // the line above says why
  if (reduce) return send(kind, img.id)
  // The photo leaves the way it was sent, then the next one is simply there.
  busy = true
  fly.value = true
  dx.value = (kind === 'keep' ? 1 : -1) * Math.max(window.innerWidth * 0.6, Math.abs(dx.value) + 120)
  setTimeout(() => { send(kind, img.id); dx.value = 0; fly.value = false; busy = false }, 180)
}

function down(e: PointerEvent) {
  if (busy || e.button !== 0) return
  dragging.value = true
  startX = e.clientX
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (dragging.value) dx.value = e.clientX - startX
}
function up() {
  if (!dragging.value) return
  dragging.value = false
  if (dx.value > THRESHOLD) decide('keep')
  else if (dx.value < -THRESHOLD) decide('skip')
  else dx.value = 0
}
function cancel() { dragging.value = false; dx.value = 0 }

function onKey(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const k = e.key.toLowerCase()
  if (k === 'escape') emit('close')
  else if (!current.value) return
  else if (k === 'arrowright' || k === 'k') decide('keep')
  else if (k === 'arrowleft' || k === 's') decide('skip')
  else if (k === 'u' && props.canUndo) emit('undo')
  else return
  e.preventDefault()
}

// Keys work from anywhere in the view: focus starts inside it (on Close, the one control that never changes).
onMounted(() => closeBtn.value?.focus())
</script>

<style>
@layer components {
  .tri-round { width: 40px; height: 40px; flex: none; border-radius: 999px; display: inline-grid; place-items: center; background: var(--color-night-2); color: oklch(96% 0 0); transition: background-color 0.12s, opacity 0.12s; }
  .tri-round:hover:not(:disabled) { background: oklch(32% 0.005 255); }
  .tri-round:disabled { opacity: 0.35; }
  .tri-act { flex: 1; height: 56px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 16px; font-weight: 500; transition: transform 0.12s var(--ease-soft), opacity 0.12s; }
  .tri-act:active { transform: scale(0.98); }
  .tri-act[aria-disabled='true'] { opacity: 0.45; }
  .tri-act kbd { display: none; font: 500 11px/1 var(--font-ui); padding: 3px 5px; border-radius: 5px; border: 1px solid currentColor; opacity: 0.5; }
  @media (hover: hover) { .tri-act kbd { display: inline-block; } }
  .tri-cue { position: absolute; top: 16px; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 999px; font-size: 14px; font-weight: 500; pointer-events: none; }
}
</style>
