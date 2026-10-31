<template>
  <a :href="imageUrl(base, image)" :data-idx="index" target="_blank" @click.prevent="emit('open', index)"
    class="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 bg-cover bg-center cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 block"
    :style="placeholder ? { backgroundImage: `url(${placeholder})` } : undefined">
    <img :src="thumbUrl(base, image)" :alt="fileName(image)" :width="image.w" :height="image.h"
      :loading="eager ? 'eager' : 'lazy'" :fetchpriority="high ? 'high' : 'auto'" decoding="async"
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
    <button @click.stop.prevent="emit('favorite', image.id)"
      class="absolute top-3 right-3 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 px-2 gap-1.5 min-w-8"
      :class="favorited ? 'bg-rose-500 text-white shadow-lg' : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'">
      <Icon name="lucide:heart" size="14" class="shrink-0" :fill="favorited || favCount > 0 ? 'currentColor' : 'none'" />
      <span v-if="favCount > 0" class="text-xs font-bold">{{ favCount }}</span>
    </button>

    <!-- Note Indicator (Overlay) -->
    <button @click.stop.prevent="emit('comment', image.id)"
      class="absolute top-3 right-14 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 px-2 gap-1.5 min-w-8"
      :class="hasMyNote ? 'bg-indigo-500 text-white shadow-md' : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'">
      <Icon name="lucide:message-square" size="14" class="shrink-0" fill="currentColor" />
      <span v-if="notesCount > 0" class="text-xs font-bold">{{ notesCount }}</span>
    </button>

    <!-- Burst badge: the tile stands for `burst` frames -->
    <div v-if="burst" class="absolute bottom-3 left-3 h-6 px-2 rounded-full bg-black/55 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 z-10 group-hover:opacity-0 transition-opacity"
      role="img" :aria-label="`Burst of ${burst} photos`">
      <Icon name="lucide:layers" size="12" class="shrink-0" />{{ burst }}
    </div>

    <!-- Filename (Overlay) -->
    <div class="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <p class="text-white text-xs font-medium truncate">{{ fileName(image) }}</p>
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
}>()

const emit = defineEmits<{ open: [index: number]; favorite: [id: number]; comment: [id: number] }>()

const favorited = computed(() => props.favs.has(props.image.id))
const favCount = computed(() => props.counts.get(props.image.id) ?? 0)

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
