<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-[var(--color-text-secondary)]">Loading album...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="min-h-screen flex items-center justify-center">
      <div class="text-center max-w-md mx-auto px-4">
        <div class="text-6xl mb-6">😕</div>
        <h1 class="text-3xl font-bold mb-4">Album Not Found</h1>
        <p class="text-[var(--color-text-secondary)] mb-8">
          This album link may have expired or the album doesn't exist. Please check with the photographer for a valid link.
        </p>
        <NuxtLink to="/" class="btn btn-primary">
          Go to Homepage
        </NuxtLink>
      </div>
    </div>

    <!-- Album Content -->
    <NuxtLayout v-else-if="albumInfo" name="album" :album-title="albumInfo.title" :total-images="albumInfo.totalImages" :event-date="formattedEventDate">
      <template #header-actions>
        <!-- Filter Toggle -->
        <button 
          @click="showFavoritesOnly = !showFavoritesOnly"
          :class="[
            'btn text-sm py-2 px-4',
            showFavoritesOnly ? 'btn-primary' : 'btn-secondary'
          ]"
        >
          <span>❤️</span>
          <span class="hidden sm:inline">{{ showFavoritesOnly ? 'Show All' : 'Favorites' }}</span>
          <span v-if="favoriteIds.size > 0" class="ml-1">({{ favoriteIds.size }})</span>
        </button>
        
        <!-- Client Name (shown as static, cannot be changed once set) -->
        <span 
          v-if="clientName"
          class="text-sm text-[var(--color-text-secondary)] px-3 py-2"
        >
          {{ clientName }}
        </span>
      </template>

      <!-- Image Grid -->
      <div class="container py-6">
        <div v-if="filteredImages.length === 0" class="text-center py-20">
          <div class="text-5xl mb-4">{{ showFavoritesOnly ? '💔' : '📭' }}</div>
          <h2 class="text-xl font-semibold mb-2">
            {{ showFavoritesOnly ? 'No favorites yet' : 'No photos in this album' }}
          </h2>
          <p class="text-[var(--color-text-secondary)]">
            {{ showFavoritesOnly ? 'Tap the heart icon on photos you love!' : 'Check back later for photos.' }}
          </p>
          <button 
            v-if="showFavoritesOnly"
            @click="showFavoritesOnly = false"
            class="btn btn-secondary mt-6"
          >
            Show All Photos
          </button>
        </div>
        
        <div v-else class="image-grid">
          <div 
            v-for="image in filteredImages" 
            :key="image.id"
            class="image-card group"
            @click="openLightbox(image)"
          >
            <img 
              :src="image.thumbnailUrl || image.url"
              :alt="image.originalFilename"
              loading="lazy"
              class="transition-transform duration-300 group-hover:scale-105"
            />
            
            <!-- Favorite Button -->
            <button
              @click.stop="toggleFavorite(image)"
              :class="[
                'favorite-btn',
                favoriteIds.has(image.id) && 'active'
              ]"
            >
              {{ favoriteIds.has(image.id) ? '❤️' : '🤍' }}
            </button>
            
            <!-- Overlay -->
            <div class="image-overlay">
              <span class="text-sm truncate">{{ image.originalFilename }}</span>
            </div>
          </div>
        </div>
      </div>
    </NuxtLayout>

    <!-- Client Name Modal -->
    <Teleport to="body">
      <div v-if="showNameModal" class="modal-backdrop" @click.self="closeNameModal">
        <div class="modal-content">
          <h2 class="text-xl font-semibold mb-2">What's your name?</h2>
          <p class="text-[var(--color-text-secondary)] text-sm mb-6">
            This helps the photographer identify your favorite picks.
          </p>
          
          <form @submit.prevent="saveName">
            <input
              v-model="nameInput"
              type="text"
              placeholder="Enter your first name"
              class="input mb-4"
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
                class="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary flex-1">
                Continue
              </button>
            </div>
          </form>
          
          <p class="text-[var(--color-text-muted)] text-xs mt-4 text-center">
            A unique identifier will be added to your name
          </p>
        </div>
      </div>
    </Teleport>

    <!-- Lightbox -->
    <Teleport to="body">
      <div 
        v-if="lightboxImage" 
        class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        @click="lightboxImage = null"
      >
        <!-- Close Button -->
        <button 
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          @click="lightboxImage = null"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <!-- Favorite Button -->
        <button
          @click.stop="toggleFavorite(lightboxImage)"
          class="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-xl"
        >
          {{ favoriteIds.has(lightboxImage.id) ? '❤️' : '🤍' }}
        </button>
        
        <!-- Image -->
        <img 
          :src="lightboxImage.url"
          :alt="lightboxImage.originalFilename"
          class="max-w-full max-h-full object-contain p-4"
          @click.stop
        />
        
        <!-- Navigation Arrows -->
        <button 
          v-if="currentImageIndex > 0"
          @click.stop="navigateLightbox(-1)"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          v-if="currentImageIndex < filteredImages.length - 1"
          @click.stop="navigateLightbox(1)"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        <!-- Image Info -->
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <p class="text-sm text-white/80">{{ lightboxImage.originalFilename }}</p>
          <p class="text-xs text-white/50">{{ currentImageIndex + 1 }} of {{ filteredImages.length }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { generateClientName } from '~/utils/animalNames'

// Disable default layout for this page - we use album layout conditionally
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
