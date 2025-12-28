<template>
  <div class="h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden flex flex-col">
    <!-- Loading State -->
    <!-- Loading State (Skeleton) -->
    <div v-if="loading" class="flex-1 flex flex-col md:flex-row overflow-hidden animate-fade-in">
      <!-- Left Sidebar Skeleton -->
      <aside class="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-6 flex flex-col gap-6 shrink-0 z-10">
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="h-4 w-20 bg-slate-200 rounded animate-pulse"></div>
            <div class="h-6 w-16 bg-emerald-50 rounded-full animate-pulse"></div>
          </div>
          <div class="h-10 w-3/4 bg-slate-200 rounded mb-2 animate-pulse"></div>
          <div class="h-4 w-1/2 bg-slate-200 rounded animate-pulse"></div>
        </div>

        <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
            <div class="flex-1">
              <div class="h-4 w-24 bg-slate-200 rounded mb-1 animate-pulse"></div>
              <div class="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div class="h-10 w-full bg-white rounded-xl border border-slate-200 animate-pulse"></div>
        </div>
      </aside>

      <!-- Right Grid Skeleton -->
      <main class="flex-1 overflow-hidden bg-slate-50 p-4 md:p-8">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="i in 10" :key="i" class="aspect-[4/5] rounded-xl bg-slate-200 animate-pulse"></div>
        </div>
      </main>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
      <div class="text-6xl mb-6">😕</div>
      <h1 class="text-3xl font-bold mb-4 text-slate-900">Album Not Found</h1>
      <p class="text-slate-500 mb-8 leading-relaxed">
        This album link may have expired or the album doesn't exist. Please check with the photographer for a valid link.
      </p>
      <NuxtLink to="/" class="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-colors">
        Go to Homepage
      </NuxtLink>
    </div>

    <!-- Main Content Area (Split View) -->
    <div v-else-if="albumInfo" class="flex-1 flex flex-col md:flex-row overflow-hidden animate-fade-in">
      
      <!-- Left Sidebar -->
      <aside class="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-6 flex flex-col gap-6 shrink-0 overflow-y-auto z-10 shadow-sm md:shadow-none">
        <!-- Album Info -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-indigo-600 uppercase tracking-wider">Portfolio</div>
            <div class="flex items-center gap-1.5 text-emerald-600 text-[10px] font-medium bg-emerald-50 px-2 py-1 rounded-full">
              <Icon name="lucide:check-circle-2" size="12" /> Synced
            </div>
          </div>
          <h1 class="text-3xl font-serif italic text-slate-900 mb-2">{{ albumInfo.title }}</h1>
          <p class="text-sm text-slate-400 font-medium">
            {{ formattedEventDate }} • {{ albumInfo.totalImages }} Photos
          </p>
        </div>

        <!-- Client Profile Card -->
        <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
          
          <!-- Favorites Toggle -->
          <button 
            @click="showFavoritesOnly = !showFavoritesOnly"
            class="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-xl shadow-sm border transition-all duration-200"
            :class="showFavoritesOnly 
              ? 'bg-rose-50 text-rose-600 border-rose-100 ring-2 ring-rose-100' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
          >
            <Icon name="lucide:heart" size="16" :fill="showFavoritesOnly ? 'currentColor' : 'none'" />
            <span>{{ showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites' }}</span>
            <span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-xs ml-1">{{ favoriteIds.size }}</span>
          </button>
        </div>
      </aside>

      <!-- Right Grid Area -->
      <main class="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 relative" ref="scrollContainer" @scroll="handleScroll">
        
        <!-- Empty State -->
        <div v-if="filteredImages.length === 0" class="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
          <div class="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6 text-4xl">
            {{ showFavoritesOnly ? '💔' : '📷' }}
          </div>
          <h2 class="text-xl font-bold text-slate-900 mb-2">
            {{ showFavoritesOnly ? 'No favorites yet' : 'No photos found' }}
          </h2>
          <p class="text-slate-500 max-w-xs">
            {{ showFavoritesOnly ? 'Tap the heart icon on photos you love to add them to your collection.' : 'This album seems to be empty.' }}
          </p>
          <button 
            v-if="showFavoritesOnly"
            @click="showFavoritesOnly = false"
            class="mt-6 px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            View All Photos
          </button>
        </div>

        <!-- Image Grid (Photoswipe) -->
        <div v-else id="gallery" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <a 
            v-for="image in filteredImages" 
            :key="image.id"
            :href="image.url"
            :data-pswp-width="image.width"
            :data-pswp-height="image.height"
            target="_blank"
            class="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 block"
          >
            <img 
              :src="image.thumbnailUrl || image.url"
              :alt="image.originalFilename"
              loading="lazy"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            <!-- Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <!-- Favorite Button (Overlay) -->
            <button
              @click.stop.prevent="toggleFavorite(image)"
              class="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10"
              :class="favoriteIds.has(image.id) 
                ? 'bg-rose-500 text-white shadow-lg scale-100' 
                : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100'"
            >
              <Icon name="lucide:heart" size="14" :fill="favoriteIds.has(image.id) ? 'currentColor' : 'none'" />
            </button>
            
            <!-- Filename (Overlay) -->
            <div class="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p class="text-white text-xs font-medium truncate">{{ image.originalFilename }}</p>
            </div>
          </a>
        </div>

        <!-- Loading More Indicator -->
        <div v-if="loadingMore" class="py-8 flex justify-center">
          <div class="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    </div>

    <!-- Client Name Modal -->
    <Teleport to="body">
      <div v-if="showNameModal" class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Icon name="lucide:user" size="32" />
            </div>
            <h2 class="text-2xl font-bold text-slate-900 mb-2">Welcome!</h2>
            <p class="text-slate-500 text-sm">
              Please enter your name to start picking your favorites. This helps the photographer identify your selection.
            </p>
          </div>
          
          <form @submit.prevent="saveName">
            <input
              v-model="nameInput"
              type="text"
              placeholder="Your Name"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all mb-6 text-slate-900 placeholder:text-slate-400"
              autofocus
              required
              minlength="1"
              maxlength="50"
            />
            
            <div class="flex gap-3">
              <button 
                v-if="clientName"
                type="button" 
                @click="closeNameModal"
                class="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button type="submit" class="flex-1 px-4 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
                Start Browsing
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { generateClientName } from '~/utils/animalNames'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'

// Disable default layout for this page
definePageMeta({
  layout: false
})

const route = useRoute()
const api = useApi()

// Types from API
type AlbumData = NonNullable<Awaited<ReturnType<typeof api.getAlbum>>['data']>
type ImageData = AlbumData['images'][number]

// State
const loading = ref(true)
const error = ref(false)
const albumInfo = ref<AlbumData['album'] | null>(null)
const images = ref<AlbumData['images']>([])
const pagination = ref<AlbumData['pagination'] | null>(null)
const favorites = ref<Awaited<ReturnType<typeof api.getFavorites>>['data']>([])
const showFavoritesOnly = ref(false)
const showNameModal = ref(false)
const nameInput = ref('')
const loadingMore = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)
let lightbox: PhotoSwipeLightbox | null = null

// Client name from localStorage
const CLIENT_NAME_KEY = 'lumosnap_client_name'
const clientName = ref('')

// Computed
const favoriteIds = computed(() => new Set(favorites.value?.map(f => f.imageId) || []))

const favoriteIdToRecordId = computed(() => {
  const map = new Map<number, number>()
  favorites.value?.forEach(f => map.set(f.imageId, f.id))
  return map
})

const filteredImages = computed(() => {
  if (!images.value?.length) return []
  if (showFavoritesOnly.value) {
    return images.value.filter(img => favoriteIds.value.has(img.id))
  }
  return images.value
})

const formattedEventDate = computed(() => {
  if (!albumInfo.value?.eventDate) return undefined
  return new Date(albumInfo.value.eventDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Infinite Scroll Handler
const handleScroll = () => {
  if (!scrollContainer.value || loadingMore.value || !pagination.value?.hasNextPage) return
  
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  // Load more when user is 200px from bottom
  if (scrollHeight - scrollTop - clientHeight < 200) {
    loadMoreImages()
  }
}

// Load more images (pagination)
async function loadMoreImages() {
  if (!pagination.value?.hasNextPage || loadingMore.value) return
  
  loadingMore.value = true
  const token = route.params.token as string
  const nextPage = pagination.value.currentPage + 1
  
  const result = await api.getAlbum(token, nextPage)
  if (result.success && result.data) {
    images.value = [...images.value, ...result.data.images]
    pagination.value = result.data.pagination
  }
  
  loadingMore.value = false
}

function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  img.classList.remove('opacity-0')
}

// Methods
async function toggleFavorite(image: ImageData) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }

  const isFavorited = favoriteIds.value.has(image.id)
  const token = route.params.token as string

  if (isFavorited) {
    const recordId = favoriteIdToRecordId.value.get(image.id)
    if (recordId) {
      const result = await api.deleteFavorite(token, recordId)
      if (result.success) {
        favorites.value = favorites.value?.filter(f => f.id !== recordId) || []
      }
    }
  } else {
    const result = await api.createFavorite(token, image.id, clientName.value)
    if (result.success && result.data) {
      favorites.value = [...(favorites.value || []), result.data]
    }
  }
  
  // Update lightbox UI if open
  updateLightboxFavoriteUI()
}

function updateLightboxFavoriteUI() {
  if (!lightbox || !lightbox.pswp) return
  
  const currSlide = lightbox.pswp.currSlide
  if (!currSlide || !currSlide.data.element) return
  
  // We need to find the image object that corresponds to the current slide
  // The element in data is the <a> tag we clicked
  const anchor = currSlide.data.element as HTMLAnchorElement
  // Find image by URL since that's what we have in the anchor
  const image = images.value.find(img => img.url === anchor.href)
  
  if (image) {
    const isFavorited = favoriteIds.value.has(image.id)
    const heartIcon = document.querySelector('.pswp-favorite-icon')
    if (heartIcon) {
      if (isFavorited) {
        heartIcon.classList.add('text-rose-500')
        heartIcon.classList.remove('text-white')
        heartIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
      } else {
        heartIcon.classList.remove('text-rose-500')
        heartIcon.classList.add('text-white')
        heartIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
      }
    }
  }
}

function saveName() {
  if (!nameInput.value.trim()) return
  
  const generatedName = generateClientName(nameInput.value.trim())
  clientName.value = generatedName
  localStorage.setItem(CLIENT_NAME_KEY, generatedName)
  showNameModal.value = false
  nameInput.value = ''
}

function closeNameModal() {
  if (clientName.value) {
    showNameModal.value = false
    nameInput.value = ''
  }
}

function initLightbox() {
  lightbox = new PhotoSwipeLightbox({
    gallery: '#gallery',
    children: 'a',
    pswpModule: () => import('photoswipe'),
    padding: { top: 0, bottom: 0, left: 0, right: 0 }, // Edge to edge
    bgOpacity: 0.95,
    showHideOpacity: true,
  })

  // Add Favorite Button
  lightbox.on('uiRegister', () => {
    lightbox!.pswp!.ui!.registerElement({
      name: 'favorite-button',
      order: 9,
      isButton: true,
      tagName: 'button',
      html: '<span class="pswp-favorite-icon text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></span>',
      onClick: (event, el, pswp) => {
        const currSlide = pswp.currSlide
        if (currSlide && currSlide.data.element) {
          const anchor = currSlide.data.element as HTMLAnchorElement
          const image = images.value.find(img => img.url === anchor.href)
          if (image) {
            toggleFavorite(image)
          }
        }
      }
    })
  })

  lightbox.on('change', () => {
    updateLightboxFavoriteUI()
  })
  
  lightbox.on('openingAnimationStart', () => {
    updateLightboxFavoriteUI()
  })

  lightbox.init()
}

// Load data on mount
onMounted(async () => {
  // Check for client name
  const savedName = localStorage.getItem(CLIENT_NAME_KEY)
  if (savedName) {
    clientName.value = savedName
  }

  // Fetch album
  const token = route.params.token as string
  const albumResult = await api.getAlbum(token)
  
  if (!albumResult.success || !albumResult.data) {
    error.value = true
    loading.value = false
    return
  }
  
  albumInfo.value = albumResult.data.album
  images.value = albumResult.data.images
  pagination.value = albumResult.data.pagination
  
  // Fetch favorites if we have a client name
  if (clientName.value) {
    const favResult = await api.getFavorites(token, clientName.value)
    if (favResult.success && favResult.data) {
      favorites.value = favResult.data
    }
  }
  
  loading.value = false
  
  // Initialize Lightbox
  await nextTick()
  initLightbox()
  
  // Show name modal if no client name
  if (!clientName.value) {
    showNameModal.value = true
  }
})

onUnmounted(() => {
  if (lightbox) {
    lightbox.destroy()
    lightbox = null
  }
})
</script>

