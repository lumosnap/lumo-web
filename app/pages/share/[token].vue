<template>
  <!-- Grey paper, white prints: the album card and the photo sheet sit on the canvas, as in the photographer's app. -->
  <!-- inert under the name prompt and the notes panel: keyboard focus stays in the dialog -->
  <div class="gallery bg-canvas flex flex-col" :class="isV2 ? 'min-h-screen' : 'h-screen overflow-hidden'"
    :inert="showNameModal || showCommentSidebar || undefined">
    <!-- Loading State (Skeleton) -->
    <div v-if="loading" class="flex-1 flex flex-col md:flex-row md:p-4 md:gap-4 overflow-hidden">
      <aside class="w-full md:w-80 shrink-0 bg-card rounded-b-card md:rounded-card p-5 md:p-6 flex flex-col gap-3">
        <div class="skel h-4 w-24"></div>
        <div class="skel h-8 w-3/4"></div>
        <div class="skel h-4 w-1/2"></div>
        <div class="skel h-10 w-full mt-3 rounded-ctl"></div>
      </aside>
      <main class="flex-1 mt-2 md:mt-0 bg-card rounded-t-card md:rounded-card p-3 md:p-4 overflow-hidden">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          <div v-for="i in 10" :key="i" class="skel aspect-[4/5]"></div>
        </div>
      </main>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-4">
      <div class="bg-card rounded-card p-8 max-w-sm w-full text-center">
        <span class="mx-auto mb-5 w-14 h-14 rounded-full bg-inset text-ink-3 flex items-center justify-center">
          <Icon name="lucide:image-off" size="24" />
        </span>
        <h1 class="text-2xl text-ink tracking-tight mb-2">This album isn't here</h1>
        <p class="text-ink-2 leading-relaxed mb-6">
          The link may have expired, or the album was taken down. Ask your photographer for a new link.
        </p>
        <NuxtLink to="/" class="btn btn-ghost">Go to LumoSnap</NuxtLink>
      </div>
    </div>

    <!-- Main Content Area (Split View) -->
    <div v-else-if="albumInfo" class="flex-1 flex flex-col md:flex-row animate-fade-in"
      :class="isV2 ? '' : 'overflow-hidden'">

      <!-- Album card. Phones: one white card above the sheet. md+: a column of cards beside it, sticky in v2
           (the page scrolls on the window). -->
      <aside
        class="w-full md:w-80 shrink-0 flex flex-col md:gap-4 md:p-4 md:pr-0 bg-card rounded-b-card md:bg-transparent md:rounded-none z-10"
        :class="isV2 ? 'md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto' : 'md:overflow-y-auto'">
        <div class="px-5 pt-6 pb-4 md:p-6 md:bg-card md:rounded-card">
          <p v-if="albumInfo.ownerName" class="text-[13px] text-ink-3 mb-1 truncate">{{ albumInfo.ownerName }}</p>
          <h1 class="text-[28px] leading-[1.15] tracking-[-0.015em] text-ink text-balance break-words">{{ albumInfo.title }}</h1>
          <p class="mt-1.5 text-sm text-ink-2 tabular-nums">
            <template v-if="formattedEventDate">{{ formattedEventDate }} · </template>{{ (albumInfo.totalImages ?? 0).toLocaleString('en-US') }} photos
          </p>
        </div>

        <!-- Your picks: all or favorites; bursts stacked or not -->
        <div class="px-5 pb-5 md:p-4 md:bg-card md:rounded-card flex flex-wrap items-center gap-2">
          <div class="seg md:w-full" role="group" aria-label="Show">
            <button type="button" class="md:flex-1 md:justify-center" :aria-pressed="!showFavoritesOnly" @click="showFavoritesOnly && toggleShowFavorites()">All</button>
            <button type="button" class="md:flex-1 md:justify-center" :aria-pressed="showFavoritesOnly" @click="!showFavoritesOnly && toggleShowFavorites()">
              <Icon name="lucide:heart" size="16" :class="showFavoritesOnly ? 'text-heart' : ''" />Favorites
              <span class="n">{{ (isV2 ? v2Favs.size : albumInfo?.favoritedPhotosCount) || 0 }}</span>
            </button>
          </div>
          <!-- v2: stack burst frames into one tile (only for albums with bursts) -->
          <button v-if="hasBursts" type="button" class="btn btn-ghost px-3.5 gap-1.5" :aria-pressed="stackBursts"
            title="Show each burst as one photo" @click="stackBursts = !stackBursts">
            <Icon name="lucide:layers" size="16" :class="stackBursts ? 'text-brand' : 'text-ink-3'" />Stack bursts
          </button>
        </div>

        <a href="/" class="hidden md:block mt-auto px-2 py-1 text-[13px] text-ink-3 hover:text-ink-2 w-fit">Shared with LumoSnap</a>
      </aside>

      <!-- The photo sheet. v2: overflow clip (not hidden) rounds its corners without becoming a scroll
           container, so the set bar still sticks to the window. -->
      <main class="flex-1 bg-card mt-2 md:m-4 rounded-t-card md:rounded-card px-3 md:px-4 pb-4 relative"
        :class="[isV2 ? 'min-w-0 overflow-clip' : 'overflow-y-auto', isV2 && manifest && sets.length ? '' : 'pt-3 md:pt-4']"
        ref="scrollContainer" @scroll="handleScroll">

        <!-- Grid Loading State -->
        <div v-if="gridLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          <div v-for="i in 10" :key="i" class="skel aspect-[4/5]"></div>
        </div>

        <!-- Browse v2: set tabs (only when the album has sets), sticky over the grid; solid, no blur over scrolling photos -->
        <div v-if="isV2 && manifest && sets.length"
          class="sticky top-0 z-30 -mx-3 md:-mx-4 mb-1 px-3 md:px-4 bg-card flex items-center gap-2">
          <SetTabs v-model="selectedSet" :sets="sets" :total="allCount"
            panel="set-panel" class="flex-1 min-w-0" />
          <!-- Search lives behind this button, at the row's trailing edge: reachable from anywhere in the album.
               Open with an active search, it focuses the field instead of hiding a filter that is on. -->
          <button v-if="hasTags" type="button" aria-controls="search-panel" :aria-expanded="searchShown"
            :aria-label="searchShown && !searchActive ? 'Close search' : 'Search photos'"
            class="icon-btn" :class="{ on: searchActive, 'bg-ink text-card hover:bg-ink hover:text-card': searchShown && !searchActive }"
            @click="toggleSearch">
            <Icon :name="searchShown && !searchActive ? 'lucide:x' : 'lucide:search'" size="18" />
          </button>
        </div>

        <!-- Browse v2 filters, inside the selected set. Who (faces) sits apart from what (search + tag chips):
             different questions, different shapes. -->
        <div v-if="isV2 && manifest && (hasTags || people.length)" class="mb-2 flex flex-col gap-3">
          <div v-if="stripPeople.length" id="people-strip" role="group" aria-label="People"
            class="-mx-3 px-3 md:mx-0 md:px-0 flex gap-1 overflow-x-auto [scrollbar-width:none] pt-1">
            <button v-for="p in stripPeople" :key="p.id" type="button" :aria-pressed="activePeople.includes(p.id)" :aria-label="p.name"
              :title="p.name" class="group shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5 rounded-ctl pt-1 pb-1.5"
              @click="togglePerson(p.id)">
              <span aria-hidden="true" class="relative w-14 h-14 rounded-full ring-offset-2 ring-offset-card transition-shadow"
                :class="activePeople.includes(p.id) ? 'ring-2 ring-brand' : lifted.ids.includes(p.id) ? 'outline-2 outline-dashed outline-offset-2 outline-brand' : 'group-hover:ring-2 group-hover:ring-line-2'">
                <!-- Initial under the face: shows while the thumbnail loads or if it fails -->
                <span class="absolute inset-0 rounded-full bg-inset-2 text-ink-3 text-lg font-medium flex items-center justify-center">{{ p.name.slice(0, 1).toUpperCase() }}</span>
                <span class="absolute inset-0 rounded-full bg-no-repeat"
                  :style="{ backgroundImage: `url(${thumbUrl(manifest.base, p.cover)})`, ...avatarCrop(p.box, p.cover.w, p.cover.h) }"></span>
                <span v-if="activePeople.includes(p.id)" class="absolute -right-0.5 -bottom-0.5 w-5 h-5 rounded-full bg-brand text-white ring-2 ring-card flex items-center justify-center">
                  <Icon name="lucide:check" size="12" />
                </span>
              </span>
              <!-- Full name over two lines: photographers name roles ("bride father"), so first words collide -->
              <span class="max-w-full line-clamp-2 break-words text-center px-0.5 text-[13px] leading-4"
                :class="activePeople.includes(p.id) || lifted.ids.includes(p.id) ? 'font-medium text-brand' : 'text-ink-2'">{{ p.name }}</span>
            </button>
          </div>
          <div v-if="hasTags && searchShown" id="search-panel" role="search" class="flex flex-col gap-3">
            <div class="relative max-w-xl">
              <label for="photo-search" class="sr-only">Search photos</label>
              <Icon name="lucide:search" size="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
              <input id="photo-search" v-model="qInput" type="search" autocomplete="off" enterkeyhint="search"
                :placeholder="`Search: ${people[0] ? `${people[0].name}, ` : ''}haldi, cake…`"
                class="field h-11 pl-10 pr-11 text-base [&::-webkit-search-cancel-button]:appearance-none"
                @focus="loadSearch" @keydown.esc="onSearchEsc" />
              <button v-if="qInput" type="button" aria-label="Clear search"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:bg-inset-2 hover:text-ink"
                @click="setQuery('')">
                <Icon name="lucide:x" size="16" />
              </button>
            </div>
            <div v-if="chips.length" role="group" aria-label="Filter by tag" class="-mx-3 px-3 md:mx-0 md:px-0 flex gap-2 overflow-x-auto [scrollbar-width:none]">
              <button v-for="c in chips" :key="c.slug" type="button" :aria-pressed="activeTags.includes(c.slug)"
                class="btn btn-ghost h-8 px-3 gap-1.5 text-[13px] font-normal"
                @click="toggleTag(c.slug)">
                <Icon v-if="activeTags.includes(c.slug)" name="lucide:check" size="14" class="text-brand" />
                {{ c.label }}
              </button>
            </div>
          </div>
          <!-- What the filter is showing; only while one is on. Two or more people: together or either. -->
          <div v-if="filterKey" class="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-8">
            <p aria-live="polite" class="text-sm text-ink-2 tabular-nums">
              <template v-if="whoNames.length"><span class="font-medium text-ink">{{ joinNames(whoNames, mode === 'any' ? 'or' : 'and') }}</span><template v-if="resultCount"> · </template></template>
              <template v-if="resultCount || (resultCount === 0 && !whoNames.length)">{{ resultCount?.toLocaleString('en-US') }} photo{{ resultCount === 1 ? '' : 's' }}</template>
            </p>
            <div v-if="who.length > 1" role="group" aria-label="Photos with" class="seg p-0.5">
              <button v-for="[m, label] in ([['all', 'Together'], ['any', 'Either']] as const)" :key="m" type="button" :aria-pressed="mode === m"
                class="h-7 px-3 text-[13px]"
                @click="either = m === 'any'">{{ label }}</button>
            </div>
          </div>
        </div>

        <!-- Browse v2: set/filter picked before the full manifest arrived (SSR only shipped the URL's view) -->
        <div v-if="isV2 && manifest && !gridImages" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          <div v-for="i in 10" :key="i" class="skel aspect-[4/5]"></div>
        </div>

        <!-- Browse v2: search/chips matched nothing in this set -->
        <div v-else-if="isV2 && manifest && filterKey && gridImages?.length === 0" class="py-16 px-4 text-center">
          <span class="mx-auto mb-4 w-12 h-12 rounded-full bg-inset text-ink-3 flex items-center justify-center" aria-hidden="true">
            <Icon :name="whoNames.length ? 'lucide:users' : 'lucide:search'" size="20" />
          </span>
          <p class="text-lg text-ink text-balance">{{ zeroTitle }}</p>
          <p v-if="suggestion" class="mt-2 text-sm text-ink-2">
            Did you mean <button type="button" class="min-h-6 font-medium text-brand underline underline-offset-2"
              @click="setQuery(suggestion)">{{ suggestion }}</button>?
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button v-if="eitherCount" type="button" class="btn btn-primary tabular-nums"
              @click="either = true">Show {{ joinNames(whoNames, 'or') }} · {{ eitherCount.toLocaleString('en-US') }}</button>
            <button type="button" class="btn btn-ghost"
              @click="clearFilters">{{ activeTags.length || activePeople.length ? 'Clear filters' : 'Clear search' }}</button>
          </div>
        </div>

        <!-- Browse v2: virtualized grid over the full manifest -->
        <div v-else-if="isV2 && manifest && gridImages && (showFavoritesOnly ? gridImages.some(i => v2Favs.has(i.id)) : gridImages.length > 0)"
          v-bind="sets.length ? { id: 'set-panel', role: 'tabpanel', 'aria-labelledby': `set-tab-${selectedSet ?? 'all'}` } : {}">
          <BrowseGrid :token="token" :images="gridImages" :base="manifest.base" :favs="v2Favs" :comments="v2Comments"
            :counts="v2Counts" :client-name="clientName" :favorites-only="showFavoritesOnly" :stack-bursts="stackBursts"
            :event-date="manifest.album.eventDate" :labels="manifest.labels" :set-id="viewKey"
            :sticky-top="sets.length ? 56 : 0" :people="full ? people : undefined" @person="showPerson" @favorite="toggleFavoriteV2" @comment="openCommentSidebarV2"
            @heart="showHeartAnimation" />
        </div>

        <!-- Empty State -->
        <div v-else-if="images.length === 0"
          class="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
          <span class="mb-5 w-14 h-14 rounded-full bg-inset flex items-center justify-center" aria-hidden="true"
            :class="showFavoritesOnly ? 'text-heart' : 'text-ink-3'">
            <Icon :name="showFavoritesOnly ? 'lucide:heart' : 'lucide:image'" size="24" />
          </span>
          <h2 class="text-xl text-ink mb-2">
            {{ showFavoritesOnly ? 'No favorites yet' : 'No photos yet' }}
          </h2>
          <p class="text-ink-2 max-w-xs">
            <span v-if="showFavoritesOnly">Tap the heart on a photo you love. It will wait for you here.</span>
            <span v-else>Your photographer has not added photos to this album yet.</span>
          </p>
          <button v-if="showFavoritesOnly" @click="toggleShowFavorites" type="button" class="btn btn-ghost mt-6">
            See all photos
          </button>
        </div>

        <!-- Image Grid (Photoswipe) -->
        <div v-else id="gallery" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <a v-for="(image, index) in images" :key="image.id" :href="image.url" :data-pswp-width="image.width"
            :data-pswp-height="image.height" target="_blank"
            class="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 block">
            <img :src="image.thumbnailUrl || image.url" :alt="image.originalFilename"
              :loading="index < 20 ? 'eager' : 'lazy'" :fetchpriority="index < 20 ? 'high' : 'auto'" decoding="async"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

            <!-- Gradient Overlay -->
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            </div>

            <!-- Scrim Overlay for Buttons -->
            <div
              class="absolute top-0 right-0 w-80 h-20 bg-gradient-to-b from-black/30 via-black/15 to-transparent pointer-events-none">
            </div>

            <!-- Favorite Button (Overlay) -->
            <button @click.stop.prevent="toggleFavorite(image)"
              class="absolute top-3 right-3 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 px-2 gap-1.5 min-w-8"
              :class="[
                pendingFavorites.has(image.id) ? 'opacity-70 cursor-wait' : '',
                image.userFavorite
                  ? 'bg-rose-500 text-white shadow-lg'
                  : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'
              ]" :disabled="pendingFavorites.has(image.id)">
              <Icon name="lucide:heart" size="14" class="shrink-0"
                :class="{ 'animate-pulse': pendingFavorites.has(image.id) }"
                :fill="image.userFavorite || image.favoriteCount > 0 ? 'currentColor' : 'none'" />
              <span v-if="image.favoriteCount > 0" class="text-xs font-bold">{{ image.favoriteCount }}</span>
            </button>

            <!-- Note Indicator (Overlay) -->
            <button @click.stop.prevent="openCommentSidebar(image)"
              class="absolute top-3 right-14 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 px-2 gap-1.5 min-w-8"
              :class="image.userFavorite?.notes
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'">
              <Icon name="lucide:message-square" size="14" class="shrink-0" fill="currentColor" />
              <span v-if="image.notesCount && image.notesCount > 0" class="text-xs font-bold">{{ image.notesCount
                }}</span>
            </button>

            <!-- Filename (Overlay) -->
            <div
              class="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p class="text-white text-xs font-medium truncate">{{ image.originalFilename }}</p>
            </div>
          </a>
        </div>

        <!-- Loading More Indicator -->
        <div v-if="loadingMore" class="py-8 flex justify-center">
          <div class="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    </div>

    <!-- Client Name Modal: who is choosing, so the photographer can tell whose hearts are whose.
         Plain dim, no blur: it opens over the first photos on a phone, while they still load. -->
    <Teleport to="body">
      <div v-if="showNameModal"
        class="gallery fixed inset-0 z-[200000] bg-ink/55 flex items-end sm:items-center justify-center sm:p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="name-title"
          class="bg-card rounded-t-card sm:rounded-card shadow-float max-w-md w-full px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 animate-fade-in">
          <div class="text-center mb-6">
            <h2 id="name-title" class="text-[26px] leading-tight tracking-[-0.015em] text-ink mb-2">Who's choosing?</h2>
            <p class="text-ink-2 text-[15px] text-balance">
              {{ albumInfo?.ownerName || 'Your photographer' }} sees your hearts and notes under this name.
            </p>
          </div>

          <form @submit.prevent="saveName">
            <!-- Animal Carousel -->
            <div class="mb-6">
              <p id="animal-label" class="text-[13px] text-ink-3 text-center">Pick an animal</p>

              <div class="relative flex items-center justify-center h-40" role="group" aria-labelledby="animal-label">
                <button type="button" @click="prevAnimal" aria-label="Previous animal" class="icon-btn absolute left-0 z-10">
                  <Icon name="lucide:chevron-left" size="18" />
                </button>

                <!-- Carousel Window -->
                <div class="overflow-hidden w-full px-10 py-6">
                  <div class="flex items-center justify-center">
                    <div v-for="(animal, index) in visibleAnimals" :key="animal?.name || index"
                      @click="selectAnimal(index)" :aria-hidden="index !== 1 || undefined"
                      class="flex flex-col items-center justify-center cursor-pointer transition-[transform,opacity] duration-300 px-2"
                      :class="index === 1 ? 'scale-125 opacity-100 z-10' : 'scale-75 opacity-50'">
                      <template v-if="animal">
                        <div class="text-6xl mb-2" :class="{ 'animate-bounce-subtle': index === 1 }">
                          {{ animal.emoji }}
                        </div>
                        <div class="text-xs font-medium capitalize text-ink" :class="{ invisible: index !== 1 }"
                          :aria-live="index === 1 ? 'polite' : undefined">
                          {{ animal.name }}
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

                <button type="button" @click="nextAnimal" aria-label="Next animal" class="icon-btn absolute right-0 z-10">
                  <Icon name="lucide:chevron-right" size="18" />
                </button>
              </div>
            </div>

            <!-- Name Input -->
            <label for="client-name" class="block text-[13px] text-ink-3 mb-1.5">Your name</label>
            <div class="relative mb-4">
              <Icon name="lucide:user" size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
              <input id="client-name" v-model="nameInput" type="text" placeholder="Asha" autocomplete="given-name"
                class="field h-13 pl-11 pr-4 text-[17px]"
                autofocus required minlength="1" maxlength="50" />
            </div>

            <!-- Never disabled: an empty submit lands on the required field, which says what is missing -->
            <button type="submit" class="btn btn-primary w-full h-12 text-base">
              Start browsing
            </button>

            <p class="mt-5 text-center text-[13px] text-ink-3 leading-relaxed max-w-xs mx-auto text-balance">
              Use the same name and animal on your other devices to see your hearts there too.
            </p>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Comment Sidebar -->
    <CommentSidebar :is-open="showCommentSidebar" :image="currentCommentImage" :client-name="clientName"
      :loading="commentLoading" @close="closeCommentSidebar" @submit="handleSubmitComment" />

    <!-- Double Tap Heart Animation -->
    <Teleport to="body">
      <div v-for="anim in heartAnimations" :key="anim.id" class="fixed pointer-events-none z-[200000]"
        :style="{ left: anim.x + 'px', top: anim.y + 'px' }">
        <div class="heart-burst">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" class="text-heart"
            viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE -->
            <path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676a.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
          </svg>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { animals } from '~/utils/animalNames'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import CommentSidebar from '~/components/CommentSidebar.vue'
