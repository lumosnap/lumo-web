<template>
  <Teleport to="body">
    <!-- Notes for the photographer. Phones: a sheet from the bottom edge; md+: the desktop's floating panel. -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="gallery fixed inset-0 z-[200000] flex items-end md:items-stretch md:justify-end isolate">
        <!-- Backdrop: a plain dim, no blur -->
        <div class="absolute inset-0 bg-ink/30" @click="$emit('close')"></div>

        <div role="dialog" aria-modal="true" aria-labelledby="notes-title"
          class="notes-panel relative w-full max-h-[85vh] md:max-h-none md:w-[360px] md:m-4 bg-card rounded-t-card md:rounded-card shadow-float flex flex-col overflow-hidden">
          <!-- Header -->
          <div class="p-4 pl-5 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 rounded-tile overflow-hidden bg-inset-2 shrink-0">
                <img v-if="image" :src="image.thumbnailUrl || image.url" class="w-full h-full object-cover" alt="" />
              </div>
              <div class="min-w-0">
                <h3 id="notes-title" class="text-base font-medium text-ink">Notes</h3>
                <p v-if="image?.favoriteCount || visibleComments.length" class="flex items-center gap-1.5 text-[13px] text-ink-3 tabular-nums">
                  <span v-if="image" class="flex items-center gap-1">
                    <Icon name="lucide:heart" size="12" :class="image.userFavorite ? 'text-heart' : ''" />
                    {{ image.favoriteCount || 0 }}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{{ visibleComments.length }} {{ visibleComments.length === 1 ? 'note' : 'notes' }}</span>
                </p>
              </div>
            </div>

            <button type="button" @click="$emit('close')" aria-label="Close notes" class="icon-btn">
              <Icon name="lucide:x" size="18" />
            </button>
          </div>

          <!-- Comments List -->
          <div class="flex-1 overflow-y-auto px-5 pb-4 space-y-5 min-h-32">
            <div v-if="!visibleComments.length" class="h-full flex flex-col items-center justify-center text-center py-8">
              <span class="w-12 h-12 bg-inset rounded-full flex items-center justify-center mb-3 text-ink-3" aria-hidden="true">
                <Icon name="lucide:message-square" size="20" />
              </span>
              <p class="text-[15px] text-ink">No notes on this photo</p>
              <p class="text-[13px] text-ink-3 mt-1 text-balance">Ask for a crop, an edit or a print. Your photographer reads these.</p>
            </div>

            <div v-for="comment in visibleComments" :key="comment.createdAt" class="flex flex-col gap-1">
              <p class="text-[15px] text-ink leading-relaxed whitespace-pre-wrap break-words">{{ comment.notes }}</p>
              <div class="flex items-center gap-2 text-[13px] text-ink-3">
                <span class="truncate">{{ comment.clientName }}</span>
                <span aria-hidden="true">·</span>
                <span class="shrink-0 tabular-nums">{{ formatDate(comment.createdAt) }}</span>
                <button v-if="isOwnComment(comment)" type="button" @click="startEditing(comment)"
                  class="ml-1 min-h-6 px-1 -mx-1 rounded font-medium text-brand hover:underline flex items-center gap-1">
                  <Icon name="lucide:pencil" size="12" />
                  Edit
                </button>
              </div>
            </div>
          </div>

          <!-- Footer / Input -->
          <div v-if="shouldShowInput" class="p-4 pt-3 border-t border-line pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div v-if="isEditing" class="flex items-center justify-between mb-2 text-[13px]">
              <span class="text-ink-2">Editing your note</span>
              <button type="button" @click="cancelEditing" class="min-h-6 px-1 text-ink-3 hover:text-ink">Cancel</button>
            </div>

            <form @submit.prevent="handleSubmit" class="relative">
              <label for="note-input" class="sr-only">Your note</label>
              <textarea
                id="note-input"
                ref="textareaRef"
                v-model="newComment"
                :placeholder="isEditing ? 'Change your note…' : 'Add a note for your photographer…'"
                rows="1"
                class="field block pl-4 pr-12 py-3 resize-none text-[15px] min-h-12 max-h-32"
                @input="autoResize"
                @keydown="handleKeydown"
                @focus.stop
              ></textarea>

              <button type="submit" aria-label="Send note"
                class="absolute right-1.5 bottom-1.5 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                :class="isValid ? 'bg-ink text-card hover:bg-ink-2' : 'bg-inset-2 text-ink-3 cursor-not-allowed'"
                :disabled="!isValid || loading">
                <Icon v-if="loading" name="lucide:loader-2" size="16" class="animate-spin" />
                <Icon v-else name="lucide:arrow-up" size="18" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface ShareComment {
  clientName: string
  notes: string | null
  createdAt: string
}

