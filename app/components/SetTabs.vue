<template>
  <!-- Photographer-defined sets. Tablist with roving tabindex; arrows/Home/End move + select. -->
  <div ref="list" role="tablist" aria-label="Sets" class="relative flex gap-2 overflow-x-auto [scrollbar-width:none] h-14 items-center"
    @keydown="key">
    <button v-for="t in tabs" :id="tabId(t.id)" :key="t.id ?? ''" role="tab" type="button"
      :aria-selected="t.id === modelValue" :aria-controls="panel" :tabindex="t.id === modelValue ? 0 : -1"
      class="shrink-0 h-9 rounded-full pr-3.5 flex items-center gap-2 text-sm font-medium border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 whitespace-nowrap"
      :class="[t.id === modelValue ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100', t.cover ? 'pl-1.5' : 'pl-3.5']"
      @click="emit('update:modelValue', t.id)">
      <img v-if="t.cover" :src="thumbUrl(base, t.cover)" alt="" class="w-6 h-6 rounded-full object-cover bg-slate-200" />
      <span>{{ t.name }}</span>
      <span class="tabular-nums" :class="t.id === modelValue ? 'text-white/70' : 'text-slate-400'">{{ t.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { thumbUrl, type BrowseSet } from '~/utils/browse'

const props = defineProps<{ sets: BrowseSet[]; modelValue: string | null; total: number; base: string; panel: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string | null] }>()

const list = ref<HTMLElement | null>(null)
const tabs = computed(() => [{ id: null, name: 'All', count: props.total, cover: null }, ...props.sets])
const tabId = (id: string | null) => `set-tab-${id ?? 'all'}`

function key(e: KeyboardEvent) {
  const n = tabs.value.length
  const cur = tabs.value.findIndex(t => t.id === props.modelValue)
  const i = e.key === 'ArrowRight' ? (cur + 1) % n : e.key === 'ArrowLeft' ? (cur - 1 + n) % n
    : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
  if (i < 0) return
  e.preventDefault()
  emit('update:modelValue', tabs.value[i]!.id)
  nextTick(() => document.getElementById(tabId(tabs.value[i]!.id))?.focus())
}

// Keep the selected chip in view (reload with ?set= far down the list, keyboard moves). Horizontal only:
// scrollIntoView would also scroll the window.
function reveal() {
  const el = list.value?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (el && list.value) list.value.scrollLeft = el.offsetLeft - (list.value.clientWidth - el.offsetWidth) / 2
}
onMounted(reveal)
watch(() => props.modelValue, () => nextTick(reveal))
</script>
