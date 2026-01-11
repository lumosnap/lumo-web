<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
    <!-- background gradients -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div class="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-100/60 rounded-full blur-[120px]"></div>
        <div class="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-blue-100/60 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-100/60 rounded-full blur-[120px]"></div>
    </div>

    <!-- Navigation -->
    <nav ref="navbarRef" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-6 bg-transparent" :class="{ 'bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm !py-4': isScrolled }">
        <div class="container mx-auto px-6 flex justify-between items-center">
            <div class="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
                <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                    <Icon name="lucide:camera" size="18" />
                </div>
                <span>LumoSnap</span>
            </div>

            <div class="hidden md:flex items-center gap-8">
                <a href="#features"
                    class="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</a>
                <a href="#how-it-works"
                    class="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">How It
                    Works</a>

                <a href="https://github.com/lumosnap/lumo-desktop/releases" target="_blank" rel="noopener noreferrer">
                    <MagneticButton
                        class="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 px-5 py-2 rounded-full text-sm font-semibold">
                        <span>Download App</span>
                    </MagneticButton>
                </a>
            </div>

            <button class="md:hidden p-2 text-slate-900" @click="toggleMenu">
                <Icon name="lucide:menu" size="24" />
            </button>
        </div>
    </nav>

    <!-- Mobile Menu -->
    <div
        class="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl transition-transform duration-500 md:hidden flex items-center justify-center"
        :class="isMenuOpen ? 'translate-x-0' : 'translate-x-full'"
    >
        <div class="flex flex-col items-center gap-8 text-2xl font-light text-slate-900">
            <a href="#features" class="mobile-link hover:text-indigo-600 transition-colors" @click="toggleMenu">Features</a>
            <a href="#how-it-works" class="mobile-link hover:text-indigo-600 transition-colors" @click="toggleMenu">How It Works</a>
            <a href="https://github.com/lumosnap/lumo-desktop/releases" target="_blank" rel="noopener noreferrer"
                class="mt-8 bg-slate-900 text-white px-8 py-3 rounded-full text-lg font-medium">
                Download App
            </a>
        </div>
    </div>

    <main class="relative z-10 pt-32 pb-20">
        <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-200 bg-slate-50 py-12">
        <div class="container mx-auto px-6">
            <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                        <Icon name="lucide:camera" size="16" />
                    </div>
                    <span class="font-bold text-slate-900">LumoSnap</span>
                </div>
                <div class="text-slate-500 text-sm">
                    © 2024 LumoSnap. Made for photographers, by photographers.
                </div>
            </div>
        </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)
const isMenuOpen = ref(false)

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
}

const handleScroll = () => {
    isScrolled.value = window.scrollY > 20
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
})
</script>