import BrowseGrid from '~/components/BrowseGrid.vue'
import SetTabs from '~/components/SetTabs.vue'
import type { ShareManifest } from '~/composables/useApi'
import { useShareStore } from '~/stores/share'
import { andIds, avatarCrop, browseHead, filterIds, joinNames, peopleIds, queryPeople, resolvePeople, mergeFeedback, parseTags, resolveSets, setImages, tagEntries, tagIndex, tagLabel, topTags, type BrowsePerson, type BrowseSet, PSWP_BASE_OPTIONS, renderLightboxButtons, thumbUrl, toShareImage, type ShareComment } from '~/utils/browse'
import { TAG_VOCAB } from '~/utils/tag-vocab'

// Disable default layout for this page
definePageMeta({
  layout: false
})



const route = useRoute()
const api = useApi()
const shareStore = useShareStore()
const token = route.params.token as string

// Browse v2 (virtualized grid over the manifest) is opt-in via ?browse=v2, or via an album-level
// browseV2 flag that redirects here (see below). Default path is untouched: one share fetch, no manifest.
const isV2 = route.query.browse === 'v2'

// Periodic flush starts in onMounted, after clientName loads.

// Flush changes on leave/close
onBeforeUnmount(() => {
  shareStore.stopPeriodicFlush()
  if (clientName.value) {
    shareStore.flushChanges(token, clientName.value)
  }
})