interface ShareImage {
  id: number
  originalFilename: string
  width: number
  height: number
  createdAt: string
  url: string
  thumbnailUrl: string
  favoriteCount: number
  notesCount?: number
  comments: ShareComment[]
  userFavorite: { id: number; notes: string | null; createdAt: string } | null
}

const props = defineProps<{
  isOpen: boolean
  image: ShareImage | null
  clientName: string
  loading?: boolean
}>()

const emit = defineEmits(['close', 'submit'])

const newComment = ref('')
const isEditing = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const isValid = computed(() => newComment.value.trim().length > 0)

// Filter comments to only show non-empty notes
const visibleComments = computed(() => {
  if (!props.image?.comments) return []
  return props.image.comments.filter((c: ShareComment) => c.notes && c.notes.trim().length > 0)
})

// Check if the user has already commented (with a non-empty note)
const userHasComment = computed(() => {
  if (!props.image?.comments) return false
  return props.image.comments.some((c: ShareComment) => c.clientName === props.clientName && c.notes && c.notes.trim().length > 0)
})

// Show input if user hasn't commented OR if they are currently editing
const shouldShowInput = computed(() => {
  return !userHasComment.value || isEditing.value
})

function isOwnComment(comment: ShareComment) {
  return comment.clientName === props.clientName
}

function startEditing(comment: ShareComment) {
  newComment.value = comment.notes ?? ''
  isEditing.value = true
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
      // Adjust height
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
    }
  })
}

function cancelEditing() {
  isEditing.value = false
  newComment.value = ''
}

function getInitials(name: string) {
  const emojiMatch = name.match(/^(\p{Emoji})/u)
  if (emojiMatch) return emojiMatch[1]
  return name.substring(0, 2).toUpperCase()
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function autoResize(e: Event) {
  const target = e.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = target.scrollHeight + 'px'
}

function handleKeydown(e: KeyboardEvent) {
  // Stop propagation to prevent global shortcuts from triggering
  e.stopPropagation()

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

function handleSubmit() {
  if (!isValid.value || props.loading) return
  
  emit('submit', newComment.value)
  
  // If we were editing, stop editing mode after submit (optimistic)
  // The parent component will update the data, which will trigger userHasComment to be true,
  // hiding the input unless we keep isEditing true. 
  // But usually we want to close the editor.
  if (isEditing.value) {
    isEditing.value = false
  }
  
  newComment.value = ''
  const textarea = document.querySelector('textarea')
  if (textarea) textarea.style.height = 'auto'
}

// Reset state when sidebar closes or image changes
watch(() => props.isOpen, (newVal) => {
  if (!newVal) {
    isEditing.value = false
    newComment.value = ''
  }
})

watch(() => props.image, () => {
  isEditing.value = false
  newComment.value = ''
})
</script>

<style scoped>
.overflow-y-auto { scrollbar-width: thin; scrollbar-color: var(--color-line-2) transparent; }
.notes-panel { animation: notes-up 0.28s var(--ease-soft); }
@media (min-width: 768px) { .notes-panel { animation-name: notes-left; } }
@keyframes notes-up { from { transform: translateY(24px); } }
@keyframes notes-left { from { transform: translateX(24px); } }
@media (prefers-reduced-motion: reduce) { .notes-panel { animation: none; } }
</style>
