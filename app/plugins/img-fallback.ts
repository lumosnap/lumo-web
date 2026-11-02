// v-img-fallback: a photo that does not load (still uploading, no thumbnail yet, offline) goes see-through, so the
// surface under it (the ThumbHash or the grey inset) shows instead of the browser's broken-image icon. Opacity, not
// visibility: the alt text stays readable to screen readers. A later load (new src) shows it again.
// Checked on mount too: an SSR image can fail before hydration attaches the listener.
export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.directive<HTMLImageElement>('img-fallback', {
    mounted(el) {
      el.addEventListener('error', () => { el.style.opacity = '0' })
      el.addEventListener('load', () => { el.style.opacity = '' })
      if (el.complete && !el.naturalWidth && el.getAttribute('src')) el.style.opacity = '0'
    },
    getSSRProps: () => ({}),
  })
})