// Also handle browser close/refresh
if (import.meta.client) {
  window.addEventListener('beforeunload', () => {
    if (clientName.value) {
      shareStore.flushChanges(token, clientName.value)
    }
  })
}

// Types from API
type AlbumData = NonNullable<Awaited<ReturnType<typeof api.getAlbum>>['data']>
type ImageData = AlbumData['images'][number] & { notesCount?: number }

// Server-side data fetching
// Use limit 40 to render only 40 images first
const { data: albumData } = await useAsyncData(
  `album-${token}`,
  () => api.getAlbum(token, 1, undefined, false, 40),
  {
    // Don't watch route or other reactive refs automatically unless specified
    // We handle client-side updates manually
    immediate: !isV2
  }
)

// Album-level opt-in: if the share response carries album.browseV2, hop to ?browse=v2.
// Zero cost for albums without the flag.
if (!isV2 && albumData.value?.data?.album.browseV2) {
  const query = new URLSearchParams(route.query as Record<string, string>)
  query.set('browse', 'v2')
  await navigateTo(`${route.path}?${query}`, { replace: true, external: true })
}

// v2 SSR: only the first rows go into the payload (LCP); the full manifest is fetched on mount
// (CDN/browser-cached via ETag) so 10k images don't bloat the HTML.
const V2_SSR_IMAGES = 15
const CHIPS = 8
// Tag search state comes from ?q= / ?tags= so SSR renders the filtered first rows.
const filterKeyOf = (q: string, tags: string[], people: string[], either: boolean) =>
  (q || tags.length || people.length ? `${q}|${tags.join(',')}|${people.join(',')}${either ? '|either' : ''}` : '')
