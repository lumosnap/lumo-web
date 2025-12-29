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
            <div class="text-xs font-bold text-indigo-600 uppercase tracking-wider">{{ albumInfo.ownerName }}</div>
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
            @click="toggleShowFavorites"
            class="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-xl shadow-sm border transition-all duration-200"
            :class="showFavoritesOnly 
              ? 'bg-rose-50 text-rose-600 border-rose-100 ring-2 ring-rose-100' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
          >
            <Icon name="lucide:heart" size="16" :fill="showFavoritesOnly ? 'currentColor' : 'none'" />
            <span>{{ showFavoritesOnly ? 'Show All Images' : `Show Favorites (${albumInfo?.favoritedPhotosCount || 0})` }}</span>
          </button>
        </div>
      </aside>

      <!-- Right Grid Area -->
      <main class="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 relative" ref="scrollContainer" @scroll="handleScroll">
        
        <!-- Grid Loading State -->
        <div v-if="gridLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="i in 10" :key="i" class="aspect-[4/5] rounded-xl bg-slate-200 animate-pulse"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="images.length === 0" class="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
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
            @click="toggleShowFavorites"
            class="mt-6 px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            View All Photos
          </button>
        </div>

        <!-- Image Grid (Photoswipe) -->
        <div v-else id="gallery" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <a 
            v-for="image in images" 
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
              class="absolute top-3 right-3 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 px-2 gap-1.5"
              :class="image.userFavorite 
                ? 'bg-rose-500 text-white shadow-lg scale-100' 
                : (image.favoriteCount > 0 
                    ? 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40' 
                    : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100 w-8')"
            >
              <Icon name="lucide:heart" size="14" :fill="image.userFavorite || image.favoriteCount > 0 ? 'currentColor' : 'none'" />
              <span v-if="image.favoriteCount > 0" class="text-xs font-bold">{{ image.favoriteCount }}</span>
            </button>

            <!-- Note Indicator (Overlay) -->
            <button
              @click.stop.prevent="openNoteModal(image, $event.target as HTMLElement)"
              class="absolute top-3 right-14 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 hover:bg-white/40 shadow-sm"
              :class="image.userFavorite?.notes 
                ? 'bg-indigo-500 text-white shadow-md opacity-100' 
                : 'bg-white/20 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 scale-90 hover:scale-100'"
            >
              <Icon name="lucide:message-square" size="14" fill="currentColor" />
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
      <div v-if="showNameModal" class="fixed inset-0 z-[200000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in relative overflow-hidden">
          <!-- Background Decoration -->
          <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-white -z-10"></div>
          
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-slate-900 mb-2 font-serif">Welcome!</h2>
            <p class="text-slate-500 text-sm font-medium">
              Let's get you set up to browse photos
            </p>
          </div>
          
          <form @submit.prevent="saveName">
            <!-- Animal Carousel -->
            <div class="mb-8">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Pick your spirit animal</label>
              
              <div class="relative flex items-center justify-center h-48">
                <!-- Prev Button -->
                <button 
                  type="button"
                  @click="prevAnimal"
                  class="absolute left-0 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                >
                  <Icon name="lucide:chevron-left" size="16" />
                </button>

                <!-- Carousel Window -->
                <div class="overflow-hidden w-full px-10 py-8">
                  <div 
                    class="flex items-center justify-center transition-transform duration-300 ease-out"
                    :style="{ transform: `translateX(0)` }"
                  >
                    <div 
                      v-for="(animal, index) in visibleAnimals" 
                      :key="animal?.name || index"
                      @click="selectAnimal(index)"
                      class="flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform px-2"
                      :class="index === 1 ? 'scale-125 opacity-100 z-10' : 'scale-75 opacity-40 blur-[1px]'"
                    >
                      <template v-if="animal">
                        <div class="text-6xl mb-2 transition-transform duration-300" :class="{ 'animate-bounce-subtle': index === 1 }">
                          {{ animal.emoji }}
                        </div>
                        <div class="text-xs font-bold capitalize transition-colors duration-300" :class="index === 1 ? 'text-indigo-600' : 'text-transparent'">
                          {{ animal.name }}
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Next Button -->
                <button 
                  type="button"
                  @click="nextAnimal"
                  class="absolute right-0 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                >
                  <Icon name="lucide:chevron-right" size="16" />
                </button>
              </div>
            </div>

            <!-- Name Input -->
            <div class="mb-8">
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon name="lucide:user" size="18" class="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  v-model="nameInput"
                  type="text"
                  placeholder="Enter your name"
                  class="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium text-lg"
                  autofocus
                  required
                  minlength="1"
                  maxlength="50"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              class="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              :disabled="!nameInput.trim()"
            >
              Start Browsing
            </button>

            <p class="mt-6 text-center text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Keep the name and animal consistent across devices to keep the data synced.
            </p>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Note Popover -->
    <Teleport to="body">
      <div 
        v-if="showNoteModal" 
        class="fixed inset-0 z-[200000] pointer-events-none"
      >
        <!-- Backdrop (Invisible but clickable to close) -->
        <div class="absolute inset-0 pointer-events-auto" @click="closeNoteModal"></div>
        
        <!-- Popover Content -->
        <div 
          class="absolute bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-xs p-4 pointer-events-auto border border-white/20 z-50 origin-top transition-all duration-200 ease-out"
          :class="showNoteModal ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'"
          :style="popoverStyle"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Icon name="lucide:message-square" size="16" class="text-indigo-600" />
              Photo Note
            </h3>
            <button @click="closeNoteModal" class="text-slate-400 hover:text-slate-600 transition-colors">
              <Icon name="lucide:x" size="16" />
            </button>
          </div>
          
          <textarea
            ref="noteTextarea"
            v-model="noteInput"
            placeholder="Add your comments..."
            class="w-full px-3 py-2 rounded-xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all mb-3 text-slate-900 placeholder:text-slate-400 min-h-[80px] text-sm resize-none"
            autofocus
            @keydown.ctrl.enter="handleSaveNote"
            @keydown.meta.enter="handleSaveNote"
          ></textarea>
          
          <div class="flex justify-between items-center">
            <span class="text-xs text-slate-400">Press Enter to save</span>
            <button 
              @click="handleSaveNote"
              class="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { animals } from '~/utils/animalNames'
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
const showFavoritesOnly = ref(false)
const showNameModal = ref(false)
const nameInput = ref('')
const selectedAnimalIndex = ref(0)
const loadingMore = ref(false)
const gridLoading = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)
let lightbox: PhotoSwipeLightbox | null = null

