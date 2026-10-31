// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  app: { head: { htmlAttrs: { lang: 'en' } } },
  vite: {
    plugins: [tailwindcss()],
  },
  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@pinia/nuxt',
  ],
  // Outfit (the desktop app's face) for the client gallery: self-hosted by @nuxt/fonts, one variable latin file,
  // font-display swap with a metric-matched fallback, not preloaded (the first photos keep the bandwidth).
  fonts: {
    families: [{ name: 'Outfit', weights: ['300 600'], styles: ['normal'], subsets: ['latin'], preload: false }],
  },
  runtimeConfig: {
    public: {
      apiBase: 'https://backend.lumosnap.com',
    },
  },
  ssr: true
})