const { data: manifestHead } = await useAsyncData(
  `manifest-${token}`,
  async () => {
    const m = await api.getManifest(token)
    if (!m) return null
    // Sets resolved here (chips render from SSR, ids stripped: the full manifest brings them).
    // The head is the ?set= set's first tiles (+ burst frames) with moment labels from that whole set.
    const resolved = resolveSets(m.sets ?? [], m.images)
    const head = resolved.find(s => s.id === route.query.set)
    const scope = head ? setImages(m.images, head) : m.images
    // Tags: chips + the ?q=/?tags= filter, so search UI and filtered rows are in the SSR HTML.
    const idx = tagIndex(m.images)
    const q = idx.size && typeof route.query.q === 'string' ? route.query.q.trim() : ''
    const tags = idx.size ? parseTags(route.query.tags) : []
    // People: ?people= ids of visible people only (unknown ones are ignored, as on the client).
    const people = resolvePeople(m.people ?? [], m.images)
    // Names typed in ?q= ("nani cake") filter by that person; the rest of the query searches tags.
    const picked = parseTags(route.query.people).filter(id => people.some(p => p.id === id))
    const lifted = queryPeople(q, people)
    const who = [...new Set([...picked, ...lifted.ids])]
    const either = route.query.either === '1' && who.length > 1
    const inScope = new Set(scope.map(i => i.id))
    let shown = scope
    let matchCount: number | null = null
    if (q || tags.length || who.length) {
      const search = lifted.rest ? (await import('~/utils/search')).createTagSearch(tagEntries(idx.keys(), TAG_VOCAB)) : null
      const ids = andIds(filterIds(idx, [...(search ? search.groups(lifted.rest) : []), ...tags.map(t => [t])]), peopleIds(people, who, either ? 'any' : 'all'))
      if (ids) shown = scope.filter(i => ids.has(i.id))
      matchCount = shown.length
    }
    const { images, labels } = browseHead(shown, V2_SSR_IMAGES, m.album.eventDate)
    return {
      ...m, images, labels, sets: [], people: [],
      resolved: resolved.map(s => ({ ...s, ids: [] })),
      resolvedPeople: people.map(p => ({ ...p, ids: [] })),
      headSet: head?.id ?? null,
      total: m.images.length,
      hasBursts: m.images.some(i => i.b !== null), // whole album, so the switch is in the SSR HTML (no shift)
      hasTags: idx.size > 0,
      chips: idx.size ? topTags(scope, CHIPS, tags).top : [],
      headFilter: filterKeyOf(q, tags, picked, either),
      scopePeople: people.filter(p => p.ids.some(id => inScope.has(id))).map(p => p.id), // faces shown for the head's set
      matchCount,
    }
  },
  { immediate: isV2 }
)
type ManifestHead = {
  labels: Record<string, string>; resolved: BrowseSet[]; resolvedPeople: BrowsePerson[]; headSet: string | null; total: number; hasBursts: boolean
  hasTags: boolean; chips: { slug: string; count: number }[]; headFilter: string; matchCount: number | null; scopePeople: string[]
}
const manifest = shallowRef<ShareManifest & Partial<ManifestHead> | null>(manifestHead.value ?? null)
const stackBursts = ref(true)
const hasBursts = computed(() => manifest.value?.hasBursts ?? !!manifest.value?.images.some(i => i.b !== null))
const allCount = computed(() => manifest.value?.total ?? manifest.value?.images.length ?? 0)

// Sets: chip bar + filter. Selection lives in ?set= (replaceState, so no navigation/refetch).
const sets = computed(() => manifest.value?.resolved ?? resolveSets(manifest.value?.sets ?? [], manifest.value?.images ?? []))
const selectedSet = ref<string | null>(manifest.value?.headSet ?? null)
const full = computed(() => (manifest.value && !manifest.value.labels ? manifest.value : null)) // full manifest, not the SSR head
// Images of the selected set (full manifest only).
const scopeImages = computed(() => {
  const m = full.value
  if (!m) return null
  const s = sets.value.find(s => s.id === selectedSet.value)
  return s ? setImages(m.images, s) : m.images
})