// Carousel Logic
const visibleAnimals = computed(() => {
  const total = animals.length
  const current = selectedAnimalIndex.value
  const prev = (current - 1 + total) % total
  const next = (current + 1) % total
  return [animals[prev], animals[current], animals[next]]
})

function nextAnimal() {
  selectedAnimalIndex.value = (selectedAnimalIndex.value + 1) % animals.length
}

function prevAnimal() {
  selectedAnimalIndex.value = (selectedAnimalIndex.value - 1 + animals.length) % animals.length
}

function selectAnimal(viewIndex: number) {
  // viewIndex is 0 (prev), 1 (current), 2 (next)
  if (viewIndex === 0) prevAnimal()
  if (viewIndex === 2) nextAnimal()
}

// Methods
async function toggleShowFavorites() {
  showFavoritesOnly.value = !showFavoritesOnly.value
  gridLoading.value = true
  
  // Destroy lightbox as the gallery element will be removed
  if (lightbox) {
    lightbox.destroy()
    lightbox = null
  }
  
  // Reset pagination and images
  pagination.value = null
  images.value = []
  
  const token = route.params.token as string
  const result = await api.getAlbum(token, 1, clientName.value, showFavoritesOnly.value)
  
  if (result.success && result.data) {
    images.value = result.data.images
    pagination.value = result.data.pagination
  }
  
  gridLoading.value = false
  
  // Re-initialize lightbox after DOM update
  await nextTick()
  initLightbox()
}

// Client name from localStorage
const CLIENT_NAME_KEY = 'lumosnap_client_name'
const clientName = ref('')

