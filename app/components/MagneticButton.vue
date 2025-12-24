<template>
  <button
    ref="btnRef"
    class="magnetic-btn relative overflow-hidden transition-all duration-300 ease-out active:scale-95 flex items-center justify-center gap-2"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const btnRef = ref<HTMLElement | null>(null)

const handleMouseMove = (e: MouseEvent) => {
  if (!btnRef.value) return
  const { left, top, width, height } = btnRef.value.getBoundingClientRect()
  const x = (e.clientX - (left + width / 2)) * 0.2
  const y = (e.clientY - (top + height / 2)) * 0.2
  btnRef.value.style.transform = `translate(${x}px, ${y}px)`
}

const handleMouseLeave = () => {
  if (!btnRef.value) return
  btnRef.value.style.transform = 'translate(0px, 0px)'
}
</script>