// People: a row of faces above the search (who), apart from the tag chips (what). Picked faces (?people=)
// plus names typed in the search make `who`; together (AND, default) or either (OR, ?either=1).
// Both AND with set + search + tags.
const people = computed(() => manifest.value?.resolvedPeople ?? resolvePeople(manifest.value?.people ?? [], manifest.value?.images ?? []))
const activePeople = ref(parseTags(route.query.people).filter(id => people.value.some(p => p.id === id)))
watch(people, list => { activePeople.value = activePeople.value.filter(id => list.some(p => p.id === id)) })
function togglePerson(id: string) {
  activePeople.value = activePeople.value.includes(id) ? activePeople.value.filter(p => p !== id) : [...activePeople.value, id]
}
const either = ref(route.query.either === '1')

// Tag search: input debounced into `query`; chips in `activeTags`. The vocabulary index (minisearch)
// is a lazy chunk, loaded on first focus/query; slug -> id sets are built once per manifest.
const qInput = ref(typeof route.query.q === 'string' ? route.query.q : '')
const query = ref(qInput.value.trim())
const activeTags = ref(parseTags(route.query.tags))
let qTimer: ReturnType<typeof setTimeout> | undefined
watch(qInput, v => {
  clearTimeout(qTimer)
  qTimer = setTimeout(() => { query.value = v.trim() }, 120)
})
const tagIdx = computed(() => (full.value ? tagIndex(full.value.images) : null))
const hasTags = computed(() => manifest.value?.hasTags ?? (tagIdx.value?.size ?? 0) > 0)
const searchMod = shallowRef<typeof import('~/utils/search') | null>(null)
const loadSearch = async () => { searchMod.value ??= await import('~/utils/search') }
watch(query, q => { if (q) loadSearch() })
const searcher = computed(() => (searchMod.value && tagIdx.value ? searchMod.value.createTagSearch(tagEntries(tagIdx.value.keys(), TAG_VOCAB)) : null))
const lifted = computed(() => (hasTags.value ? queryPeople(query.value, people.value) : { ids: [], rest: '' }))
const who = computed(() => [...new Set([...activePeople.value, ...lifted.value.ids])])
const mode = computed(() => (either.value && who.value.length > 1 ? 'any' : 'all'))
watch(() => who.value.length, n => { if (n < 2) either.value = false })
const filterKey = computed(() => filterKeyOf(hasTags.value ? query.value : '', hasTags.value ? activeTags.value : [], activePeople.value, mode.value === 'any'))
// Tag part of the filter: null = none; undefined = index not ready yet.
const tagIds = computed(() => {
  if (!tagIdx.value) return undefined
  if (!hasTags.value) return null
  const rest = lifted.value.rest
  if (rest && !searcher.value) return undefined
  return filterIds(tagIdx.value, [...(rest ? searcher.value!.groups(rest) : []), ...activeTags.value.map(t => [t])])
})
// null = no filter; undefined = index not ready yet.
const matchIds = computed(() => {
  if (!filterKey.value) return null
  const t = tagIds.value
  return t === undefined ? undefined : andIds(t, peopleIds(people.value, who.value, mode.value))
})
// Faces offered: people with photos in the selected set (picked ones always stay, so they can be unpicked).
const stripPeople = computed(() => {
  const m = manifest.value
  const scope = scopeImages.value
  const ids = scope && scope !== full.value?.images ? new Set(scope.map(i => i.id)) : null
  const has = (p: BrowsePerson) => activePeople.value.includes(p.id) || (ids ? p.ids.some(id => ids.has(id))
    : scope || !m?.scopePeople || m.headSet !== selectedSet.value || m.scopePeople.includes(p.id))
  return people.value.filter(has)
})
const whoNames = computed(() => who.value.map(id => people.value.find(p => p.id === id)?.name ?? ''))
const tagStats = computed(() => (scopeImages.value && hasTags.value ? topTags(scopeImages.value, CHIPS, activeTags.value) : null))
const chips = computed(() => (tagStats.value?.top ?? manifest.value?.chips ?? []).map(c => ({ ...c, label: tagLabel(c.slug, TAG_VOCAB) })))
function toggleTag(slug: string) {
  activeTags.value = activeTags.value.includes(slug) ? activeTags.value.filter(t => t !== slug) : [...activeTags.value, slug]
}
function setQuery(v: string) {
  clearTimeout(qTimer)
  qInput.value = v
  query.value = v.trim()
}

// What the grid shows: the selected set, filtered by search + chips. Null while not computable yet
// (only the SSR head of another set/filter is here, or the search index is loading).
const gridImages = computed(() => {
  const m = manifest.value
  if (!m) return null
  if (m.labels) return m.headSet === selectedSet.value && m.headFilter === filterKey.value ? m.images : null
  const ids = matchIds.value
  if (ids === undefined) return null
  return ids ? scopeImages.value!.filter(i => ids.has(i.id)) : scopeImages.value
})
const resultCount = computed(() => {
  if (!filterKey.value || !gridImages.value) return null
  return manifest.value?.labels ? manifest.value.matchCount : gridImages.value.length
})
const suggestion = computed(() => {
  if (resultCount.value !== 0 || !lifted.value.rest || !searcher.value || !tagStats.value) return null
  const slug = searcher.value.suggest(lifted.value.rest, s => tagStats.value!.counts.has(s))
  return slug && tagLabel(slug, TAG_VOCAB)
})
// Nothing together: offer either, with its count (computed only in this empty state).
const eitherCount = computed(() => {
  const t = tagIds.value
  if (resultCount.value !== 0 || mode.value === 'any' || who.value.length < 2 || !scopeImages.value || t === undefined) return 0
  const ids = andIds(t, peopleIds(people.value, who.value, 'any'))!
  return scopeImages.value.filter(i => ids.has(i.id)).length
})
const zeroTitle = computed(() => {
  const n = whoNames.value
  if (!n.length) return 'No photos match'
  const searching = hasTags.value && (activeTags.value.length > 0 || !!lifted.value.rest)
  const set = sets.value.find(s => s.id === selectedSet.value)?.name
  return `No photos of ${joinNames(n, mode.value === 'any' ? 'or' : 'and')}${n.length > 1 && mode.value === 'all' ? ' together' : ''}`
    + (searching ? ' match this search' : set ? ` in ${set}` : '')
})
// Search panel (field + tag chips): behind the set row's search button when the album has sets, else always
// shown (no row to hold the button). Open from SSR when ?q= or ?tags= is on, so it never pops in.
const searchOpen = ref(!!(typeof route.query.q === 'string' && route.query.q.trim()) || parseTags(route.query.tags).length > 0)
const searchActive = computed(() => !!qInput.value.trim() || activeTags.value.length > 0)
const searchShown = computed(() => !sets.value.length || searchOpen.value || searchActive.value)
const focusSearch = () => nextTick(() => {
  const el = document.getElementById('photo-search') as HTMLInputElement | null
  if (!el) return
  // Opened from deep in the grid: bring the panel under the sticky row first.
  const top = el.getBoundingClientRect().top
  if (top < 64 || top > window.innerHeight - 80) window.scrollTo({ top: top + window.scrollY - 64, behavior: 'instant' })
  el.focus({ preventScroll: true })
})
function toggleSearch() {
  if (searchShown.value && !searchActive.value) searchOpen.value = false
  else { searchOpen.value = true; focusSearch() }
}
// Esc: clear first; on an empty field, close (back to the button).
function onSearchEsc() {
  if (qInput.value) return setQuery('')
  if (!sets.value.length || searchActive.value) return
  searchOpen.value = false
  nextTick(() => document.querySelector<HTMLElement>('[aria-controls="search-panel"]')?.focus())
}
function clearFilters() {
  setQuery('')
  activeTags.value = []
  activePeople.value = []
}
// Lightbox face tapped: that person's photos (in the selected set), from the top of the filters.
function showPerson(id: string) {
  clearFilters()
  activePeople.value = [id]
  nextTick(() => {
    const el = document.getElementById('people-strip')
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (sets.value.length ? 64 : 8), behavior: 'instant' })
  })
}
// Scroll position is saved per view (set + filter); a new view starts at the top.
const viewKey = computed(() => [selectedSet.value, filterKey.value].filter(Boolean).join('|') || null)

