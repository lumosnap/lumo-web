<template>
  <!-- Photographer-defined sets. Tablist with roving tabindex; arrows/Home/End move + select.
       A folder on each set, as in the desktop app: sets are places photos live in; tags and faces are not.
       "All" has none: it is every photo, not a place. -->
  <div ref="list" role="tablist" aria-label="Sets" class="relative flex gap-2 overflow-x-auto [scrollbar-width:none] h-14 items-center"
    @keydown="key">
    <button v-for="t in tabs" :id="tabId(t.id)" :key="t.id ?? ''" role="tab" type="button"
      :aria-selected="t.id === modelValue" :aria-controls="panel" :tabindex="t.id === modelValue ? 0 : -1"
      class="btn btn-ghost px-3.5 gap-1.5" @click="emit('update:modelValue', t.id)">
      <Icon v-if="t.id" :name="t.id === modelValue ? 'lucide:folder-open' : 'lucide:folder'" size="16"
        :class="t.id === modelValue ? 'text-brand' : 'text-ink-3'" />
      <span>{{ t.name }}</span>
      <span class="n">{{ t.count.toLocaleString('en-US') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { BrowseSet } from '~/utils/browse'

const props = defineProps<{ sets: BrowseSet[]; modelValue: string | null; total: number; panel: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string | null] }>()

const list = ref<HTMLElement | null>(null)
const tabs = computed(() => [{ id: null, name: 'All', count: props.total }, ...props.sets])
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
