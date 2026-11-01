<template>
  <!-- Grey paper, white prints: the album card and the photo sheet sit on the canvas, as in the photographer's app. -->
  <!-- inert under the name prompt and the notes panel: keyboard focus stays in the dialog -->
  <div class="gallery bg-canvas flex flex-col min-h-screen"
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
    <div v-else-if="error === 'gone'" class="flex-1 flex items-center justify-center p-4">
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
    <!-- The album is there, the request failed (offline, a server error): say so, and offer the retry -->
    <div v-else-if="error" role="alert" class="flex-1 flex items-center justify-center p-4">
      <div class="bg-card rounded-card p-8 max-w-sm w-full text-center">
        <span class="mx-auto mb-5 w-14 h-14 rounded-full bg-inset text-ink-3 flex items-center justify-center">
          <Icon name="lucide:wifi-off" size="24" />
        </span>
        <h1 class="text-2xl text-ink tracking-tight mb-2">Could not open the album</h1>
        <p class="text-ink-2 leading-relaxed mb-6">Check the connection, then try again.</p>
        <button type="button" class="btn btn-primary" @click="retryLoad">Try again</button>
      </div>
    </div>

    <!-- Main Content Area (Split View) -->
    <div v-else-if="albumInfo" class="flex-1 flex flex-col md:flex-row animate-fade-in">

      <!-- Album card. Phones: one white card above the sheet. md+: a column of cards beside it, sticky
           (the page scrolls on the window). -->
      <aside
        class="w-full md:w-80 shrink-0 flex flex-col md:gap-4 md:p-4 md:pr-0 bg-card rounded-b-card md:bg-transparent md:rounded-none z-10 md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto">
        <!-- Phones: the title and one quiet line (studio, date, size), so the photos start higher -->
        <div class="px-5 pt-4 pb-3 md:p-6 md:bg-card md:rounded-card">
          <p v-if="albumInfo.ownerName" class="max-md:hidden text-[13px] text-ink-3 mb-1 truncate">{{ albumInfo.ownerName }}</p>
          <h1 class="text-[22px] leading-[1.2] md:text-[28px] md:leading-[1.15] tracking-[-0.015em] text-ink text-balance break-words">{{ albumInfo.title }}</h1>
          <p class="mt-1 md:mt-1.5 text-[13px] md:text-sm text-ink-2 tabular-nums max-md:truncate">
            <span v-if="albumInfo.ownerName" class="md:hidden">{{ albumInfo.ownerName }} · </span>
            <template v-if="formattedEventDate"><span class="md:hidden">{{ shortEventDate }}</span><span class="max-md:hidden">{{ formattedEventDate }}</span> · </template>{{ (albumInfo.totalImages ?? 0).toLocaleString('en-US') }} photos
          </p>
        </div>

        <!-- Your picks: all or favorites; bursts stacked or not -->
        <div class="px-5 pb-3.5 md:p-4 md:bg-card md:rounded-card flex flex-wrap items-center gap-2">
          <div class="seg md:w-full" role="group" aria-label="Show">
            <button type="button" class="md:flex-1 md:justify-center" :aria-pressed="!showFavoritesOnly" @click="showFavoritesOnly && toggleShowFavorites()">All</button>
            <button type="button" class="md:flex-1 md:justify-center" :aria-pressed="showFavoritesOnly" @click="!showFavoritesOnly && toggleShowFavorites()">
              <Icon name="lucide:heart" size="16" :class="showFavoritesOnly ? 'text-heart' : ''" />Favorites
              <span class="n">{{ v2Favs.size }}</span>
            </button>
          </div>
          <!-- v2: stack burst frames into one tile (only for albums with bursts). Phones with a Filter panel: in there. -->
          <button v-if="hasBursts" type="button" class="btn btn-ghost px-3.5 gap-1.5" :class="{ 'max-md:hidden': hasTags && sets.length }" :aria-pressed="stackBursts"
            title="Show each burst as one photo" @click="stackBursts = !stackBursts">
            <Icon name="lucide:layers" size="16" :class="stackBursts ? 'text-brand' : 'text-ink-3'" />Stack bursts
          </button>
        </div>

        <!-- md+: who and what as cards in the column, as in the photographer's app. They stay in view while the
             photos scroll, so a filter is one click from anywhere. Phones keep faces in the sheet (below). -->
        <section v-if="manifest && stripPeople.length" aria-labelledby="people-card-h" class="hidden md:block p-4 bg-card rounded-card">
          <h2 id="people-card-h" class="px-1 mb-2 text-[13px] text-ink-3">People</h2>
          <div role="group" aria-labelledby="people-card-h" class="grid grid-cols-4 gap-y-1">
            <PersonFace v-for="p in stripPeople" :key="p.id" class="w-full" :person="p" :base="manifest.base"
              :picked="activePeople.includes(p.id)" :lifted="lifted.ids.includes(p.id)" @click="togglePerson(p.id)" />
          </div>
        </section>
        <section v-if="manifest && hasTags && chips.length" aria-labelledby="tags-card-h" class="hidden md:block p-4 bg-card rounded-card">
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

      <!-- The photo sheet. Overflow clip (not hidden) rounds its corners without becoming a scroll
           container, so the set bar still sticks to the window. -->
      <main class="flex-1 bg-card mt-2 md:m-4 rounded-t-card md:rounded-card px-3 md:px-4 pb-4 relative min-w-0 overflow-clip"
        :class="manifest && sets.length ? '' : 'pt-3 md:pt-4'">

        <!-- Browse v2: set tabs (only when the album has sets), sticky over the grid; solid, no blur over scrolling photos -->
        <div v-if="manifest && sets.length"
          class="sticky top-0 z-30 -mx-3 md:-mx-4 mb-1 px-3 md:px-4 bg-card flex items-center gap-2">
          <SetTabs v-model="selectedSet" :sets="sets" :total="allCount"
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
        <div v-if="manifest && (stripPeople.length || (hasTags && searchShown))" class="mb-1 md:mb-2 flex flex-col gap-3"
          :class="hasTags && searchShown ? '' : 'md:hidden'">
          <div v-if="stripPeople.length" id="people-strip" role="group" aria-label="People"
            class="-mx-3 px-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none] py-0.5 md:hidden">
            <PersonFace v-for="p in stripPeople" :key="p.id" compact :person="p" :base="manifest.base"
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
            <button v-if="hasBursts && sets.length" type="button" class="md:hidden self-start btn btn-ghost h-8 px-3 gap-1.5 text-[13px] font-normal" :aria-pressed="stackBursts"
              @click="stackBursts = !stackBursts">
              <Icon name="lucide:layers" size="14" :class="stackBursts ? 'text-brand' : 'text-ink-3'" />Stack bursts
            </button>
          </div>
        </div>

        <!-- More like this: the album's photo index did not load (offline, a server error) -->
        <div v-if="manifest && likeError" role="alert" class="py-16 px-4 text-center">
          <span class="mx-auto mb-4 w-12 h-12 rounded-full bg-inset text-ink-3 flex items-center justify-center" aria-hidden="true">
            <Icon name="lucide:image-off" size="20" />
          </span>
          <p class="text-lg text-ink text-balance">Could not find similar photos</p>
          <p class="mt-2 text-sm text-ink-2">Check the connection, then try again.</p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" class="btn btn-primary" @click="retryLike">Try again</button>
            <button type="button" class="btn btn-ghost" @click="likeId = null">Show all photos</button>
          </div>
        </div>

        <!-- Browse v2: set/filter picked before the full manifest arrived (SSR only shipped the URL's view), photos
             like one photo being found, or a search whose only answers come by meaning -->
        <div v-else-if="manifest && (!gridImages || (tailPending && !gridImages.length))" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          <div v-for="i in 10" :key="i" class="skel aspect-[4/5]"></div>
        </div>

        <!-- Browse v2: search/chips matched nothing in this set -->
        <div v-else-if="manifest && filterKey && gridImages?.length === 0 && !tail" class="py-16 px-4 text-center">
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
        <div v-else-if="manifest && gridImages && gridHas"
          v-bind="sets.length ? { id: 'set-panel', role: 'tabpanel', 'aria-labelledby': `set-tab-${selectedSet ?? 'all'}` } : {}">
          <BrowseGrid :token="token" :images="gridImages" :base="manifest.base" :favs="v2Favs" :comments="v2Comments"
            :counts="v2Counts" :client-name="clientName" :favorites-only="showFavoritesOnly" :stack-bursts="stackBursts"
            :event-date="manifest.album.eventDate" :labels="manifest.labels" :set-id="viewKey"
            :sticky-top="sets.length ? 56 : 0" :people="full ? people : undefined" :ranked="likeLabel" :tail="tail"
            :can-like="!!vectors && !!full" @like="showLike" @person="showPerson" @favorite="toggleFavoriteV2" @comment="openCommentSidebarV2"
            @heart="showHeartAnimation" />
        </div>


        <!-- Empty State -->
        <div v-else
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

        <!-- Browse v2: what is filtered, kept in view while the photos scroll. Sticky to the bottom of the window,
             at the end of the sheet: it adds nothing above the grid (no shift when a face is tapped), sits under
             the thumb on a phone, and never stacks under the set bar. One line; the items scroll inside it. -->
        <div v-if="barOn" class="sticky z-30 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mt-4 flex justify-center pointer-events-none">
          <div role="region" aria-label="Filters on"
            class="pointer-events-auto max-w-full min-w-0 h-12 flex items-center gap-1 pl-1.5 pr-1.5 rounded-full bg-card ring-1 ring-line-2 shadow-[0_10px_28px_-10px_oklch(20%_0.01_255/0.3)]">
            <!-- Items scroll sideways; the fade says there is more. The end padding lets the last item clear the fade. -->
            <div class="min-w-0 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] pr-4 [mask-image:linear-gradient(to_left,transparent,black_1rem)]">
              <!-- The photo the grid is answering: a small square print (round means a person) -->
              <!-- "Similar to", not "Like": like is the heart in this product -->
              <button v-if="likeOn" type="button" class="fchip pr-2.5" aria-label="Remove: similar to this photo" @click="likeId = null">
                Similar to<span aria-hidden="true" class="w-7 h-7 rounded-[6px] bg-inset-2 bg-cover bg-center shrink-0"
                  :style="likeImg ? { backgroundImage: `url(${thumbUrl(manifest!.base, likeImg)})` } : undefined"></span><Icon name="lucide:x" size="14" class="text-ink-3" />
              </button>
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
              <button v-if="showFavoritesOnly" type="button" class="fchip" aria-label="Remove favorites" @click="toggleShowFavorites">
                <Icon name="lucide:heart" size="14" class="text-heart" />Favorites<Icon name="lucide:x" size="14" class="text-ink-3" />
              </button>
            </div>
            <span aria-live="polite" class="shrink-0 px-1.5 text-sm text-ink-2 tabular-nums"><Icon v-if="(likeOn && !gridImages && !likeError) || tailPending" name="lucide:loader-circle" size="16" class="animate-spin text-ink-3 align-[-3px]" aria-label="Finding photos" /><template v-else-if="barCount">{{ barCount.toLocaleString('en-US') }}<span class="max-md:sr-only">&nbsp;photo{{ barCount === 1 ? '' : 's' }}</span></template></span>
            <div v-if="who.length > 1" role="group" aria-label="Photos with" class="seg p-0.5 shrink-0 max-md:hidden">
              <button v-for="[m, label] in ([['all', 'Together'], ['any', 'Either']] as const)" :key="m" type="button" :aria-pressed="mode === m"
                class="h-8 px-2.5 text-[13px]"
                @click="either = m === 'any'">{{ label }}</button>
            </div>
            <button type="button" class="shrink-0 h-9 px-3 rounded-full text-[13px] font-medium text-ink-2 hover:bg-inset hover:text-ink" @click="clearAll">Clear</button>
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
      @close="closeCommentSidebar" @submit="handleSubmitComment" />

    <!-- A short notice at the bottom of the screen (a photo that cannot be compared yet), over the grid and the lightbox.
         The same place asks before un-hearting a photo with the client's note: the note goes with the heart. -->
    <Teleport to="body">
      <div class="gallery fixed inset-x-0 z-[200001] bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4rem)] flex justify-center px-4 pointer-events-none"
        role="status" aria-live="polite">
        <div v-if="confirmUnheart !== null" class="pointer-events-auto max-w-md pl-4 pr-2 py-2 min-h-12 rounded-ctl bg-ink text-card text-[14px] leading-snug shadow-float rise-in flex items-center gap-1">
          <p class="flex-1 py-1.5 pr-1 text-pretty">Removing the heart also deletes your note.</p>
          <button type="button" class="shrink-0 h-9 px-3 rounded-full font-medium text-card/70 hover:text-card" @click="confirmUnheart = null">Keep</button>
          <button type="button" class="shrink-0 h-9 px-3 rounded-full font-medium bg-card text-ink hover:bg-card/90" @click="removeHeart">Remove heart</button>
        </div>
        <div v-else-if="notice" class="pointer-events-auto max-w-md pl-4 pr-2 py-2 min-h-12 rounded-ctl bg-ink text-card text-[14px] leading-snug shadow-float rise-in flex items-start gap-2">
          <p class="flex-1 py-1.5 text-pretty">{{ notice }}</p>
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
import CommentSidebar from '~/components/CommentSidebar.vue'
import BrowseGrid from '~/components/BrowseGrid.vue'
import SetTabs from '~/components/SetTabs.vue'
import PersonFace from '~/components/PersonFace.vue'
import type { ShareManifest } from '~/composables/useApi'
import type { VectorReply } from '~/workers/vectors.worker'
import { useShareStore } from '~/stores/share'
import { andIds, avatarCrop, browseHead, filterIds, joinNames, peopleIds, queryPeople, resolvePeople, mergeFeedback, parseTags, resolveSets, setImages, tagEntries, tagIndex, tagLabel, topTags, type BrowsePerson, type BrowseSet, thumbUrl, toShareImage, type ShareComment } from '~/utils/browse'
import { TAG_VOCAB } from '~/utils/tag-vocab'

// Disable default layout for this page
definePageMeta({
  layout: false
})



const route = useRoute()
const api = useApi()
const shareStore = useShareStore()
const token = route.params.token as string

// Changes go out every 10 s (started once the client name is known), when the page is left in the app, and when
// the tab is hidden or closed: a keepalive request, which outlives the page.
const flushOnExit = () => { if (clientName.value) shareStore.flushChanges(token, clientName.value, true) }
const onVisibility = () => { if (document.visibilityState === 'hidden') flushOnExit() }
onBeforeUnmount(() => {
  shareStore.stopPeriodicFlush()
  if (clientName.value) shareStore.flushChanges(token, clientName.value)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pagehide', flushOnExit)
  vecApi.dispose()
})

// v2 SSR: only the first rows go into the payload (LCP); the full manifest is fetched on mount
// (CDN/browser-cached via ETag) so 10k images don't bloat the HTML.
const V2_SSR_IMAGES = 15
const CHIPS = 8
// Tag search state comes from ?q= / ?tags= so SSR renders the filtered first rows.
const filterKeyOf = (q: string, tags: string[], people: string[], either: boolean, like: number | null = null) =>
  (q || tags.length || people.length || like ? `${q}|${tags.join(',')}|${people.join(',')}${either ? '|either' : ''}${like ? `|like:${like}` : ''}` : '')
const { data: manifestHead } = await useAsyncData(
  `manifest-${token}`,
  async () => {
    const r = await api.getManifest(token)
    if (!r.ok) return { error: r.status === 404 ? 'gone' as const : 'failed' as const }
    const m = r.data
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
  }
)
type ManifestHead = {
  labels: Record<string, string>; resolved: BrowseSet[]; resolvedPeople: BrowsePerson[]; headSet: string | null; total: number; hasBursts: boolean
  hasTags: boolean; chips: { slug: string; count: number }[]; headFilter: string; matchCount: number | null; scopePeople: string[]
}
const head = manifestHead.value
const manifest = shallowRef<ShareManifest & Partial<ManifestHead> | null>(head && !('error' in head) ? head : null)
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
const loadSearch = async () => {
  if (vectors.value && full.value) vecApi.load(vectors.value.url, liveIds.value) // meaning results then do not wait on the file
  searchMod.value ??= await import('~/utils/search')
}
watch(query, q => { if (q) loadSearch() })
const searcher = computed(() => (searchMod.value && tagIdx.value ? searchMod.value.createTagSearch(tagEntries(tagIdx.value.keys(), TAG_VOCAB)) : null))
const lifted = computed(() => (hasTags.value ? queryPeople(query.value, people.value) : { ids: [], rest: '' }))
const who = computed(() => [...new Set([...activePeople.value, ...lifted.value.ids])])
const mode = computed(() => (either.value && who.value.length > 1 ? 'any' : 'all'))
watch(() => who.value.length, n => { if (n < 2) either.value = false })
const filterKey = computed(() => filterKeyOf(hasTags.value ? query.value : '', hasTags.value ? activeTags.value : [], activePeople.value, mode.value === 'any', likeOn.value ? likeId.value : null))
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

// The selected set, filtered by search + chips + people. Null while not computable yet
// (only the SSR head of another set/filter is here, or the search index is loading).
const filtered = computed(() => {
  const m = manifest.value
  if (!m) return null
  if (m.labels) return m.headSet === selectedSet.value && m.headFilter === filterKey.value ? m.images : null
  const ids = matchIds.value
  if (ids === undefined) return null
  return ids ? scopeImages.value!.filter(i => ids.has(i.id)) : scopeImages.value
})

// ---- Album vectors (manifest.vectors, LSV1): "More like this" and search by meaning, in a worker.
// No vectors (null: not built yet) -> both stay off and everything works as before.
const vectors = computed(() => manifest.value?.vectors ?? null)
const vecApi = useVectors()
const byId = computed(() => (full.value ? new Map(full.value.images.map(i => [i.id, i])) : null))
const liveIds = computed(() => full.value?.images.map(i => i.id) ?? []) // the file may still hold deleted photos
// The file's URL is signed and can rotate: when the file does not load, the manifest is read again (once per
// page) and, with a new URL, the call is tried again before the error shows.
let vecRefetched = false
async function withVectors(call: (url: string, live: number[]) => Promise<VectorReply>) {
  const r = await call(vectors.value!.url, liveIds.value)
  if (r.ok || r.error !== 'load' || vecRefetched) return r
  vecRefetched = true
  const m = await api.getManifest(token)
  if (!m.ok || !m.data.vectors || m.data.vectors.url === vectors.value?.url) return r
  manifest.value = m.data
  return call(m.data.vectors.url, liveIds.value)
}

// More like this (?like=<id>): the ~60 photos nearest to one photo, best first, inside whatever else is on
// (set, people, tags, search, Picked / Favorites). Its burst's other frames are left out (near copies), and other
// bursts give one frame each. The photo itself leads, so the grid says what it is answering.
const LIKE_K = 60
const likeId = ref<number | null>(Number(route.query.like) || null)
const likeOn = computed(() => likeId.value !== null && !!vectors.value)
const likeImg = computed(() => (likeId.value !== null ? byId.value?.get(likeId.value) ?? null : null))
type LikeState = { key: string; ids: number[] } | { key: string; error: 'load' }
const likeRes = shallowRef<LikeState | null>(null)
const likeKey = computed(() => (likeOn.value && full.value && filtered.value ? `${likeId.value}|${filterKey.value}|${showFavoritesOnly.value}` : ''))
watch(likeKey, async key => {
  if (!key) return
  const id = likeId.value!
  const favs = toRaw(v2Favs) // a snapshot, as the grid takes one: a heart inside the view does not re-rank it
  const allowed = filtered.value!.filter(i => i.id === id || !showFavoritesOnly.value || favs.has(i.id)).map(i => i.id)
  if (!allowed.includes(id)) allowed.push(id)
  const r = await withVectors((url, live) => vecApi.similarTo(url, live, id, LIKE_K * 3, allowed))
  if (key !== likeKey.value) return // a newer request owns the grid
  if (!r.ok && r.error === 'missing') {
    likeId.value = null
    notify('This photo is newer than the album’s photo index, so it cannot be compared yet. Try another photo.')
    return
  }
  if (!r.ok) { likeRes.value = { key, error: 'load' }; return }
  const self = byId.value!.get(id)
  const seen = new Set<string>(self?.b ? [self.b] : [])
  const ids = [id]
  for (const rid of r.ids) {
    const img = byId.value!.get(rid)
    if (!img || rid === id || (img.b && seen.has(img.b))) continue
    if (img.b) seen.add(img.b)
    ids.push(rid)
    if (ids.length > LIKE_K) break
  }
  likeRes.value = { key, ids }
}) // first runs once the full manifest is here (likeKey/tailKey are '' before)
const likeError = computed(() => likeOn.value && likeRes.value?.key === likeKey.value && 'error' in likeRes.value)
function retryLike() {
  const id = likeId.value
  likeId.value = null
  likeRes.value = null
  nextTick(() => { likeId.value = id })
}
// The grid's one header in this view: it says why the order is not by time.
const likeLabel = computed(() => {
  const n = likeOn.value ? gridImages.value?.length : undefined
  return n ? `Closest to this photo first · ${n.toLocaleString('en-US')} photo${n === 1 ? '' : 's'}` : undefined
})
function showLike(id: number) {
  likeId.value = id
  window.scrollTo({ top: 0, behavior: 'instant' })
}

// Search by meaning: the typed words (names lifted out) mapped to the closest tag of the whole vocabulary, one
// per word, averaged into one phrase vector. Photos it finds that the tags missed come after the tagged matches,
// under their own line. The vocabulary search is the lazy search chunk; the vectors load on search focus.
const meaningSearch = computed(() => (searchMod.value && vectors.value ? searchMod.value.createTagSearch(tagEntries(Object.keys(TAG_VOCAB), TAG_VOCAB)) : null))
const meaningSlugs = computed(() => {
  const rest = lifted.value.rest
  if (!rest || !meaningSearch.value || likeOn.value || !hasTags.value) return []
  return [...new Set(rest.split(/\s+/).map(w => meaningSearch.value!.match(w)[0]).filter((x): x is string => !!x))]
})
const tailRes = shallowRef<{ key: string; ids: number[] } | null>(null)
const tailKey = computed(() => (meaningSlugs.value.length && full.value && filtered.value && tagIdx.value ? `${meaningSlugs.value}|${filterKey.value}|${selectedSet.value}` : ''))
watch(tailKey, async key => {
  if (!key) return
  // Everything else that is on still holds (set, people, tag chips); the typed words are what meaning replaces.
  const chipIds = filterIds(tagIdx.value!, activeTags.value.map(t => [t]))
  const ids = andIds(chipIds, peopleIds(people.value, who.value, mode.value))
  const allowed = scopeImages.value!.filter(i => !ids || ids.has(i.id)).map(i => i.id)
  const slugs = meaningSlugs.value
  const exclude = filtered.value!.map(i => i.id)
  const r = await withVectors((url, live) => vecApi.phrase(url, live, slugs, allowed, exclude))
  if (key !== tailKey.value) return
  tailRes.value = { key, ids: r.ok ? r.ids : [] } // no vectors to read: the tagged matches alone, as before
}) // first runs once the full manifest is here (likeKey/tailKey are '' before)
const tailPending = computed(() => !!tailKey.value && tailRes.value?.key !== tailKey.value)
const tail = computed(() => {
  const r = tailRes.value
  if (!tailKey.value || !r || r.key !== tailKey.value || !r.ids.length) return undefined
  const images = r.ids.map(id => byId.value!.get(id)!).filter(Boolean)
  return { label: `Looks like “${lifted.value.rest}” · ${images.length} photo${images.length === 1 ? '' : 's'}`, images }
})

// What the grid shows: the filtered set, or the photos like one photo (ranked). Null while it is being worked out.
const gridImages = computed(() => {
  if (!likeOn.value) return filtered.value
  const r = likeRes.value
  if (!r || r.key !== likeKey.value || 'error' in r) return null
  return r.ids.map(id => byId.value!.get(id)!).filter(Boolean)
})
const resultCount = computed(() => {
  if (!filterKey.value || !gridImages.value) return null
  return manifest.value?.labels ? manifest.value.matchCount : gridImages.value.length + (tail.value?.images.length ?? 0)
})
const suggestion = computed(() => {
  if (resultCount.value !== 0 || tailPending.value || !lifted.value.rest || !searcher.value || !tagStats.value) return null
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
  likeId.value = null
  setQuery('')
  activeTags.value = []
  activePeople.value = []
}
// Filter bar: everything that narrows the grid, each removable on its own. People in `who` order (picked, then
// typed); the typed part of the search that is not a name shows as its own item.
const barOn = computed(() => !!filterKey.value || showFavoritesOnly.value)
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
  const t = tail.value?.images ?? []
  return showFavoritesOnly.value ? [...g, ...t].filter(i => v2Favs.has(i.id)).length : resultCount.value
})
function clearAll() {
  clearFilters()
  if (showFavoritesOnly.value) toggleShowFavorites()
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
const viewKey = computed(() => [selectedSet.value, filterKey.value].filter(Boolean).join('|') || null)

watch(sets, list => { if (selectedSet.value && !list.some(s => s.id === selectedSet.value)) selectedSet.value = null })
watch([selectedSet, query, activeTags, activePeople, mode, likeId], ([id, q, tags, picked, m, like]) => {
  const url = new URL(window.location.href)
  for (const [k, v] of [['set', id], ['q', q], ['tags', tags.join(',')], ['people', picked.join(',')], ['either', m === 'any' ? '1' : ''], ['like', like ? String(like) : '']] as const) {
    if (v) url.searchParams.set(k, v)
    else url.searchParams.delete(k)
  }
  window.history.replaceState(window.history.state, '', url)
})
const v2Favs = reactive(new Set<number>())
const v2Comments = reactive(new Map<number, ShareComment[]>())
const v2Counts = reactive(new Map<number, number>()) // favorites per image, all clients

// One short line at the bottom of the screen (a photo the index does not have yet), above the lightbox too.
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function notify(msg: string) {
  notice.value = ''
  clearTimeout(noticeTimer)
  nextTick(() => { notice.value = msg }) // re-announced even when the same line repeats
  noticeTimer = setTimeout(() => { notice.value = '' }, 6000)
}
const gridHas = computed(() => {
  const g = gridImages.value
  if (!g) return false
  const all = tail.value ? [...g, ...tail.value.images] : g
  return showFavoritesOnly.value ? all.some(i => v2Favs.has(i.id)) : all.length > 0
})

// Initialize state from SSR data. gone: the link expired or the album was taken down (404); failed: anything else.
const loading = ref(false)
const error = ref<'gone' | 'failed' | null>(!head ? 'failed' : 'error' in head ? head.error ?? null : null)
const albumInfo = computed(() => manifest.value?.album ?? null)

// Preconnect to the image base + preload the first row
if (manifest.value?.images.length) {
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
const showNameModal = ref(false)
const nameInput = ref('')
const selectedAnimalIndex = ref(0)

// Heart animation state
const heartAnimations = ref<Array<{ id: number; x: number; y: number }>>([])
let animationIdCounter = 0

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

// BrowseGrid filters client-side
function toggleShowFavorites() {
  showFavoritesOnly.value = !showFavoritesOnly.value
}

// Client name from localStorage
const CLIENT_NAME_KEY = 'lumosnap_client_name'
const clientName = ref('')

// eventDate is a calendar day: formatted in UTC, or it shifts a day west of UTC (and the server disagrees with the client)
const shortEventDate = computed(() => (albumInfo.value?.eventDate
  ? new Date(albumInfo.value.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : undefined))
const formattedEventDate = computed(() => (albumInfo.value?.eventDate
  ? new Date(albumInfo.value.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : undefined))

async function handleSubmitComment(note: string) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }

  if (!currentCommentImage.value) return

  const id = currentCommentImage.value.id
  shareStore.addChange(id, 'comment', note)
  if (!v2Favs.has(id)) {
    v2Favs.add(id) // A note hearts the photo: it lives on the favorite
    v2Counts.set(id, (v2Counts.get(id) ?? 0) + 1)
    shareStore.addChange(id, 'favorite')
  }
  // One comment per user per image — replace existing.
  const others = (v2Comments.get(id) ?? []).filter(c => c.clientName !== clientName.value)
  v2Comments.set(id, [...others, { clientName: clientName.value, notes: note, createdAt: new Date().toISOString() }])
  openCommentSidebarV2(id)
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
  confirmUnheart.value = null // asked under the old name

  // Start periodic flush with new name
  shareStore.startPeriodicFlush(token, clientName.value)

  // Refetch data with new name to sync favorites
  await loadFeedback()
}

function closeCommentSidebar() {
  showCommentSidebar.value = false
  currentCommentImage.value = null
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

// Comment Sidebar State
const showCommentSidebar = ref(false)
const currentCommentImage = ref<ReturnType<typeof toShareImage> | null>(null)

// Favorites/comments live in v2Favs/v2Comments/v2Counts (loaded from /feedback); writes go through shareStore's
// batched queue. Unsynced changes are replayed over the server state so a reload can't undo a heart or comment
// made meanwhile: what was unsynced when the read started, what was sent while it ran (the response may predate
// it), and what is unsynced now, oldest first. Replaying a change the server already has changes nothing.
async function loadFeedback() {
  const before = shareStore.unsyncedChanges()
  const mark = shareStore.sentCount()
  const fb = await api.getFeedback(token, clientName.value)
  if (!fb) return
  confirmUnheart.value = null // the photo it asked about may have changed
  const m = mergeFeedback(fb, [...before, ...shareStore.sentSince(mark), ...shareStore.unsyncedChanges()], clientName.value)
  v2Favs.clear()
  m.favs.forEach(id => v2Favs.add(id))
  v2Counts.clear()
  m.counts.forEach((n, id) => v2Counts.set(id, n))
  v2Comments.clear()
  m.comments.forEach((list, id) => v2Comments.set(id, list))
}

// The client's note lives on their favorite: un-hearting deletes it on the server. With a note, ask first.
const confirmUnheart = ref<number | null>(null)
function toggleFavoriteV2(id: number, sure = false) {
  if (!clientName.value) {
    showNameModal.value = true
    return
  }
  const had = v2Favs.has(id)
  const all = v2Comments.get(id) ?? []
  const others = all.filter(c => c.clientName !== clientName.value)
  if (had && !sure && all.some(c => c.clientName === clientName.value && c.notes?.trim())) {
    confirmUnheart.value = id
    return
  }
  confirmUnheart.value = null
  if (had) {
    v2Favs.delete(id)
    if (others.length) v2Comments.set(id, others)
    else v2Comments.delete(id)
  } else v2Favs.add(id)
  v2Counts.set(id, Math.max(0, (v2Counts.get(id) ?? 0) + (had ? -1 : 1)))
  shareStore.addChange(id, had ? 'unfavorite' : 'favorite')
}

// The confirm only removes: if the heart went meanwhile, toggling would add it back.
function removeHeart() {
  const id = confirmUnheart.value
  confirmUnheart.value = null
  if (id !== null && v2Favs.has(id)) toggleFavoriteV2(id, true)
}

function openCommentSidebarV2(id: number) {
  const img = manifest.value?.images.find(i => i.id === id)
  if (!img || !manifest.value) return
  currentCommentImage.value = toShareImage(img, manifest.value.base, v2Favs.has(id), v2Counts.get(id) ?? 0, v2Comments.get(id) ?? [], clientName.value)
  showCommentSidebar.value = true
}

// Full manifest (SSR only shipped the first rows). A failure shows the error, not skeletons that never fill.
// With ?q= the search chunk must land with it, or the filtered SSR rows would flash a skeleton; a chunk that
// fails to load does not cost the manifest (search loads again on focus).
async function loadManifest() {
  const [r] = await Promise.all([api.getManifest(token), query.value && hasTags.value ? loadSearch().catch(() => {}) : null])
  if (r.ok) {
    manifest.value = r.data
    error.value = null
  } else error.value = r.status === 404 ? 'gone' : 'failed'
}
async function retryLoad() {
  loading.value = true
  await loadManifest()
  loading.value = false
}

// Load data on mount
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', flushOnExit)
  if (error.value === 'gone') return
  if (error.value) retryLoad()
  else loadManifest()
  const savedName = localStorage.getItem(CLIENT_NAME_KEY)
  if (savedName) {
    clientName.value = savedName
    shareStore.startPeriodicFlush(token, savedName)
    loadFeedback()
  } else {
    showNameModal.value = true
  }
})
</script>

<style>
/* The scrubber is teleported outside the inert page root: hide it (and its focus) under a dialog */
body:has([aria-modal="true"]) .moment-scrubber { visibility: hidden; }

/* PhotoSwipe chrome, in the desktop lightbox's look: near-black stage, solid round buttons (no blur over a
   moving photo), white when on. */
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

/* Notice: up 8 px and in, quick, so it answers the tap that caused it */
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