watch(sets, list => { if (selectedSet.value && !list.some(s => s.id === selectedSet.value)) selectedSet.value = null })
watch([selectedSet, query, activeTags, activePeople, mode], ([id, q, tags, picked, m]) => {
  const url = new URL(window.location.href)
  for (const [k, v] of [['set', id], ['q', q], ['tags', tags.join(',')], ['people', picked.join(',')], ['either', m === 'any' ? '1' : '']] as const) {
    if (v) url.searchParams.set(k, v)
    else url.searchParams.delete(k)
  }
  window.history.replaceState(window.history.state, '', url)
})
const v2Favs = reactive(new Set<number>())
const v2Comments = reactive(new Map<number, ShareComment[]>())
const v2Counts = reactive(new Map<number, number>()) // favorites per image, all clients

// Initialize state from SSR data
const loading = ref(false)
const error = ref(isV2 ? !manifest.value : !albumData.value?.success)
const albumInfo = ref<AlbumData['album'] | null>(
  isV2
    ? (manifest.value && { ...manifest.value.album, shareLinkToken: token, favoritedPhotosCount: 0, ownerName: manifest.value.album.ownerName ?? '' })
    : albumData.value?.data?.album || null
)
const images = ref<ImageData[]>(albumData.value?.data?.images || [])
const pagination = ref<AlbumData['pagination'] | null>(albumData.value?.data?.pagination || null)

// Preload first 40 images for LCP and preconnect to CDN
if (images.value.length > 0) {
  const firstImage = images.value[0]
  const imageUrl = firstImage?.thumbnailUrl || firstImage?.url
  let imageDomain = ''
  try {
    if (imageUrl) {
      const urlObj = new URL(imageUrl, useRuntimeConfig().public.apiBase)
      imageDomain = urlObj.origin
    }
  } catch (e) { /* ignore */ }

  useHead({
    link: [
      ...(imageDomain ? [{
        rel: 'preconnect',
        href: imageDomain,
        crossorigin: 'anonymous' as const
      }] : []),
      ...images.value.slice(0, 40).map(img => ({
        rel: 'preload',
        as: 'image' as const,
        href: img.thumbnailUrl || img.url
      }))
    ]
  })
}

// v2: preconnect to the image base + preload the first row
if (isV2 && manifest.value?.images.length) {
  const { base, images: head } = manifest.value
  let imageDomain = ''
  try { imageDomain = new URL(base, useRuntimeConfig().public.apiBase).origin } catch (e) { /* ignore */ }
  useHead({
    link: [
      ...(imageDomain ? [{ rel: 'preconnect', href: imageDomain, crossorigin: 'anonymous' as const }] : []),
      ...head.slice(0, 5).map(img => ({
        rel: 'preload',
        as: 'image' as const,
        href: thumbUrl(base, img),
        fetchpriority: 'high' as const
      }))
    ]
  })
}

const showFavoritesOnly = ref(false)
const pendingFavorites = ref<Set<number>>(new Set())
const showNameModal = ref(false)
const nameInput = ref('')
const selectedAnimalIndex = ref(0)
const loadingMore = ref(false)
const gridLoading = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)
let lightbox: PhotoSwipeLightbox | null = null

// Double-tap detection state
const lastTapTime = ref(0)
const lastTapPosition = ref({ x: 0, y: 0 })
const DOUBLE_TAP_DELAY = 300 // ms between taps to count as double-tap

// Heart animation state
const heartAnimations = ref<Array<{ id: number; x: number; y: number }>>([])
let animationIdCounter = 0

// Pagination threshold for loading next page (75%)
const LOAD_THRESHOLD = 0.75

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
  if (isV2) return // BrowseGrid filters client-side
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
  const scrollPercentage = scrollTop / (scrollHeight - clientHeight)

  // Trigger at 75% scroll
  if (scrollPercentage >= LOAD_THRESHOLD) {
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

    // Wait for Vue to update DOM
    // PhotoSwipe filters will automatically pick up the new images
    await nextTick()
  }

  loadingMore.value = false
}

// Check if we should load more based on current position
async function loadMoreIfNeeded(currentIndex: number, totalItems: number) {
  if (!pagination.value?.hasNextPage || loadingMore.value) return

  // Load more when we've viewed 75% of loaded items
  if (currentIndex >= totalItems * LOAD_THRESHOLD) {
    await loadMoreImages()
  }
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

  const isFavorited = !!image.userFavorite
  const index = images.value.findIndex(img => img.id === image.id)

  if (index === -1) return

  // Optimistic update - update UI immediately
  if (images.value[index]) {
    if (isFavorited) {
      // Removing favorite
      images.value[index].userFavorite = null
      images.value[index].favoriteCount = Math.max(0, images.value[index].favoriteCount - 1)
      shareStore.addChange(image.id, 'unfavorite')
    } else {
      // Adding favorite
      images.value[index].userFavorite = {
        id: 0, // Temp ID
        notes: '',
        createdAt: new Date().toISOString()
      }
      images.value[index].favoriteCount += 1
      shareStore.addChange(image.id, 'favorite')
    }
  }

  // Update lightbox UI immediately for instant feedback
  updateLightboxUI()
}

