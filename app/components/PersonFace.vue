<template>
  <!-- One face: a 56 px circle with the full name under it, over two lines. Photographers name roles
       ("bride father"), so first words collide. Picked: ring and check. Named in the search: dashed ring. -->
  <button type="button" :aria-pressed="picked" :aria-label="person.name" :title="person.name"
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
import { avatarCrop, thumbUrl, type BrowsePerson } from '~/utils/browse'

defineProps<{ person: BrowsePerson; base: string; picked: boolean; lifted: boolean }>()
</script>
