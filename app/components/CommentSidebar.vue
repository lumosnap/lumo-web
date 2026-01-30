<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-[200000] flex justify-end isolate">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/20 backdrop-blur-sm"
          @click="$emit('close')"
        ></div>

        <!-- Sidebar -->
        <div 
          class="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out"
          :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
        >
          <!-- Header -->
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
            <div class="flex items-center gap-3 overflow-hidden">
              <!-- Image Preview -->
              <div class="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                <img 
                  v-if="image" 
                  :src="image.thumbnailUrl || image.url" 
                  class="w-full h-full object-cover"
                  alt="Preview"
                />
              </div>
              
              <!-- Info -->
              <div class="flex flex-col">
                <h3 class="text-sm font-bold text-slate-900">Comments</h3>
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <span v-if="image" class="flex items-center gap-1">
                    <Icon name="lucide:heart" size="10" :class="image.userFavorite ? 'text-rose-500 fill-rose-500' : 'text-slate-400'" />
                    {{ image.favoriteCount || 0 }}
                  </span>
                  <span>•</span>
                  <span>{{ image?.notesCount || 0 }} comments</span>
                </div>
              </div>
            </div>

            <button 
              @click="$emit('close')"
              class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <Icon name="lucide:x" size="18" />
            </button>
          </div>

          <!-- Comments List -->
          <div class="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
            <div v-if="!visibleComments.length" class="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
              <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Icon name="lucide:message-square" size="24" class="text-slate-300" />
              </div>
              <p class="text-sm font-medium text-slate-600">No comments yet</p>
              <p class="text-xs mt-1">Start the conversation.</p>
            </div>

            <div 
              v-for="comment in visibleComments" 
              :key="comment.createdAt"
              class="flex flex-col gap-1 group"
            >
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-base text-slate-900 leading-relaxed whitespace-pre-wrap break-words font-medium">{{ comment.notes }}</p>
                
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs text-slate-400 font-medium">{{ comment.clientName }}</span>
                  <span class="text-[10px] text-slate-300">•</span>
                  <span class="text-[10px] text-slate-300">{{ formatDate(comment.createdAt) }}</span>
                  
                  <!-- Edit Action -->
                  <button 
                    v-if="isOwnComment(comment)" 
                    @click="startEditing(comment)"
                    class="ml-2 text-[10px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
                  >
                    <Icon name="lucide:pencil" size="10" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer / Input -->
          <div v-if="shouldShowInput" class="p-4 bg-white border-t border-slate-100 animate-fade-in">
            <div v-if="isEditing" class="flex items-center justify-between mb-2 text-xs">
              <span class="font-medium text-slate-500">Editing your comment</span>
              <button @click="cancelEditing" class="text-slate-400 hover:text-slate-600">Cancel</button>
            </div>
            
            <form @submit.prevent="handleSubmit" class="relative">
              <textarea
                ref="textareaRef"
                v-model="newComment"
                :placeholder="isEditing ? 'Update your comment...' : 'Add a comment...'"
                rows="1"
                class="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none text-sm text-slate-900 placeholder:text-slate-400 min-h-[48px] max-h-32"
                @input="autoResize"
                @keydown="handleKeydown"
                @focus.stop
              ></textarea>
              
              <button 
                type="submit"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                :class="isValid ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'"
                :disabled="!isValid || loading"
              >
                <Icon v-if="loading" name="lucide:loader-2" size="16" class="animate-spin" />
                <Icon v-else name="lucide:send" size="16" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  image: any | null
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
  return props.image.comments.filter((c: any) => c.notes && c.notes.trim().length > 0)
})

// Check if the user has already commented (with a non-empty note)
const userHasComment = computed(() => {
  if (!props.image?.comments) return false
  return props.image.comments.some((c: any) => c.clientName === props.clientName && c.notes && c.notes.trim().length > 0)
})

// Show input if user hasn't commented OR if they are currently editing
const shouldShowInput = computed(() => {
  return !userHasComment.value || isEditing.value
})

function isOwnComment(comment: any) {
  return comment.clientName === props.clientName
}

function startEditing(comment: any) {
  newComment.value = comment.notes
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
/* Hide scrollbar for clean look */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
</style>