async function handleSubmitComment(note: string) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }

  if (!currentCommentImage.value) return

  if (isV2) {
    const id = currentCommentImage.value.id
    shareStore.addChange(id, 'comment', note)
    if (!v2Favs.has(id)) {
      v2Favs.add(id) // Implicit favorite, as in v1
      v2Counts.set(id, (v2Counts.get(id) ?? 0) + 1)
      shareStore.addChange(id, 'favorite')
    }
    // One comment per user per image — replace existing.
    const others = (v2Comments.get(id) ?? []).filter(c => c.clientName !== clientName.value)
    v2Comments.set(id, [...others, { clientName: clientName.value, notes: note, createdAt: new Date().toISOString() }])
    openCommentSidebarV2(id)
    return
  }

  commentLoading.value = true
  const image = currentCommentImage.value

  // Queue the change
  shareStore.addChange(image.id, 'comment', note)

    // Update local state
    const index = images.value.findIndex(img => img.id === image.id)
    if (index !== -1 && images.value[index]) {
      const updatedImage = images.value[index]
      const isFavorited = !!updatedImage.userFavorite

      // Update userFavorite if it doesn't exist or just update the notes
      if (!updatedImage.userFavorite) {
         updatedImage.userFavorite = {
          id: 0,
          notes: note,
          createdAt: new Date().toISOString()
        }
        updatedImage.favoriteCount += 1 // Implicit favorite
        shareStore.addChange(image.id, 'favorite') // Ensure it's favorited if not already
      } else {
        updatedImage.userFavorite.notes = note
      }


      // Optimistic update for comments list
      const newCommentObj = {
        clientName: clientName.value,
        notes: note,
        createdAt: new Date().toISOString()
      }

      // One comment per user per image — replace existing.
      if (updatedImage.comments) {
          updatedImage.comments = updatedImage.comments.filter(c => c.clientName !== clientName.value)
          updatedImage.comments.push(newCommentObj)
      } else {
        updatedImage.comments = [newCommentObj]
      }

      // Update current image ref for sidebar
      currentCommentImage.value = updatedImage
    }

  commentLoading.value = false
  updateLightboxUI()
}

function updateLightboxUI() {
  if (!lightbox || !lightbox.pswp) return

  const currIndex = lightbox.pswp.currIndex
  const image = images.value[currIndex]
  if (!image) return

  renderLightboxButtons({
    favorited: !!image.userFavorite,
    favCount: image.favoriteCount || 0,
    pending: pendingFavorites.value.has(image.id),
    hasNote: !!image.userFavorite?.notes,
    noteCount: image.notesCount || 0
  })
}

async function fetchAlbum(page = 1, isBackground = false) {
  const token = route.params.token as string
  const result = await api.getAlbum(token, page, clientName.value, showFavoritesOnly.value)

  if (!result.success || !result.data) {
    if (page === 1 && !isBackground) {
      error.value = true
      loading.value = false
    }
    return
  }

  if (page === 1) {
    albumInfo.value = result.data.album
    images.value = result.data.images
    pagination.value = result.data.pagination
    if (!isBackground) {
      loading.value = false
    }

    // Only rebuild the lightbox on a foreground refresh; background updates
    // rely on images.value reactivity.
    await nextTick()

    if (!isBackground) {
      if (lightbox) {
        lightbox.destroy()
        lightbox = null
      }
      initLightbox()
    } else {
        // If background refresh, update UI elements (icons)
        updateLightboxUI()
    }
  } else {
    images.value = [...images.value, ...result.data.images]
    pagination.value = result.data.pagination
  }
}

async function saveName() {
  if (!nameInput.value.trim()) return

  const animal = animals[selectedAnimalIndex.value]
  if (!animal) return

  const cleanName = nameInput.value.trim().toLowerCase().replace(/\s+/g, '')
  const fullName = `${animal.emoji} ${cleanName}-${animal.name}`

  clientName.value = fullName
  localStorage.setItem(CLIENT_NAME_KEY, fullName)
  showNameModal.value = false
  nameInput.value = ''

  // Start periodic flush with new name
  shareStore.startPeriodicFlush(token, clientName.value)

  // Refetch data with new name to sync favorites
  if (isV2) await loadFeedback()
  else await fetchAlbum(1, true)
}

function closeCommentSidebar() {
  showCommentSidebar.value = false
  currentCommentImage.value = null
}

// Double-tap to favorite handler
function handleDoubleTap(x: number, y: number) {
  const currIndex = lightbox?.pswp?.currIndex
  if (currIndex === undefined) return

  const image = images.value[currIndex]
  if (image) {
    // Toggle favorite
    toggleFavorite(image)

    // Show heart animation at tap position
    showHeartAnimation(x, y)
  }
}

// Show heart burst animation at position
function showHeartAnimation(x: number, y: number) {
  const id = animationIdCounter++
  heartAnimations.value.push({ id, x, y })

  // Remove animation after it completes (1.5s)
  setTimeout(() => {
    heartAnimations.value = heartAnimations.value.filter(a => a.id !== id)
  }, 1500)
}

// PhotoSwipe picks up new images automatically via the numItems/itemData filters.

function initLightbox() {
  lightbox = new PhotoSwipeLightbox({
    ...PSWP_BASE_OPTIONS,
    // Keep gallery/children for DOM click interception
    gallery: '#gallery',
    children: 'a',
    pswpModule: () => import('photoswipe'),
  })

  // Filter to tell PhotoSwipe how many items we have (dynamic)
  // This allows newly loaded images to be recognized in the lightbox
  lightbox.addFilter('numItems', (numItems) => {
    // Return the actual number of images we have (including dynamically loaded ones)
    // When images are loaded, the DOM anchors are added, and this filter tells PhotoSwipe about them
    return images.value.length
  })

  // Add Favorite Button
  lightbox.on('uiRegister', () => {
    lightbox!.pswp!.ui!.registerElement({
      name: 'favorite-button',
      title: 'Favorite',
      order: 9,
      isButton: true,
      tagName: 'button',
      html: '<div class="pswp-custom-icon pswp-favorite-icon flex items-center justify-center w-full h-full"></div>',
      onClick: (event, el, pswp) => {
        const currentIndex = pswp.currIndex
        const image = images.value[currentIndex]
        if (image) {
          toggleFavorite(image)
        }
      }
    })

    // Add Notes Button
    lightbox!.pswp!.ui!.registerElement({
      name: 'notes-button',
      title: 'Notes',
      order: 10,
      isButton: true,
      tagName: 'button',
      html: '<div class="pswp-custom-icon pswp-comment-icon flex items-center justify-center w-full h-full"></div>',
      onClick: (event, el, pswp) => {
        const currentIndex = pswp.currIndex
        const image = images.value[currentIndex]
        if (image) {
          openCommentSidebar(image)
        }
      }
    })
  })

  lightbox.on('change', () => {
    updateLightboxUI()

    // Check if we need to load more images (silent pagination)
    if (lightbox?.pswp) {
      const currentIndex = lightbox.pswp.currIndex
      const totalItems = images.value.length
      loadMoreIfNeeded(currentIndex, totalItems)
    }
  })

  lightbox.on('openingAnimationStart', () => {
    updateLightboxUI()
  })

  // Add click event listener for double-tap detection after lightbox is ready
  lightbox.on('afterInit', () => {
    const pswpElement = lightbox?.pswp?.element
    if (pswpElement) {
      pswpElement.addEventListener('click', (e: MouseEvent) => {
        // Don't trigger if clicking on buttons
        if ((e.target as HTMLElement).closest('button')) return

        const now = Date.now()
        const point = { x: e.clientX, y: e.clientY }

        // Check if this is a double-tap (within time and distance threshold)
        if (now - lastTapTime.value < DOUBLE_TAP_DELAY) {
          const distance = Math.hypot(point.x - lastTapPosition.value.x, point.y - lastTapPosition.value.y)
          if (distance < 50) { // Within 50px - same location
            e.preventDefault()
            e.stopPropagation()
            handleDoubleTap(point.x, point.y)
            return
          }
        }

        lastTapTime.value = now
        lastTapPosition.value = point
      })
    }
  })

  lightbox.init()
}

