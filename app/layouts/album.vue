<template>
  <div class="min-h-screen flex flex-col">
    <!-- Album Header -->
    <header class="glass sticky top-0 z-40 p-5">
      <div class="container py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <NuxtLink to="/" class="text-2xl hover:scale-110 transition-transform">📷</NuxtLink>
            <div v-if="albumTitle">
              <h1 class="text-lg font-semibold truncate">{{ albumTitle }}</h1>
              <p class="text-sm text-[var(--color-text-muted)]">
                <span v-if="totalImages">{{ totalImages }} photos</span>
                <span v-if="eventDate"> • {{ eventDate }}</span>
              </p>
            </div>
          </div>
          
          <!-- Slot for right side controls (favorites filter, client name, etc) -->
          <div class="flex items-center gap-3">
            <slot name="header-actions" />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  albumTitle?: string
  totalImages?: number
  eventDate?: string
}>()
</script>
