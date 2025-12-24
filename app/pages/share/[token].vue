<template>
  <div class="h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden flex flex-col">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center">
      <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p class="text-slate-500 font-medium">Loading album...</p>
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
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-200">
              {{ clientName ? clientName.charAt(0).toUpperCase() : '?' }}
            </div>
            <div class="text-sm overflow-hidden">
              <p class="text-slate-900 font-semibold truncate">{{ clientName || 'Guest' }}</p>
              <p class="text-slate-500 text-xs">Client Access</p>
            </div>
          </div>
          
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

        <!-- Image Grid -->
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div 
            v-for="image in filteredImages" 
            :key="image.id"
            class="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
            @click="openLightbox(image)"
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
              @click.stop="toggleFavorite(image)"
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
          </div>
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

    <!-- Lightbox -->
    <Teleport to="body">
      <div 
        v-if="lightboxImage" 
        class="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center"
        @click="lightboxImage = null"
      >
        <!-- Close Button -->
        <button 
          class="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          @click="lightboxImage = null"
        >
          <Icon name="lucide:x" size="24" />
        </button>
        
        <!-- Favorite Button (Lightbox) -->
        <button
          @click.stop="toggleFavorite(lightboxImage)"
          class="absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center transition-colors text-white"
          :class="favoriteIds.has(lightboxImage.id) ? 'bg-rose-500 hover:bg-rose-600' : 'bg-white/10 hover:bg-white/20'"
        >
          <Icon name="lucide:heart" size="20" :fill="favoriteIds.has(lightboxImage.id) ? 'currentColor' : 'none'" />
        </button>
        
        <!-- Image -->
        <div class="relative max-w-[90vw] max-h-[85vh]" @click.stop>
          <img 
            :src="lightboxImage.url"
            :alt="lightboxImage.originalFilename"
            class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
        
        <!-- Navigation Arrows -->
        <button 
          v-if="currentImageIndex > 0"
          @click.stop="navigateLightbox(-1)"
          class="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
        >
          <Icon name="lucide:chevron-left" size="28" />
        </button>
        
        <button 
          v-if="currentImageIndex < filteredImages.length - 1"
          @click.stop="navigateLightbox(1)"
          class="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
        >
          <Icon name="lucide:chevron-right" size="28" />
        </button>
        
        <!-- Image Info -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
          <p class="text-sm font-medium text-white/90 mb-1">{{ lightboxImage.originalFilename }}</p>
          <p class="text-xs text-white/50">{{ currentImageIndex + 1 }} of {{ filteredImages.length }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { generateClientName } from '~/utils/animalNames'

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
const lightboxImage = ref<ImageData | null>(null)
const loadingMore = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)

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

const currentImageIndex = computed(() => {
  if (!lightboxImage.value) return -1
  return filteredImages.value.findIndex(img => img.id === lightboxImage.value!.id)
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

// Methods
function openLightbox(image: ImageData) {
  lightboxImage.value = image
}

function navigateLightbox(direction: number) {
  const newIndex = currentImageIndex.value + direction
  if (newIndex >= 0 && newIndex < filteredImages.value.length) {
    lightboxImage.value = filteredImages.value[newIndex]
  }
}

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

// Keyboard navigation for lightbox
function handleKeydown(e: KeyboardEvent) {
  if (!lightboxImage.value) return
  
  if (e.key === 'Escape') {
    lightboxImage.value = null
  } else if (e.key === 'ArrowLeft') {
    navigateLightbox(-1)
  } else if (e.key === 'ArrowRight') {
    navigateLightbox(1)
  }
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
  
  // Show name modal if no client name
  if (!clientName.value) {
    showNameModal.value = true
  }
  
  // Add keyboard listener
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

