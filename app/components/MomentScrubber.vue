<template>
  <!-- Right-edge moment scrubber. Drag/click the track or use the keyboard on the thumb. Local state only:
       jumping scrolls the window, the grid itself never re-renders from scrubbing. -->
  <div ref="track" class="moment-scrubber font-ui fixed right-0 top-20 bottom-20 w-8 z-30 touch-none select-none cursor-pointer"
    @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @pointerleave="hover = null">
    <div class="absolute right-3.5 top-0 bottom-0 w-1 rounded-full bg-line-2" />
    <div role="slider" tabindex="0" aria-label="Jump to moment" aria-orientation="vertical" :aria-valuemin="1"
      :aria-valuemax="labels.length" :aria-valuenow="shown + 1" :aria-valuetext="labels[shown]"
      class="absolute right-1 w-6 h-10 -mt-5 rounded-full bg-card shadow-lift ring-1 ring-line-2 outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center"
      :style="{ top: `${pct(shown)}%` }" @keydown="key" @focus="focused = true" @blur="focused = false; drag = null">
      <span class="w-2.5 h-0.5 rounded bg-ink-3" />
    </div>
    <div v-if="drag !== null || focused || hover !== null" aria-hidden="true"
      class="absolute right-9 -translate-y-1/2 whitespace-nowrap rounded-ctl bg-ink text-card text-[13px] px-3 py-1.5 shadow-float pointer-events-none tabular-nums"
      :style="{ top: `${pct(hover ?? shown)}%` }">{{ labels[hover ?? shown] }}</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ labels: string[]; active: number }>()
const emit = defineEmits<{ jump: [moment: number] }>()

const track = ref<HTMLElement | null>(null)
const drag = ref<number | null>(null)
const hover = ref<number | null>(null)
const focused = ref(false)
let pointing = false
// Keyboard targets are held until the scroll lands, so fast repeats step from the target, not the stale active.
watch(() => props.active, () => { if (!pointing) drag.value = null })
const shown = computed(() => drag.value ?? Math.max(0, props.active))
const pct = (i: number) => (props.labels.length > 1 ? (i / (props.labels.length - 1)) * 100 : 0)

function at(y: number) {
  const r = track.value!.getBoundingClientRect()
  return Math.round(Math.min(1, Math.max(0, (y - r.top) / r.height)) * (props.labels.length - 1))
}

// One scroll per frame at most while dragging.
let frame = 0
function jump(i: number) {
  drag.value = i
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => emit('jump', i))
}

function down(e: PointerEvent) {
  track.value!.setPointerCapture(e.pointerId)
  pointing = true
  jump(at(e.clientY))
}
function move(e: PointerEvent) {
  if (pointing) jump(at(e.clientY))
  else if (e.pointerType === 'mouse') hover.value = at(e.clientY)
}
function up() {
  pointing = false
  drag.value = null
  hover.value = null
}

function key(e: KeyboardEvent) {
  const n = props.labels.length
  const step: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, PageDown: 5, PageUp: -5 }
  let i = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : step[e.key] !== undefined ? shown.value + step[e.key]! : null
  if (i === null) return
  e.preventDefault()
  jump(Math.min(n - 1, Math.max(0, i)))
}

onUnmounted(() => cancelAnimationFrame(frame))
</script>
