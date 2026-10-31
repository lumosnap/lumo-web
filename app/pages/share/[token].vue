<template>
  <!-- Grey paper, white prints: the album card and the photo sheet sit on the canvas, as in the photographer's app. -->
  <!-- inert under the name prompt and the notes panel: keyboard focus stays in the dialog -->
  <div class="gallery bg-canvas flex flex-col" :class="isV2 ? 'min-h-screen' : 'h-screen overflow-hidden'"
    :inert="showNameModal || showCommentSidebar || triageOpen || !!sheet || undefined">
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

        <!-- The selection the photographer asked for: which list, how far along, when it is due, and the way to
             send it. Every line keeps its height from the first paint (picks arrive after), so the grid never moves. -->
        <section v-if="activeList" aria-labelledby="list-name" class="px-5 pb-4 md:p-4 md:bg-card md:rounded-card flex flex-col gap-3">
          <div v-if="lists.length > 1" role="group" aria-label="Selection" class="-mx-5 px-5 md:mx-0 md:px-0 flex gap-1.5 overflow-x-auto [scrollbar-width:none] md:flex-wrap">
            <button v-for="l in lists" :key="l.id" type="button" class="btn btn-ghost h-8 px-3 text-[13px]" :aria-pressed="l.id === activeList.id"
              @click="activeListId = l.id">
              <Icon v-if="listFb.get(l.id)?.submittedAt" name="lucide:lock" size="13" class="text-ink-3" />{{ l.name }}
            </button>
          </div>
          <div>
            <h2 id="list-name" :class="lists.length > 1 ? 'sr-only' : 'text-[13px] text-ink-3 mb-0.5'">{{ activeList.name }}</h2>
            <!-- Sent or locked: the row turns into a grey banner (same height), the Send button goes -->
            <div class="flex items-center gap-3 h-12 -mx-2.5 px-2.5 rounded-ctl" :class="{ 'bg-inset': lock === 'sent' || lock === 'locked' }">
              <div class="flex-1 min-w-0">
                <p class="text-[17px] leading-6 text-ink tabular-nums">
                  <span class="font-medium">{{ pickedText }}</span><template v-if="maxPicks"> / {{ maxPicks.toLocaleString('en-US') }}</template>
                  <span class="text-ink-2"> picked</span>
                </p>
                <!-- Status: sent (locked), closed (deadline passed), or the time left -->
                <p class="text-[13px] leading-5 truncate flex items-center gap-1"
                  :class="lock ? 'text-ink-2' : deadline?.soon ? 'text-ink font-medium' : 'text-ink-3'">
                  <Icon v-if="lock === 'sent' || lock === 'locked'" name="lucide:lock" size="13" class="shrink-0" />
                  <template v-if="lock === 'sent'">Sent on {{ shortDate(sentAt!) }} · ask {{ owner }} to reopen</template>
                  <template v-else-if="lock === 'locked'">Locked · ask {{ owner }} to reopen</template>
                  <template v-else-if="lock === 'closed'">{{ deadline?.label }} · you can still send</template>
                  <template v-else-if="deadline">{{ deadline.label }}</template>
                  <template v-else>&nbsp;</template>
                </p>
              </div>
              <button v-if="lock !== 'sent' && lock !== 'locked'" type="button" class="btn btn-ghost gap-1.5 shrink-0"
                :aria-label="`Send ${activeList.name} to ${owner}`" @click="openSheet">
                <Icon name="lucide:send" size="16" />Send
              </button>
            </div>
          </div>
          <div v-if="maxPicks" class="h-1 rounded-full bg-inset-2 overflow-hidden" aria-hidden="true">
            <div class="h-full rounded-full bg-brand transition-[width] duration-200" :style="{ width: `${Math.min(100, (picked.size / maxPicks) * 100)}%` }"></div>
          </div>
          <!-- md+: chapter progress in the column, beside the photos; a row opens that chapter. Phones: on the set tabs. -->
          <ul v-if="chapters.length" class="hidden md:flex flex-col -mx-1" aria-label="Chapters">
            <li v-for="c in chapters" :key="c.setId">
              <button type="button" class="w-full h-9 px-2 flex items-center gap-2 rounded-ctl text-sm hover:bg-inset"
                :class="selectedSet === c.setId ? 'bg-brand-wash text-ink' : 'text-ink-2'" :aria-pressed="selectedSet === c.setId"
                @click="selectedSet = selectedSet === c.setId ? null : c.setId">
                <Icon :name="selectedSet === c.setId ? 'lucide:folder-open' : 'lucide:folder'" size="15" :class="selectedSet === c.setId ? 'text-brand' : 'text-ink-3'" />
                <span class="flex-1 min-w-0 truncate text-left">{{ c.name }}</span>
                <span class="tabular-nums" :class="c.picked >= c.max ? 'text-brand' : 'text-ink-3'">{{ picksReady ? c.picked : '–' }} / {{ c.max }}</span>
                <Icon v-if="picksReady && c.picked >= c.max" name="lucide:check" size="14" class="text-brand" />
              </button>
            </li>
          </ul>
        </section>

        <!-- Your picks: all or favorites (lists: all, not picked, picked); bursts stacked or not -->
        <div class="px-5 pb-5 md:p-4 md:bg-card md:rounded-card flex flex-wrap items-center gap-2">
          <div v-if="activeList" class="seg md:w-full" role="group" aria-label="Show">
            <button v-for="[v, label] in VIEWS" :key="v" type="button" class="md:flex-1 md:justify-center px-3" :aria-pressed="view === v" @click="view = v">
              <Icon v-if="v === 'picked'" name="lucide:heart" size="16" :class="view === v ? 'text-heart' : ''" />{{ label }}
            </button>
          </div>
          <div v-else class="seg md:w-full" role="group" aria-label="Show">
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

        <!-- md+: who and what as cards in the column, as in the photographer's app. They stay in view while the
             photos scroll, so a filter is one click from anywhere. Phones keep faces in the sheet (below). -->
        <section v-if="isV2 && manifest && stripPeople.length" aria-labelledby="people-card-h" class="hidden md:block p-4 bg-card rounded-card">
          <h2 id="people-card-h" class="px-1 mb-2 text-[13px] text-ink-3">People</h2>
          <div role="group" aria-labelledby="people-card-h" class="grid grid-cols-4 gap-y-1">
            <PersonFace v-for="p in stripPeople" :key="p.id" class="w-full" :person="p" :base="manifest.base"
              :picked="activePeople.includes(p.id)" :lifted="lifted.ids.includes(p.id)" @click="togglePerson(p.id)" />
          </div>
        </section>
        <section v-if="isV2 && manifest && hasTags && chips.length" aria-labelledby="tags-card-h" class="hidden md:block p-4 bg-card rounded-card">
          <h2 id="tags-card-h" class="px-1 mb-2.5 text-[13px] text-ink-3">Tags</h2>
          <div role="group" aria-labelledby="tags-card-h" class="flex flex-wrap gap-1.5">
            <button v-for="c in chips" :key="c.slug" type="button" :aria-pressed="activeTags.includes(c.slug)"
              class="btn btn-ghost h-8 px-3 gap-1.5 text-[13px] font-normal" @click="toggleTag(c.slug)">
              <Icon v-if="activeTags.includes(c.slug)" name="lucide:check" size="14" class="text-brand" />
              {{ c.label }}<span class="n">{{ c.count.toLocaleString('en-US') }}</span>
            </button>
          </div>
        </section>

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
          <SetTabs v-model="selectedSet" :sets="sets" :total="allCount" :progress="chapterMap" :ready="picksReady"
            panel="set-panel" class="flex-1 min-w-0" />
          <!-- Search and tags live behind this button, at the row's trailing edge: reachable from anywhere in the album.
               Open with an active search, it focuses the field instead of hiding a filter that is on.
               Phones: a labelled "Filter" pill, because a magnifier did not say "tags are here". md+: the tags are a
               card in the column, so the button is search only. -->
          <template v-if="hasTags">
            <button type="button" aria-controls="search-panel" :aria-expanded="searchShown"
              class="btn btn-ghost px-3 gap-1.5 md:hidden"
              :class="searchShown && !searchActive ? 'bg-ink text-card border-ink hover:bg-ink' : activeTags.length || searchActive ? 'bg-brand-wash border-brand-soft text-brand' : ''"
              @click="toggleSearch">
              <Icon :name="searchShown && !searchActive ? 'lucide:x' : 'lucide:list-filter'" size="16" />Filter
            </button>
            <button type="button" aria-controls="search-panel" :aria-expanded="searchShown"
              :aria-label="searchShown && !searchActive ? 'Close search' : 'Search photos'"
              class="icon-btn hidden md:inline-grid" :class="{ on: searchActive, 'bg-ink text-card hover:bg-ink hover:text-card': searchShown && !searchActive }"
              @click="toggleSearch">
              <Icon :name="searchShown && !searchActive ? 'lucide:x' : 'lucide:search'" size="18" />
            </button>
          </template>
        </div>

        <!-- Browse v2 filters, inside the selected set. Who (faces) sits apart from what (search + tag chips):
             different questions, different shapes. md+: faces and tags are cards in the column instead.
             What is on shows in the filter bar at the bottom of the sheet. -->
        <div v-if="isV2 && manifest && (stripPeople.length || (hasTags && searchShown))" class="mb-2 flex flex-col gap-3"
          :class="hasTags && searchShown ? '' : 'md:hidden'">
          <div v-if="stripPeople.length" id="people-strip" role="group" aria-label="People"
            class="-mx-3 px-3 flex gap-1 overflow-x-auto [scrollbar-width:none] pt-1 md:hidden">
            <PersonFace v-for="p in stripPeople" :key="p.id" class="w-[4.5rem]" :person="p" :base="manifest.base"
              :picked="activePeople.includes(p.id)" :lifted="lifted.ids.includes(p.id)" @click="togglePerson(p.id)" />
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
            <div v-if="chips.length" role="group" aria-label="Filter by tag" class="-mx-3 px-3 flex gap-2 overflow-x-auto [scrollbar-width:none] md:hidden">
              <button v-for="c in chips" :key="c.slug" type="button" :aria-pressed="activeTags.includes(c.slug)"
                class="btn btn-ghost h-8 px-3 gap-1.5 text-[13px] font-normal"
                @click="toggleTag(c.slug)">
                <Icon v-if="activeTags.includes(c.slug)" name="lucide:check" size="14" class="text-brand" />
                {{ c.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Browse v2: set/filter picked before the full manifest arrived (SSR only shipped the URL's view) -->
        <div v-if="isV2 && manifest && (!gridImages || gridWaits)" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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
        <div v-else-if="isV2 && manifest && gridImages && gridHas"
          v-bind="sets.length ? { id: 'set-panel', role: 'tabpanel', 'aria-labelledby': `set-tab-${selectedSet ?? 'all'}` } : {}">
          <BrowseGrid :token="token" :images="gridImages" :base="manifest.base" :favs="marks" :comments="v2Comments"
            :counts="hasLists ? NO_COUNTS : v2Counts" :client-name="clientName" :only="only" :heart-label="heartLabel" :stack-bursts="stackBursts"
            :event-date="manifest.album.eventDate" :labels="manifest.labels" :set-id="viewKey"
            :sticky-top="sets.length ? 56 : 0" :people="full ? people : undefined" @person="showPerson" @favorite="onHeart" @comment="openCommentSidebarV2"
            @heart="onBurst" />
        </div>

        <!-- Lists: Picked with nothing picked here, or Not picked with everything picked -->
        <div v-else-if="isV2 && activeList && gridImages && only" class="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 pb-24">
          <span class="mb-5 w-14 h-14 rounded-full bg-inset flex items-center justify-center" aria-hidden="true" :class="only === 'in' ? 'text-heart' : 'text-brand'">
            <Icon :name="only === 'in' ? 'lucide:heart' : 'lucide:check'" size="24" />
          </span>
          <h2 class="text-xl text-ink mb-2 text-balance">
            {{ only === 'in' ? `Nothing picked${viewName ? ` in ${viewName}` : ''} yet` : `Every photo${viewName ? ` in ${viewName}` : ''} is picked` }}
          </h2>
          <p v-if="only === 'in'" class="text-ink-2 max-w-xs">Tap the heart on a photo to add it to {{ activeList.name }}.</p>
          <button type="button" class="btn btn-ghost mt-6" @click="view = 'all'">See all photos</button>
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

        <!-- Browse v2: what is filtered, kept in view while the photos scroll. Sticky to the bottom of the window,
             at the end of the sheet: it adds nothing above the grid (no shift when a face is tapped), sits under
             the thumb on a phone, and never stacks under the set bar. One line; the items scroll inside it. -->
        <div v-if="isV2 && (barOn || activeList)" class="sticky z-30 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mt-4 flex flex-col items-center gap-2 pointer-events-none">
          <div v-if="barOn" role="region" aria-label="Filters on"
            class="pointer-events-auto max-w-full min-w-0 h-12 flex items-center gap-1 pl-1.5 pr-1.5 rounded-full bg-card ring-1 ring-line-2 shadow-[0_10px_28px_-10px_oklch(20%_0.01_255/0.3)]">
            <!-- Items scroll sideways; the fade says there is more. The end padding lets the last item clear the fade. -->
            <div class="min-w-0 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] pr-4 [mask-image:linear-gradient(to_left,transparent,black_1rem)]">
              <template v-for="(p, i) in barPeople" :key="p.id">
                <!-- The join word says the mode. Phones: it is also the switch (no room for the two-part toggle). -->
                <span v-if="i" class="hidden md:inline shrink-0 px-0.5 text-[13px] text-ink-3">{{ mode === 'any' ? 'or' : 'and' }}</span>
                <button v-if="i" type="button" class="md:hidden shrink-0 h-9 px-1.5 text-[13px] font-medium text-brand underline decoration-dotted underline-offset-4"
                  :aria-label="mode === 'any' ? 'or: photos with any of them. Switch to together' : 'and: photos with all of them together. Switch to either'"
                  @click="either = mode !== 'any'">{{ mode === 'any' ? 'or' : 'and' }}</button>
                <button type="button" class="fchip pl-1" :aria-label="`Remove ${p.name}`" @click="removePerson(p.id)">
                  <span aria-hidden="true" class="relative w-7 h-7 rounded-full overflow-hidden bg-inset-2 shrink-0">
                    <span class="absolute inset-0 bg-no-repeat"
                      :style="{ backgroundImage: `url(${thumbUrl(manifest!.base, p.cover)})`, ...avatarCrop(p.box, p.cover.w, p.cover.h) }"></span>
                  </span>
                  <span class="max-w-[6rem] md:max-w-[9rem] truncate">{{ p.name }}</span><Icon name="lucide:x" size="14" class="text-ink-3" />
                </button>
              </template>
              <button v-if="barQuery" type="button" class="fchip" :aria-label="`Remove search ${barQuery}`" @click="removeQuery">
                <Icon name="lucide:search" size="14" class="text-ink-3" /><span class="max-w-[9rem] truncate">{{ barQuery }}</span><Icon name="lucide:x" size="14" class="text-ink-3" />
              </button>
              <button v-for="t in activeTags" :key="t" type="button" class="fchip" :aria-label="`Remove tag ${tagLabel(t, TAG_VOCAB)}`" @click="toggleTag(t)">
                {{ tagLabel(t, TAG_VOCAB) }}<Icon name="lucide:x" size="14" class="text-ink-3" />
              </button>
              <button v-if="only" type="button" class="fchip" :aria-label="`Remove ${onlyLabel.toLowerCase()}`" @click="clearOnly">
                <Icon :name="only === 'in' ? 'lucide:heart' : 'lucide:circle-dashed'" size="14" :class="only === 'in' ? 'text-heart' : 'text-ink-3'" />{{ onlyLabel }}<Icon name="lucide:x" size="14" class="text-ink-3" />
              </button>
            </div>
            <span aria-live="polite" class="shrink-0 px-1.5 text-sm text-ink-2 tabular-nums"><template v-if="barCount">{{ barCount.toLocaleString('en-US') }}<span class="max-md:sr-only">&nbsp;photo{{ barCount === 1 ? '' : 's' }}</span></template></span>
            <div v-if="who.length > 1" role="group" aria-label="Photos with" class="seg p-0.5 shrink-0 max-md:hidden">
              <button v-for="[m, label] in ([['all', 'Together'], ['any', 'Either']] as const)" :key="m" type="button" :aria-pressed="mode === m"
                class="h-8 px-2.5 text-[13px]"
                @click="either = m === 'any'">{{ label }}</button>
            </div>
            <button type="button" class="shrink-0 h-9 px-3 rounded-full text-[13px] font-medium text-ink-2 hover:bg-inset hover:text-ink" @click="clearAll">Clear</button>
          </div>
          <!-- Lists: the count stays under the thumb at any depth. The count opens the review sheet;
               "One by one" goes through what is left in this view. -->
          <div v-if="activeList" role="region" aria-label="Your selection"
            class="pointer-events-auto max-w-full h-12 flex items-center gap-1 px-1.5 rounded-full bg-card ring-1 ring-line-2 shadow-[0_10px_28px_-10px_oklch(20%_0.01_255/0.3)]">
            <button type="button" class="h-9 pl-2.5 pr-3 rounded-full flex items-center gap-2 min-w-0 hover:bg-inset"
              :aria-label="`${activeList.name}: ${pickedText}${maxPicks ? ` of ${maxPicks}` : ''} picked. Review and send`" @click="openSheet">
              <Icon v-if="lock === 'sent' || lock === 'locked'" name="lucide:lock" size="15" class="text-ink-3 shrink-0" />
              <svg v-else width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" class="text-heart shrink-0"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
              <span class="text-[15px] font-medium tabular-nums text-ink">{{ counterText }}</span>
              <span class="text-[13px] text-ink-3 truncate max-w-[7rem] md:max-w-[12rem]">{{ activeList.name }}</span>
            </button>
            <template v-if="!lock">
              <span class="w-px h-6 bg-line-2 shrink-0" aria-hidden="true"></span>
              <button id="triage-open" type="button" class="h-9 px-3 rounded-full flex items-center gap-1.5 text-[13px] font-medium text-ink hover:bg-inset disabled:opacity-45"
                :disabled="!canTriage" @click="openTriage">
                <Icon name="lucide:gallery-horizontal-end" size="16" class="text-ink-2" />One by one
              </button>
            </template>
          </div>
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

    <!-- One by one (lists) -->
    <Teleport to="body">
      <TriageView v-if="triageOpen && manifest && activeList" :images="triageList" :base="manifest.base"
        :title="filterKey ? `${viewName ?? 'All photos'}, filtered` : viewName ?? 'All photos'" :list-name="activeList.name" :counter="counterText"
        :blocked="triageBlocked" :can-undo="history.length > 0" :skipped-here="triageSkipped"
        :chapter="selectedSet && chapterMap.get(selectedSet) ? `${chapterMap.get(selectedSet)!.picked} / ${chapterMap.get(selectedSet)!.max} picked` : undefined"
        :next="triageNext?.label" @next="triageNext?.run()"
        @keep="triageKeep" @skip="triageSkip" @undo="triageUndo" @close="closeTriage" @reset="triageReset" />
    </Teleport>

    <!-- Send: what goes to the photographer, then the ending. A bottom sheet on phones, as the name prompt. -->
    <Teleport to="body">
      <div v-if="sheet && activeList" class="gallery fixed inset-0 z-[200000] bg-ink/55 flex items-end sm:items-center justify-center sm:p-4"
        @click.self="sheet = null" @keydown.esc="sheet = null">
        <div role="dialog" aria-modal="true" aria-labelledby="sheet-title"
          class="bg-card rounded-t-card sm:rounded-card shadow-float max-w-md w-full max-h-[90dvh] overflow-y-auto px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 rise-in">
          <template v-if="sheet === 'review'">
            <h2 id="sheet-title" class="text-[24px] leading-tight tracking-[-0.015em] text-ink text-balance">
              {{ lock === 'sent' || lock === 'locked' ? activeList.name : `Send ${activeList.name} to ${owner}?` }}
            </h2>
            <p class="mt-3 text-ink tabular-nums">
              <span class="text-[32px] leading-none font-medium tracking-tight">{{ pickedText }}</span>
              <span class="text-ink-2"> photo{{ picked.size === 1 ? '' : 's' }}<template v-if="maxPicks"> of {{ maxPicks.toLocaleString('en-US') }}</template></span>
            </p>
            <ul v-if="sheetChapters.length" class="mt-4 rounded-inset bg-inset divide-y divide-line" aria-label="By chapter">
              <li v-for="c in sheetChapters" :key="c.id" class="h-10 px-3.5 flex items-center gap-2 text-sm">
                <Icon name="lucide:folder" size="15" class="text-ink-3 shrink-0" />
                <span class="flex-1 min-w-0 truncate text-ink-2">{{ c.name }}</span>
                <span class="tabular-nums text-ink">{{ c.picked }}<template v-if="c.max"> / {{ c.max }}</template></span>
              </li>
            </ul>
            <template v-if="lock === 'sent' || lock === 'locked'">
              <p class="mt-5 text-[15px] text-ink-2 leading-relaxed flex gap-2"><Icon name="lucide:lock" size="16" class="mt-1 shrink-0 text-ink-3" />{{ lockMessage }}</p>
              <button type="button" class="btn btn-ghost w-full h-12 text-base mt-6" @click="sheet = null">Close</button>
            </template>
            <template v-else>
              <p class="mt-5 text-[15px] text-ink-2 leading-relaxed text-pretty">
                <template v-if="lock === 'closed'">The deadline was {{ shortDate(activeList.deadline!) }}. You can still send. </template>
                After you send, this selection is locked. {{ owner }} can reopen it if you need a change.
              </p>
              <p v-if="sendError" role="alert" class="mt-3 text-[15px] text-ink font-medium">{{ sendError }}</p>
              <p v-else-if="picksReady && !picked.size" class="mt-3 text-[15px] text-ink-2">Pick at least one photo first.</p>
              <div class="mt-6 flex flex-col gap-2">
                <button type="button" class="btn btn-primary w-full h-12 text-base gap-2" :disabled="!picked.size || sending" @click="sendList">
                  <Icon :name="sending ? 'lucide:loader-circle' : 'lucide:send'" size="18" :class="{ 'animate-spin': sending }" />
                  {{ sending ? 'Sending…' : `Send ${picked.size.toLocaleString('en-US')} photo${picked.size === 1 ? '' : 's'}` }}
                </button>
                <button type="button" class="btn btn-ghost w-full h-12 text-base" @click="sheet = null">Keep choosing</button>
              </div>
            </template>
          </template>
          <template v-else>
            <!-- The ending: the choosing is done, the album is the photographer's now -->
            <span class="mx-auto mb-5 w-14 h-14 rounded-full bg-inset text-ink flex items-center justify-center" aria-hidden="true">
              <Icon name="lucide:check" size="26" />
            </span>
            <h2 id="sheet-title" class="text-center text-[26px] leading-tight tracking-[-0.015em] text-ink">Sent to {{ owner }}</h2>
            <p class="mt-2 text-center text-ink-2 text-balance tabular-nums">
              {{ picked.size.toLocaleString('en-US') }} photo{{ picked.size === 1 ? '' : 's' }} for {{ activeList.name }}<template v-if="sentAt">, on {{ shortDate(sentAt) }}</template>.
              Ask {{ owner }} if you need to change something.
            </p>
            <div class="mt-7 flex flex-col gap-2">
              <button v-if="nextList" type="button" class="btn btn-primary w-full h-12 text-base" @click="goNextList">Next: {{ nextList.name }}</button>
              <button type="button" class="btn w-full h-12 text-base" :class="nextList ? 'btn-ghost' : 'btn-primary'" @click="sheet = null">Done</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- A refused pick, said once at the bottom of the screen: over the grid, the lightbox and one by one -->
    <Teleport to="body">
      <div class="gallery fixed inset-x-0 z-[200001] bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4rem)] flex justify-center px-4 pointer-events-none"
        role="status" aria-live="polite">
        <div v-if="notice" class="pointer-events-auto max-w-md pl-4 pr-2 py-2 min-h-12 rounded-ctl bg-ink text-card text-[14px] leading-snug shadow-float rise-in flex items-start gap-2">
          <div class="flex-1 py-1.5">
            <p class="text-pretty">{{ notice }}</p>
            <button v-if="noticeAction" type="button" class="mt-2 -ml-1 h-9 px-3 rounded-full bg-night-2 text-card text-[13px] font-medium hover:bg-ink-2" @click="noticeAction.run()">{{ noticeAction.label }}</button>
          </div>
          <button type="button" class="shrink-0 w-9 h-9 rounded-full grid place-items-center text-card/70 hover:text-card" aria-label="Dismiss" @click="notice = ''"><Icon name="lucide:x" size="16" /></button>
        </div>
      </div>
    </Teleport>

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
import PersonFace from '~/components/PersonFace.vue'
import type { ShareManifest } from '~/composables/useApi'
import { useShareStore } from '~/stores/share'
import { usePicksStore, type FlushOutcome } from '~/stores/picks'
import TriageView from '~/components/TriageView.vue'
import { blockMessage, deadlineInfo, listLock, mergePicks, pickBlock, setProgress, shortDate, triageQueue, type ListFeedback } from '~/utils/picks'
import { andIds, avatarCrop, browseHead, buildRows, filterIds, joinNames, peopleIds, queryPeople, resolvePeople, mergeFeedback, parseTags, resolveSets, setImages, tagEntries, tagIndex, tagLabel, topTags, type BrowsePerson, type BrowseSet, PSWP_BASE_OPTIONS, renderLightboxButtons, thumbUrl, toShareImage, type ShareComment } from '~/utils/browse'
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
  picksStore.stop()
  if (clientName.value) {
    shareStore.flushChanges(token, clientName.value)
    picksStore.flush(token, clientName.value)
  }
})

// Also handle browser close/refresh
if (import.meta.client) {
  window.addEventListener('beforeunload', () => {
    if (clientName.value) {
      shareStore.flushChanges(token, clientName.value)
      picksStore.flush(token, clientName.value)
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
// shown (no row to hold the button). Open from SSR when ?q= is on, so it never pops in.
// Only typed text holds the panel open: tags and people show (and come off) in the filter bar, so a tag
// no longer needs the panel to stay visible.
const searchOpen = ref(!!(typeof route.query.q === 'string' && route.query.q.trim()))
const searchActive = computed(() => !!qInput.value.trim())
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
  nextTick(() => [...document.querySelectorAll<HTMLElement>('[aria-controls="search-panel"]')].find(b => b.offsetParent)?.focus())
}
function clearFilters() {
  setQuery('')
  activeTags.value = []
  activePeople.value = []
}
// Filter bar: everything that narrows the grid, each removable on its own. People in `who` order (picked, then
// typed); the typed part of the search that is not a name shows as its own item.
// Lists: an empty Picked / Not picked view has its own way out (See all photos), so the bar does not cover it.
const barOn = computed(() => !!filterKey.value || (only.value !== null && (gridHas.value || !hasLists.value)))
const barPeople = computed(() => who.value.map(id => people.value.find(p => p.id === id)).filter(p => !!p))
const barQuery = computed(() => (hasTags.value ? lifted.value.rest : ''))
const queryWords = () => qInput.value.split(/\s+/).filter(Boolean)
function removePerson(id: string) {
  if (activePeople.value.includes(id)) togglePerson(id)
  const p = people.value.find(p => p.id === id)
  if (p && lifted.value.ids.includes(id)) setQuery(queryWords().filter(w => !queryPeople(w, [p]).ids.length).join(' '))
}
// Keep only the words that name someone: the people stay, the tag search goes.
const removeQuery = () => setQuery(queryWords().filter(w => queryPeople(w, people.value).ids.length).join(' '))
const barCount = computed(() => {
  const g = gridImages.value
  if (!g) return null
  const m = marks.value
  return only.value ? g.filter(i => m.has(i.id) === (only.value === 'in')).length : resultCount.value
})
function clearAll() {
  clearFilters()
  clearOnly()
}
// Lightbox face tapped: that person's photos (in the selected set), from the top of the filters.
function showPerson(id: string) {
  clearFilters()
  activePeople.value = [id]
  nextTick(() => {
    const el = document.getElementById('people-strip')
    if (el?.offsetParent) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (sets.value.length ? 64 : 8), behavior: 'instant' })
  })
}
// Scroll position is saved per view (set + filter); a new view starts at the top.
const viewKey = computed(() => [selectedSet.value, filterKey.value, hasLists.value && view.value !== 'all' ? `${activeList.value?.id}:${view.value}` : ''].filter(Boolean).join('|') || null)

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

// ---- Selection lists ("300 for the main album, 40 from Haldi") ----
// With lists the heart picks into the active list, and All / Not picked / Picked replace All / Favorites.
// Without lists (lists: [] or absent) nothing here renders and favorites work as before.
const picksStore = usePicksStore()
const lists = computed(() => (isV2 ? manifest.value?.lists ?? [] : []))
const hasLists = computed(() => lists.value.length > 0)
const activeListId = ref(typeof route.query.list === 'string' ? route.query.list : '')
const activeList = computed(() => lists.value.find(l => l.id === activeListId.value) ?? lists.value[0] ?? null)
type View = 'all' | 'unpicked' | 'picked'
const VIEWS: [View, string][] = [['all', 'All'], ['unpicked', 'Not picked'], ['picked', 'Picked']]
const view = ref<View>(route.query.view === 'picked' || route.query.view === 'unpicked' ? route.query.view : 'all')
const listFb = reactive(new Map<string, ListFeedback>()) // server state per list, this client
const serverLocked = reactive(new Set<string>()) // lists the server answered 423 for
const picked = reactive(new Set<number>()) // active list as the person sees it (server + unsynced)
const picksReady = ref(false) // feedback read: until then counts are a dash and Picked / Not picked wait
const NO_COUNTS = new Map<number, number>() // lists show no all-client counts on tiles
// Deadline and lock lines need the clock: client only, so SSR and hydration render the same.
const now = ref<number | null>(null)
const owner = computed(() => albumInfo.value?.ownerName || 'your photographer')

// Rebuild the visible picks from the server list + unsynced ops, touching only changed keys (each tile
// reads its own key, so a reload re-renders the tiles that changed, not all of them).
function syncPicked() {
  const l = activeList.value
  const merged = l ? mergePicks(listFb.get(l.id)?.imageIds ?? [], picksStore.unsyncedOps(), l.id) : new Set<number>()
  for (const id of [...picked]) if (!merged.has(id)) picked.delete(id)
  merged.forEach(id => { if (!picked.has(id)) picked.add(id) })
}
watch(activeList, syncPicked)

const lock = computed(() => (activeList.value && now.value !== null
  ? listLock(activeList.value, listFb.get(activeList.value.id), serverLocked.has(activeList.value.id), now.value) : null))
const deadline = computed(() => (activeList.value && now.value !== null ? deadlineInfo(activeList.value.deadline, now.value) : null))
const sentAt = computed(() => (activeList.value ? listFb.get(activeList.value.id)?.submittedAt ?? null : null))
const lockMessage = computed(() => {
  const l = activeList.value
  if (!l || !lock.value) return ''
  if (lock.value === 'sent') return `${l.name} was sent on ${shortDate(sentAt.value!)}. Ask ${owner.value} to reopen it.`
  if (lock.value === 'closed') return `${l.name} closed on ${shortDate(l.deadline!)}. You can still send what you picked.`
  return `${l.name} is locked. Ask ${owner.value} to reopen it.`
})
// Chapter progress for the sets the list limits; the tabs read it by set id.
const chapters = computed(() => setProgress(activeList.value, sets.value, picked))
const chapterMap = computed(() => new Map(chapters.value.map(c => [c.setId, c])))
const maxPicks = computed(() => activeList.value?.maxPicks ?? null)
const pickedText = computed(() => (picksReady.value ? picked.size.toLocaleString('en-US') : '–'))
const counterText = computed(() => `${pickedText.value}${maxPicks.value ? ` / ${maxPicks.value.toLocaleString('en-US')}` : ''}`)
const heartLabel = computed(() => (activeList.value ? `Pick for ${activeList.value.name}` : undefined))

// One short line at the bottom of the screen for a refused pick: above the lightbox and the one-by-one view.
const notice = ref('')
const noticeAction = shallowRef<{ label: string; run: () => void } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function notify(msg: string, action: { label: string; run: () => void } | null = null) {
  notice.value = ''
  clearTimeout(noticeTimer)
  nextTick(() => { notice.value = msg; noticeAction.value = action }) // re-announced even when the same line repeats
  noticeTimer = setTimeout(() => { notice.value = '' }, action ? 8000 : 6000)
}
// "Haldi is full" leads to the Haldi picks, where one can come out.
const showPicksOf = (setId: string, name: string) => ({
  label: `See ${name} picks`,
  run: () => { notice.value = ''; clearFilters(); selectedSet.value = setId; view.value = 'picked'; window.scrollTo({ top: 0, behavior: 'instant' }) },
})

// Heart in list mode. Limits the page already knows are checked before anything is sent.
let refused = false // read by the double-tap burst right after
function togglePick(id: number) {
  refused = true
  if (!clientName.value) { showNameModal.value = true; return }
  const l = activeList.value
  if (!l) return
  if (lock.value) return notify(lockMessage.value)
  const had = picked.has(id)
  const block = had ? null : pickBlock(l, sets.value, picked, id)
  if (block) return notify(blockMessage(block), block.scope === 'set' ? showPicksOf(block.setId, block.name) : null)
  refused = false
  if (had) picked.delete(id)
  else picked.add(id)
  picksStore.addOp({ listId: l.id, imageId: id, add: !had })
  picksStore.schedule(token, clientName.value)
}

// What the server said about a batch. A refusal rolls the optimistic picks back by reading the truth again
// (another phone of the same person may have filled the list meanwhile).
function onPicksFlushed(out: FlushOutcome[]) {
  let reload = false
  for (const { listId, ops, result } of out) {
    const lost = ops.filter(o => o.add).length
    const name = lists.value.find(l => l.id === listId)?.name ?? 'This list'
    if (result.ok) listFb.set(listId, { imageIds: result.imageIds, submittedAt: listFb.get(listId)?.submittedAt ?? null })
    else if (result.error === 'limit') {
      const set = result.setId ? sets.value.find(s => s.id === result.setId) : null
      const [what, max] = set ? [set.name, result.max] : [name, result.maxPicks]
      notify(`${what} is already full${max ? ` (${max} of ${max})` : ''}, maybe from another phone. Your last ${lost === 1 ? 'pick' : `${lost} picks`} there ${lost === 1 ? 'was' : 'were'} not saved.`,
        set ? showPicksOf(set.id, set.name) : null)
      reload = true
    } else if (result.error === 'locked') {
      serverLocked.add(listId)
      notify(`${name} is locked now, so your last picks were not saved. Ask ${owner.value} to reopen it.`)
      reload = true
    }
  }
  if (reload) loadFeedback()
  else syncPicked()
}

// The heart, wherever it is: a list pick, or a favorite as before.
function onHeart(id: number) {
  if (hasLists.value) togglePick(id)
  else { refused = false; toggleFavoriteV2(id) }
}
function onBurst(x: number, y: number) {
  if (!refused) showHeartAnimation(x, y)
}

// Grid filter: Picked / Not picked (lists) or Favorites (no lists), as a snapshot (see BrowseGrid).
const only = computed<'in' | 'out' | null>(() => (hasLists.value
  ? view.value === 'picked' ? 'in' : view.value === 'unpicked' ? 'out' : null
  : showFavoritesOnly.value ? 'in' : null))
const marks = computed(() => (hasLists.value ? picked : v2Favs))
// Picked / Not picked need this client's picks: wait for them (skeleton) instead of showing a wrong grid.
const gridWaits = computed(() => hasLists.value && view.value !== 'all' && !picksReady.value)
const gridHas = computed(() => {
  const g = gridImages.value
  if (!g) return false
  const m = marks.value
  return only.value === 'in' ? g.some(i => m.has(i.id)) : only.value === 'out' ? g.some(i => !m.has(i.id)) : g.length > 0
})
const viewName = computed(() => sets.value.find(s => s.id === selectedSet.value)?.name ?? null)
const onlyLabel = computed(() => (hasLists.value ? (view.value === 'picked' ? 'Picked' : 'Not picked') : 'Favorites'))
function clearOnly() {
  if (hasLists.value) view.value = 'all'
  else if (showFavoritesOnly.value) toggleShowFavorites()
}
watch([activeListId, view], ([id, v]) => {
  if (!hasLists.value) return
  const url = new URL(window.location.href)
  for (const [k, val] of [['list', id && id !== lists.value[0]?.id ? id : ''], ['view', v === 'all' ? '' : v]] as const) {
    if (val) url.searchParams.set(k, val)
    else url.searchParams.delete(k)
  }
  window.history.replaceState(window.history.state, '', url)
})

// ---- One by one: the view's undecided photos, in grid order. Skips are kept on this device, per person + list.
const triageOpen = ref(false)
const skipped = reactive(new Set<number>())
const skipKey = () => `lumosnap_skip_${token}:${clientName.value}:${activeList.value?.id}`
function loadSkips() {
  skipped.clear()
  if (!import.meta.client || !activeList.value || !clientName.value) return
  try { (JSON.parse(localStorage.getItem(skipKey()) || '[]') as number[]).forEach(id => skipped.add(id)) } catch { /* bad entry: start over */ }
}
const saveSkips = () => localStorage.setItem(skipKey(), JSON.stringify([...skipped]))
// Order as the grid shows it (moments by time), every burst frame on its own: a burst is where choosing is hardest.
const triageOrder = computed(() => (triageOpen.value && gridImages.value
  ? buildRows(gridImages.value, 1, { stackBursts: false, eventDate: manifest.value?.album.eventDate }).visible : []))
const triageList = computed(() => triageQueue(triageOrder.value, picked, skipped))
const triageSkipped = computed(() => triageOrder.value.reduce((n, i) => n + (skipped.has(i.id) && !picked.has(i.id) ? 1 : 0), 0))
const triageBlocked = computed(() => {
  const img = triageList.value[0]
  if (!img || !activeList.value) return null
  if (lock.value) return lockMessage.value
  const b = pickBlock(activeList.value, sets.value, picked, img.id)
  return b && blockMessage(b)
})
const history = ref<{ id: number; kind: 'keep' | 'skip' }[]>([])
const canTriage = computed(() => !!gridImages.value?.length && !lock.value)
function openTriage() {
  if (!clientName.value) { showNameModal.value = true; return }
  history.value = []
  triageOpen.value = true
}
function closeTriage() {
  triageOpen.value = false
  nextTick(() => document.getElementById('triage-open')?.focus())
}
function triageKeep(id: number) {
  togglePick(id)
  if (!refused) history.value.push({ id, kind: 'keep' })
}
function triageSkip(id: number) {
  skipped.add(id)
  saveSkips()
  history.value.push({ id, kind: 'skip' })
}
function triageUndo() {
  const last = history.value.pop()
  if (!last) return
  if (last.kind === 'skip') { skipped.delete(last.id); saveSkips() }
  else if (picked.has(last.id)) togglePick(last.id)
}
// Done screen: the next chapter that still has room, else sending the list.
const triageNext = computed(() => {
  const c = chapters.value.find(c => c.setId !== selectedSet.value && c.picked < c.max)
  if (c) return { label: `Next: ${c.name} ${c.picked} / ${c.max}`, run: () => { clearFilters(); view.value = 'all'; selectedSet.value = c.setId; history.value = [] } }
  if (picked.size) return { label: `Send ${activeList.value?.name}`, run: () => { triageOpen.value = false; openSheet() } }
  return null
})
function triageReset() {
  triageOrder.value.forEach(i => skipped.delete(i.id))
  saveSkips()
  history.value = []
}

// ---- Send: review sheet, then the list is the photographer's.
const sheet = ref<null | 'review' | 'sent'>(null)
const sending = ref(false)
const sendError = ref('')
const nextList = computed(() => lists.value.find(l => l.id !== activeList.value?.id && !listFb.get(l.id)?.submittedAt) ?? null)
// Every chapter with a limit or a pick, in set order. Sets can overlap, so these do not add up to the total.
const sheetChapters = computed(() => sets.value.flatMap(s => {
  const c = chapterMap.value.get(s.id)
  const n = c?.picked ?? s.ids.reduce((k, id) => k + (picked.has(id) ? 1 : 0), 0)
  return c || n ? [{ id: s.id, name: s.name, picked: n, max: c?.max ?? null }] : []
}))
let sheetOpener: HTMLElement | null = null
function openSheet() {
  sendError.value = ''
  sheetOpener = document.activeElement as HTMLElement | null
  sheet.value = 'review'
}
// Focus into the sheet on open (on the safe button: Enter must not send by accident), back to what opened it on close.
watch(sheet, (v, was) => {
  if (v && !was) nextTick(() => (document.querySelector<HTMLElement>('[aria-labelledby="sheet-title"] .btn-ghost') ?? document.querySelector<HTMLElement>('[aria-labelledby="sheet-title"] .btn'))?.focus())
  if (!v && was) nextTick(() => sheetOpener?.focus())
})
async function sendList() {
  const l = activeList.value
  if (!l || sending.value) return
  sending.value = true
  sendError.value = ''
  // Picks still on this phone go first; the photographer gets what the screen shows.
  const out = await picksStore.flush(token, clientName.value)
  if (picksStore.queue.length || out.some(o => !o.result.ok)) {
    sending.value = false
    sendError.value = out.some(o => !o.result.ok && o.result.error !== 'network')
      ? 'Some picks changed on the way. Check the count, then send again.'
      : `Could not reach ${owner.value}. Check the connection, then send again.`
    return
  }
  const at = await api.submitList(token, l.id, clientName.value)
  sending.value = false
  if (at === null) {
    sendError.value = `Could not send to ${owner.value}. Check the connection, then send again.`
    loadFeedback() // sent from another phone already? the sheet then shows it as sent
    return
  }
  listFb.set(l.id, { imageIds: [...picked], submittedAt: at })
  sheet.value = 'sent'
}
watch(sentAt, at => { if (at && sheet.value === 'review') sheet.value = 'sent' })
function goNextList() {
  if (nextList.value) activeListId.value = nextList.value.id
  view.value = 'all'
  sheet.value = null
}

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
watch([activeList, clientName], loadSkips)

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
    if (!hasLists.value && !v2Favs.has(id)) {
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
  if (isV2) picksStore.start(token, clientName.value, onPicksFlushed)

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
  if (!fb) { picksReady.value = true; return } // offline: show what this phone knows rather than wait forever
  const m = mergeFeedback(fb, shareStore.unsyncedChanges(), clientName.value)
  v2Favs.clear()
  m.favs.forEach(id => v2Favs.add(id))
  v2Counts.clear()
  m.counts.forEach((n, id) => v2Counts.set(id, n))
  v2Comments.clear()
  m.comments.forEach((list, id) => v2Comments.set(id, list))
  if (fb.lists) {
    listFb.clear()
    for (const [id, v] of Object.entries(fb.lists)) listFb.set(id, v)
    serverLocked.clear() // fresh truth: a reopened list is editable again
  }
  syncPicked()
  picksReady.value = true
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
    now.value = Date.now()
    setInterval(() => { now.value = Date.now() }, 60_000) // deadline lines stay true on a page left open
    if (savedName) {
      clientName.value = savedName
      shareStore.startPeriodicFlush(token, savedName)
      picksStore.start(token, savedName, onPicksFlushed)
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

/* Notice and send sheet: up 8 px and in, quick, so a refusal answers the tap that caused it */
.rise-in { animation: rise-in 0.16s var(--ease-soft); }
@keyframes rise-in { from { opacity: 0; transform: translateY(8px); } }
@media (prefers-reduced-motion: reduce) { .rise-in { animation: none; } }

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
