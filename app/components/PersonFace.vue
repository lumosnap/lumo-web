<template>
  <button v-if="compact" type="button" :aria-pressed="picked" :title="person.name"
    class="btn btn-ghost shrink-0 h-9 pl-1 pr-3 gap-2 text-[13px] font-normal"
    :class="lifted && !picked ? 'outline-2 outline-dashed outline-offset-1 outline-brand' : ''">
    <span aria-hidden="true" class="relative w-7 h-7 rounded-full overflow-hidden shrink-0">
      <span class="absolute inset-0 bg-inset-2 text-ink-3 text-xs font-medium flex items-center justify-center">{{ person.name.slice(0, 1).toUpperCase() }}</span>
      <span class="absolute inset-0 bg-no-repeat"
        :style="{ backgroundImage: `url(${thumbUrl(base, person.cover)})`, ...avatarCrop(person.box, person.cover.w, person.cover.h) }"></span>
    </span>
    <span class="max-w-[10rem] truncate" :class="picked || lifted ? 'text-brand font-medium' : 'text-ink'">{{ person.name }}</span>
    <Icon v-if="picked" name="lucide:check" size="14" class="-ml-0.5 text-brand" />
  </button>
  <button v-else type="button" :aria-pressed="picked" :aria-label="person.name" :title="person.name"
    class="group shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5 rounded-ctl pt-1 pb-1.5">
    <span aria-hidden="true" class="relative w-14 h-14 rounded-full ring-offset-2 ring-offset-card transition-shadow"
      :class="picked ? 'ring-2 ring-brand' : lifted ? 'outline-2 outline-dashed outline-offset-2 outline-brand' : 'group-hover:ring-2 group-hover:ring-line-2'">
      <!-- Initial under the face: shows while the thumbnail loads or if it fails -->
      <span class="absolute inset-0 rounded-full bg-inset-2 text-ink-3 text-lg font-medium flex items-center justify-center">{{ person.name.slice(0, 1).toUpperCase() }}</span>
      <span class="absolute inset-0 rounded-full bg-no-repeat"
        :style="{ backgroundImage: `url(${thumbUrl(base, person.cover)})`, ...avatarCrop(person.box, person.cover.w, person.cover.h) }"></span>
      <span v-if="picked" class="absolute -right-0.5 -bottom-0.5 w-5 h-5 rounded-full bg-brand text-white ring-2 ring-card flex items-center justify-center">
        <Icon name="lucide:check" size="12" />
      </span>
    </span>
    <span class="max-w-full line-clamp-2 break-words text-center px-0.5 text-[13px] leading-4"
      :class="picked || lifted ? 'font-medium text-brand' : 'text-ink-2'">{{ person.name }}</span>
  </button>
</template>

<script setup lang="ts">
// No comments at the template root: they make it a fragment, and then class (w-full in the column) does not fall through.
// Compact (the phone strip above the photos): a face chip, the same shape as a person in the filter bar.
// 36 px tall instead of a 92 px column, so the photos start higher; the full name fits on one line.
// One face: a 56 px circle with the full name under it, over two lines. Photographers name roles
// ("bride father"), so first words collide. Picked: ring and check. Named in the search: dashed ring.
import { avatarCrop, thumbUrl, type BrowsePerson } from '~/utils/browse'

defineProps<{ person: BrowsePerson; base: string; picked: boolean; lifted: boolean; compact?: boolean }>()
</script>