// Computed
const favoriteIds = computed(() => {
  const set = new Set<number>()
  images.value.forEach(img => {
    if (img.userFavorite) {
      set.add(img.id)
    }
  })
  return set
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
  
  const result = await api.getAlbum(token, nextPage, clientName.value, showFavoritesOnly.value)
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
function openLightbox(image: ImageData) {
  if (!lightbox) return
  
  const index = images.value.findIndex(img => img.id === image.id)
  if (index !== -1) {
    const galleryElement = document.querySelector('#gallery') as HTMLElement
    if (galleryElement) {
      lightbox.loadAndOpen(index, { gallery: galleryElement })
    }
  }
}

async function toggleFavorite(image: ImageData) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }

  const token = route.params.token as string
  const isFavorited = !!image.userFavorite

  if (isFavorited && image.userFavorite) {
    const recordId = image.userFavorite.id
    const result = await api.deleteFavorite(token, recordId, clientName.value)
    if (result.success) {
      // Optimistic update
      const index = images.value.findIndex(img => img.id === image.id)
      if (index !== -1 && images.value[index]) {
        images.value[index].userFavorite = null
        images.value[index].favoriteCount = Math.max(0, images.value[index].favoriteCount - 1)
      }
    }
  } else {
    const result = await api.createFavorite(token, image.id, clientName.value)
    if (result.success && result.data) {
      // Optimistic update
      const index = images.value.findIndex(img => img.id === image.id)
      if (index !== -1 && images.value[index]) {
        images.value[index].userFavorite = {
            id: result.data.id,
            notes: result.data.notes,
            createdAt: result.data.createdAt
        }
        images.value[index].favoriteCount += 1
      }
    }
  }
  
  // Update lightbox UI if open
  updateLightboxFavoriteUI()
}

async function saveNote(image: ImageData, note: string) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }

  const token = route.params.token as string
  const isFavorited = !!image.userFavorite

  if (isFavorited && image.userFavorite) {
    const recordId = image.userFavorite.id
    const result = await api.updateFavoriteNotes(token, recordId, clientName.value, note)
    if (result.success && result.data) {
      // Update local state
      const index = images.value.findIndex(img => img.id === image.id)
      if (index !== -1 && images.value[index]) {
          images.value[index].userFavorite = {
              ...images.value[index].userFavorite!,
              notes: note
          }
      }
    }
  } else {
    // Create favorite with note
    const result = await api.createFavorite(token, image.id, clientName.value, note)
    if (result.success && result.data) {
      const index = images.value.findIndex(img => img.id === image.id)
      if (index !== -1 && images.value[index]) {
        images.value[index].userFavorite = {
            id: result.data.id,
            notes: result.data.notes,
            createdAt: result.data.createdAt
        }
        images.value[index].favoriteCount += 1
      }
    }
  }
  updateLightboxFavoriteUI()
}