// Comment Sidebar State
const showCommentSidebar = ref(false)
const currentCommentImage = ref<ImageData | null>(null)
const commentLoading = ref(false)

function openCommentSidebar(image: ImageData) {
  currentCommentImage.value = image
  showCommentSidebar.value = true
}

// Browse v2: favorites/comments live in v2Favs/v2Comments/v2Counts (loaded from /feedback); writes
// still go through shareStore's batched queue. Unsynced changes are replayed over the server state
// (read after the response lands) so a reload can't undo a heart or comment made meanwhile.
async function loadFeedback() {
  const fb = await api.getFeedback(token, clientName.value)
  if (!fb) return
  const m = mergeFeedback(fb, shareStore.unsyncedChanges(), clientName.value)
  v2Favs.clear()
  m.favs.forEach(id => v2Favs.add(id))
  v2Counts.clear()
  m.counts.forEach((n, id) => v2Counts.set(id, n))
  v2Comments.clear()
  m.comments.forEach((list, id) => v2Comments.set(id, list))
}

function toggleFavoriteV2(id: number) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }
  const had = v2Favs.has(id)
  if (had) v2Favs.delete(id)
  else v2Favs.add(id)
  v2Counts.set(id, Math.max(0, (v2Counts.get(id) ?? 0) + (had ? -1 : 1)))
  shareStore.addChange(id, had ? 'unfavorite' : 'favorite')
}

function openCommentSidebarV2(id: number) {
  const img = manifest.value?.images.find(i => i.id === id)
  if (!img || !manifest.value) return
  currentCommentImage.value = toShareImage(img, manifest.value.base, v2Favs.has(id), v2Counts.get(id) ?? 0, v2Comments.get(id) ?? [], clientName.value)
  showCommentSidebar.value = true
}



// Load data on mount
onMounted(async () => {
  if (isV2) {
    // Full manifest (SSR only shipped the first rows)
    // With ?q= the search chunk must land with it, or the filtered SSR rows would flash a skeleton.
    Promise.all([api.getManifest(token), query.value && hasTags.value ? loadSearch() : null])
      .then(([m]) => { if (m) manifest.value = m })
    const savedName = localStorage.getItem(CLIENT_NAME_KEY)
    if (savedName) {
      clientName.value = savedName
      shareStore.startPeriodicFlush(token, savedName)
      loadFeedback()
    } else {
      showNameModal.value = true
    }
    return // BrowseGrid owns its lightbox
  }

  // Client-side hydration and updates
  const savedName = localStorage.getItem(CLIENT_NAME_KEY)
  if (savedName) {
    clientName.value = savedName

    // Start periodic flush
    shareStore.startPeriodicFlush(token, savedName)

    // If we have a client name, we need to re-fetch/update to get favorite status
    // But we don't want to flash loading if we already have images
    const result = await api.getAlbum(token, 1, savedName, showFavoritesOnly.value)
    if (result.success && result.data) {
      // Merge data to keep preloaded images visible but update favorites
      images.value = result.data.images
      albumInfo.value = result.data.album
      pagination.value = result.data.pagination
    }
  }

  // If no SSR data and we failed to load on server or client, show error
  if (!albumInfo.value && !loading.value) {
    // If we are here, it might be that useAsyncData failed or returned error
    // Error state is already set by the specific check above
  }

  // Show name modal if no client name
  if (!clientName.value) {
    showNameModal.value = true
  }

  // Initialize lightbox on mount (ensure DOM is ready)
  await nextTick()
  if (images.value.length > 0) {
    // Small delay to ensure ClientOnly has fully rendered the gallery div
    setTimeout(() => {
      initLightbox()
    }, 50)
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
/* The scrubber is teleported outside the inert page root: hide it (and its focus) under a dialog */
body:has([aria-modal="true"]) .moment-scrubber { visibility: hidden; }

/* PhotoSwipe chrome, in the desktop lightbox's look: near-black stage, solid round buttons (no blur over a
   moving photo), white when on. Shared by v1 and v2. */
.pswp { font-family: var(--font-ui); }
.pswp__bg { background: var(--color-night) !important; }
.pswp__top-bar { padding: 0 8px; align-items: center; height: 64px; gap: 8px; }

.pswp__button {
  background: none !important;
  transition: opacity 0.15s ease;
  opacity: 0.9;
}
.pswp__button:hover { opacity: 1; }
.pswp__button:focus-visible { outline: 2px solid var(--color-brand-soft); outline-offset: 2px; }

/* Force all icons to be white */
.pswp__button svg {
  stroke: oklch(92% 0 0) !important;
  fill: none !important;
  width: 20px !important;
  height: 20px !important;
}
/* Your heart: filled, red, on the white "on" button */
.pswp-favorite-icon svg.text-rose-500 {
  stroke: var(--color-heart) !important;
  fill: var(--color-heart) !important;
}
.pswp__button--close,
.pswp__button--zoom,
.pswp__button--favorite-button,
.pswp__button--notes-button {
  background: var(--color-night-2) !important;
  border-radius: 999px;
  min-width: 40px !important;
  width: auto !important;
  height: 40px !important;
  margin: 0 !important;
  padding: 0 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: background-color 0.12s, opacity 0.15s;
}
.pswp__button--close:hover,
.pswp__button--zoom:hover,
.pswp__button--favorite-button:hover,
.pswp__button--notes-button:hover {
  background: oklch(32% 0.005 255) !important;
}
.pswp__button--favorite-button:has(svg.text-rose-500) { background: var(--color-card) !important; }
.pswp__button--favorite-button:has(svg.text-rose-500) span { color: var(--color-ink) !important; }
.pswp__button--notes-button:has(svg.text-indigo-400) svg { stroke: var(--color-brand-soft) !important; fill: var(--color-brand-soft) !important; }

.pswp-custom-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.pswp-custom-icon span { box-shadow: none !important; font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; margin-left: 6px; color: oklch(92% 0 0); }

.pswp__counter {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: oklch(75% 0 0);
  opacity: 1;
  margin: 0 auto 0 8px;
  height: auto;
  line-height: 1;
}

/* Instagram-style Heart Burst Animation */
.heart-burst {
  animation: heartBurst 1.5s ease-out forwards;
  position: relative;
}
@media (prefers-reduced-motion: reduce) {
  .heart-burst { animation: heartFade 0.9s ease-out forwards; }
}
@keyframes heartFade {
  0%, 60% { opacity: 1; transform: translate(-50%, -50%); }
  100% { opacity: 0; transform: translate(-50%, -50%); }
}

@keyframes heartBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0) rotate(-15deg);
  }

  15% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.3) rotate(0deg);
  }

  30% {
    transform: translate(-50%, -50%) scale(0.9) rotate(5deg);
  }

  45% {
    transform: translate(-50%, -50%) scale(1.1) rotate(0deg);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5) rotate(0deg);
  }
}
</style>
