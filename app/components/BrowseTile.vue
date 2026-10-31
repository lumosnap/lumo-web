<template>
  <!-- A print on the sheet: 10px corners, no shadow, no zoom. Hearts and notes share one dark strip at the top
       right (solid, no blur: dozens of tiles scroll at once on a phone). -->
  <a :href="imageUrl(base, image)" :data-idx="index" target="_blank" @click.prevent="emit('open', index)"
    class="group relative block aspect-[4/5] rounded-tile overflow-hidden bg-inset-2 bg-cover bg-center cursor-zoom-in"
    :style="placeholder ? { backgroundImage: `url(${placeholder})` } : undefined">
    <img :src="thumbUrl(base, image)" :alt="fileName(image)" :width="image.w" :height="image.h"
      :loading="eager ? 'eager' : 'lazy'" :fetchpriority="high ? 'high' : 'auto'" decoding="async"
      class="w-full h-full object-cover" />

    <!-- Filename on hover (pointer devices only), over a short shade -->
    <div class="tile-name absolute inset-x-0 bottom-0 pt-6 pb-2 px-2.5 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-150 pointer-events-none">
      <p class="text-white text-xs truncate">{{ fileName(image) }}</p>
    </div>

    <!-- Note and heart: separate dark circles (solid, no blur: dozens of tiles scroll at once on a phone).
         Pointer devices: the note shows on hover or focus, unless the photo has notes. A heart that is yours
         stays as a white chip with a red heart, the desktop's picked chip. -->
    <div class="absolute top-2 right-2 z-10 flex gap-1">
      <button type="button" class="tile-act" :class="[{ 'tile-note': !notesCount }, hasMyNote ? 'bg-card text-ink' : 'bg-black/55 text-white hover:bg-black/70']"
        :aria-label="hasMyNote ? 'Edit your note' : notesCount ? `Notes, ${notesCount}` : 'Add a note'"
        @click.stop.prevent="emit('comment', image.id)">
        <Icon name="lucide:message-square" size="15" :class="hasMyNote ? 'text-brand' : ''" />
        <span v-if="notesCount > 0" class="text-xs font-medium tabular-nums">{{ notesCount }}</span>
      </button>
      <button type="button" class="tile-act" :class="favorited ? 'bg-card text-ink' : 'bg-black/55 text-white hover:bg-black/70'" :aria-pressed="favorited"
        :aria-label="heartLabel ?? (favCount ? `Favorite, ${favCount}` : 'Favorite')"
        @click.stop.prevent="heart">
        <!-- Inline: the icon font draws outlines only, and a heart that is yours is filled -->
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" :fill="favorited ? 'currentColor' : 'none'" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="[favorited ? 'text-heart' : '', { 'heart-pop': pop }]"
          @animationend="pop = false"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
        <span v-if="favCount > 0" class="text-xs font-medium tabular-nums">{{ favCount }}</span>
      </button>
    </div>

    <!-- Burst badge: the tile stands for `burst` frames -->
    <div v-if="burst" class="tile-burst absolute bottom-2 left-2 h-6 px-2 rounded-full bg-black/55 text-white text-xs font-medium tabular-nums flex items-center gap-1 z-10 transition-opacity duration-150"
      role="img" :aria-label="`Burst of ${burst} photos`">
      <Icon name="lucide:layers" size="12" class="shrink-0" />{{ burst }}
    </div>
  </a>
</template>

<script setup lang="ts">
import { thumbHashToDataURL } from 'thumbhash'
import { fileName, imageUrl, thumbUrl, type ManifestImage, type ShareComment } from '~/utils/browse'

// Each tile reads only its own key from the reactive favs/comments collections,
// so a heart tap re-renders this tile and nothing else.
const props = defineProps<{
  image: ManifestImage
  index: number
  base: string
  favs: Set<number>
  comments: Map<number, ShareComment[]>
  counts: Map<number, number>
  clientName: string
  burst?: number // frame count when this tile is a stacked burst
  eager?: boolean
  high?: boolean
  heartLabel?: string // lists: "Pick for Main album" (no all-client count there)
}>()

const emit = defineEmits<{ open: [index: number]; favorite: [id: number]; comment: [id: number] }>()

const favorited = computed(() => props.favs.has(props.image.id))
const favCount = computed(() => props.counts.get(props.image.id) ?? 0)
// The heart answers the tap itself (a short pop), only when tapped: a remounted row must not replay it.
const pop = ref(false)
function heart() {
  pop.value = !favorited.value
  emit('favorite', props.image.id)
}

// ThumbHash placeholder, decoded client-side once per mounted tile (~0.1ms; only virtualized rows
// mount). Not done in SSR so the HTML stays small and hydration matches.
const placeholder = ref('')
onMounted(() => {
  const th = props.image.th
  if (!th) return
  try { placeholder.value = thumbHashToDataURL(Uint8Array.from(atob(th), ch => ch.charCodeAt(0))) } catch { /* bad hash: keep grey */ }
})
const notesCount = computed(() => props.comments.get(props.image.id)?.filter(c => c.notes?.trim()).length ?? 0)
const hasMyNote = computed(() => !!props.comments.get(props.image.id)?.some(c => c.clientName === props.clientName && c.notes?.trim()))
</script>

<style>
/* Unlayered on purpose: beats the opacity-0 utility only while a pointer hovers */
@media (hover: hover) {
  .group:hover .tile-name { opacity: 1; }
  .group:hover .tile-burst { opacity: 0; }
  .tile-note { opacity: 0; transition: opacity 0.12s; }
  .group:hover .tile-note, .tile-note:focus-visible { opacity: 1; }
}
.heart-pop { animation: heart-pop 0.18s var(--ease-soft); }
@keyframes heart-pop { 50% { transform: scale(1.18); } }
@media (prefers-reduced-motion: reduce) { .heart-pop { animation: none; } }
</style>