function updateLightboxFavoriteUI() {
  if (!lightbox || !lightbox.pswp) return
  
  const currSlide = lightbox.pswp.currSlide
  if (!currSlide || !currSlide.data.element) return
  
  const anchor = currSlide.data.element as HTMLAnchorElement
  const image = images.value.find(img => img.url === anchor.href)
  
  if (image) {
    const isFavorited = !!image.userFavorite

    // Update Heart Icon
    const heartIcon = document.querySelector('.pswp-favorite-icon')
    if (heartIcon) {
      if (isFavorited) {
        heartIcon.classList.add('text-rose-500')
        heartIcon.classList.remove('text-white')
        heartIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
      } else if (image.favoriteCount > 0) {
        heartIcon.classList.add('text-white')
        heartIcon.classList.remove('text-rose-500')
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
  
  const animal = animals[selectedAnimalIndex.value]
  if (!animal) return

  const cleanName = nameInput.value.trim().toLowerCase().replace(/\s+/g, '')
  const fullName = `${animal.emoji} ${cleanName}-${animal.name}`
  
  clientName.value = fullName
  localStorage.setItem(CLIENT_NAME_KEY, fullName)
  showNameModal.value = false
  nameInput.value = ''
}

function closeNameModal() {
  if (clientName.value) {
    showNameModal.value = false
    nameInput.value = ''
  }
}

function closeNoteModal() {
  showNoteModal.value = false
  currentNoteImage.value = null
  noteInput.value = ''
}

function initLightbox() {
  lightbox = new PhotoSwipeLightbox({
    gallery: '#gallery',
    children: 'a',
    pswpModule: () => import('photoswipe'),
    padding: { top: 0, bottom: 0, left: 0, right: 0 }, // Edge to edge
    bgOpacity: 0.95,
    showHideOpacity: true,
    trapFocus: false, // Allow focus on our custom modal
    arrowPrevSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>',
    arrowNextSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>',
    closeSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>',
    zoomSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize-2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  })

  // Add Favorite Button
  lightbox.on('uiRegister', () => {
    lightbox!.pswp!.ui!.registerElement({
      name: 'favorite-button',
      order: 9,
      isButton: true,
      tagName: 'button',
      html: '<div class="pswp-custom-icon pswp-favorite-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>',
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

    // Add Notes Button
    lightbox!.pswp!.ui!.registerElement({
      name: 'notes-button',
      order: 10,
      isButton: true,
      tagName: 'button',
      html: '<div class="pswp-custom-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>',
      onClick: (event, el, pswp) => {
        const currSlide = pswp.currSlide
        if (currSlide && currSlide.data.element) {
          const anchor = currSlide.data.element as HTMLAnchorElement
          const image = images.value.find(img => img.url === anchor.href)
          if (image) {
             openNoteModal(image, el)
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

// Note Modal State
const showNoteModal = ref(false)
const noteInput = ref('')
const noteTextarea = ref<HTMLTextAreaElement | null>(null)
const currentNoteImage = ref<ImageData | null>(null)
const popoverPosition = ref({ top: 0, left: 0, alignRight: false })

const popoverStyle = computed(() => {
  if (popoverPosition.value.alignRight) {
    return {
      top: `${popoverPosition.value.top}px`,
      right: `${window.innerWidth - popoverPosition.value.left}px`
    }
  }
  return {
    top: `${popoverPosition.value.top}px`,
    left: `${popoverPosition.value.left}px`
  }
})

function openNoteModal(image: ImageData, targetElement?: HTMLElement) {
  currentNoteImage.value = image
  noteInput.value = image.userFavorite?.notes || ''
  
  if (targetElement) {
    const rect = targetElement.getBoundingClientRect()
    // Default to positioning below the button, aligned to the right if it's on the right side of the screen
    const isRightSide = rect.left > window.innerWidth / 2
    
    popoverPosition.value = {
      top: rect.bottom + 10,
      left: isRightSide ? rect.right : rect.left,
      alignRight: isRightSide
    }
  } else {
    // Fallback to center if no target (e.g. from grid)
    popoverPosition.value = {
      top: window.innerHeight / 2 - 100,
      left: window.innerWidth / 2 - 160,
      alignRight: false
    }
  }
  
  showNoteModal.value = true
  
  // Focus textarea
  nextTick(() => {
    noteTextarea.value?.focus()
  })
}

async function handleSaveNote() {
  if (currentNoteImage.value) {
    await saveNote(currentNoteImage.value, noteInput.value)
    closeNoteModal()
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
  const albumResult = await api.getAlbum(token, 1, clientName.value)
  
  if (!albumResult.success || !albumResult.data) {
    error.value = true
    loading.value = false
    return
  }
  
  albumInfo.value = albumResult.data.album
  images.value = albumResult.data.images
  pagination.value = albumResult.data.pagination
  
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

<style>
/* Photoswipe UI Overrides */
.pswp__button {
  background: none !important;
  transition: all 0.2s ease;
  opacity: 0.8;
}

.pswp__button:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Force all icons to be white */
.pswp__button svg {
  stroke: white !important;
  fill: none !important;
  width: 24px !important;
  height: 24px !important;
}

/* Specific fix for heart icon fill state */
.pswp-favorite-icon svg.text-rose-500 {
  stroke: #f43f5e !important; /* rose-500 */
  fill: #f43f5e !important;
}

.pswp__button--arrow--left,
.pswp__button--arrow--right {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border-radius: 50%;
  width: 48px !important;
  height: 48px !important;
  margin-top: -24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.pswp__button--arrow--left:hover,
.pswp__button--arrow--right:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.pswp__button--close,
.pswp__button--zoom {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border-radius: 12px;
  width: 44px !important;
  height: 44px !important;
  margin: 10px 10px 0 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
}

.pswp__button--close:hover,
.pswp__button--zoom:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.pswp-custom-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.pswp__button--favorite-button,
.pswp__button--notes-button {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border-radius: 12px;
  width: 44px !important;
  height: 44px !important;
  margin: 10px 10px 0 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.pswp__button--favorite-button:hover,
.pswp__button--notes-button:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.pswp__counter {
  font-family: var(--font-sans);
  font-weight: 500;
  opacity: 0.8;
  margin-top: 15px;
  margin-left: 20px;
}
</style>



