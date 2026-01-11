<script setup lang="ts">
definePageMeta({
    layout: false,
})

const route = useRoute()
const api = useApi()

const photographerId = computed(() => String(route.params.photographerId))

// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const showSuccess = ref(false)
const error = ref<string | null>(null)

interface Photographer {
    id: string
    businessName: string
    phone: string
}

const photographer = ref<Photographer | null>(null)

// Form state
const selectedEventType = ref('Wedding')
const form = reactive({
    name: '',
    phone: '',
    eventDate: '',
    location: '',
    details: '',
})

const eventTypes = [
    { id: 'Wedding', label: 'Wedding', icon: 'wedding' },
    { id: 'Pre-Wedding', label: 'Pre-wed', icon: 'camera' },
    { id: 'Birthday', label: 'Birthday', icon: 'cake' },
    { id: 'Baptism', label: 'Baptism', icon: 'baby' },
]

// Fetch photographer on mount
onMounted(async () => {
    const result = await api.getPhotographer(photographerId.value)
    isLoading.value = false
    
    if (result.success && result.data) {
        photographer.value = result.data
    } else {
        error.value = result.error || 'Photographer not found'
    }
})

// Submit booking
async function handleSubmit() {
    if (!form.name || !form.phone || !form.eventDate || !form.location) {
        return
    }
    
    isSubmitting.value = true
    
    const result = await api.createBooking(photographerId.value, {
        eventType: selectedEventType.value,
        name: form.name,
        phone: form.phone,
        eventDate: form.eventDate,
        location: form.location,
        details: form.details || undefined,
    })
    
    isSubmitting.value = false
    
    if (result.success) {
        showSuccess.value = true
        startRedirectTimer()
    } else {
        error.value = result.error || 'Failed to create booking'
    }
}

// Countdown state
const countdown = ref(10)
let timer: NodeJS.Timeout | null = null

// Start redirect timer
function startRedirectTimer() {
    countdown.value = 10
    timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
            cancelTimer()
            navigateTo('/')
        }
    }, 1000)
}

// Cancel timer
function cancelTimer() {
    if (timer) {
        clearInterval(timer)
        timer = null
    }
}

onUnmounted(() => {
    cancelTimer()
})

function resetForm() {
    cancelTimer()
    showSuccess.value = false
    form.name = ''
    form.phone = ''
    form.eventDate = ''
    form.location = ''
    form.details = ''
    selectedEventType.value = 'Wedding'
}
</script>

<template>
    <div class="booking-page">
        <!-- Loading State -->
        <!-- Skeleton Loading State -->
        <div v-if="isLoading" class="booking-container skeleton-container">
            <!-- Sidebar Skeleton -->
            <div class="sidebar skeleton-sidebar">
                <div class="sidebar-content">
                    <div class="skeleton-text skeleton-welcome"></div>
                    <div class="skeleton-text skeleton-brand"></div>
                </div>
            </div>

            <!-- Form Skeleton -->
            <div class="form-section">
                <div class="skeleton-text skeleton-title"></div>
                <div class="skeleton-text skeleton-subtitle"></div>

                <div class="skeleton-text skeleton-label"></div>

                <div class="services-grid">
                    <div class="service-item" v-for="i in 4" :key="i">
                        <div class="icon-box skeleton-box"></div>
                        <div class="skeleton-text skeleton-service-label"></div>
                    </div>
                </div>

                <div class="input-group-row">
                     <div class="input-wrapper" v-for="i in 2" :key="i">
                        <div class="skeleton-text skeleton-label-sm"></div>
                        <div class="input-field skeleton-input"></div>
                     </div>
                </div>
                 <div class="input-group-row">
                     <div class="input-wrapper" v-for="i in 2" :key="i">
                        <div class="skeleton-text skeleton-label-sm"></div>
                        <div class="input-field skeleton-input"></div>
                     </div>
                </div>
                 <div class="input-wrapper details-wrapper">
                    <div class="skeleton-text skeleton-label-sm"></div>
                    <div class="input-field skeleton-input skeleton-textarea"></div>
                </div>
                
                 <div class="btn-submit skeleton-btn"></div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error && !photographer" class="error-container">
            <div class="error-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            </div>
            <h2>Photographer Not Found</h2>
            <p>{{ error }}</p>
        </div>

        <!-- Main Content -->
        <div v-else class="booking-container">
            <!-- Sidebar -->
            <div class="sidebar">
                <div class="sidebar-content">
                    <div class="welcome-text">Welcome to</div>
                    <div class="brand-name">{{ photographer?.businessName || 'Studio' }}</div>
                </div>
            </div>

            <!-- Form Section -->
            <div class="form-section">
                <!-- Success State -->
                <div v-if="showSuccess" class="success-state">
                    <div class="success-checkmark">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline class="check-path" points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h3>Inquiry Sent!</h3>
                    <p>We'll reach out to you shortly.</p>
                    <p class="redirect-text">Redirecting to home in {{ countdown }}s...</p>
                    <button class="btn-back" @click="resetForm">Book Another</button>
                </div>

                <!-- Booking Form -->
                <template v-else>
                    <h2 class="form-title">Let's talk about your event</h2>
                    <p class="form-subtitle">Share a few details and we'll take it from there</p>

                    <span class="section-label">Select the type of event</span>

                    <!-- Event Type Selection -->
                    <div class="services-grid">
                        <div
                            v-for="event in eventTypes"
                            :key="event.id"
                            class="service-item"
                            :class="{ active: selectedEventType === event.id }"
                            @click="selectedEventType = event.id"
                        >
                            <div class="icon-box">
                                <!-- Wedding Icon -->
                                <svg v-if="event.icon === 'wedding'" viewBox="0 0 24 24">
                                    <circle cx="9" cy="9" r="6"></circle>
                                    <circle cx="15" cy="15" r="6"></circle>
                                </svg>
                                <!-- Camera Icon -->
                                <svg v-else-if="event.icon === 'camera'" viewBox="0 0 24 24">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                                <!-- Cake Icon -->
                                <svg v-else-if="event.icon === 'cake'" viewBox="0 0 24 24">
                                    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path>
                                    <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"></path>
                                    <path d="M2 21h20"></path>
                                    <path d="M7 8v2"></path>
                                    <path d="M12 8v2"></path>
                                    <path d="M17 8v2"></path>
                                    <path d="M7 4h.01"></path>
                                    <path d="M12 4h.01"></path>
                                    <path d="M17 4h.01"></path>
                                </svg>
                                <!-- Baby Icon -->
                                <svg v-else-if="event.icon === 'baby'" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                </svg>
                            </div>
                            <span class="service-label">{{ event.label }}</span>
                        </div>
                    </div>

                    <!-- Form -->
                    <form @submit.prevent="handleSubmit">
                        <div class="input-group-row">
                            <div class="input-wrapper">
                                <label>Name</label>
                                <input
                                    v-model="form.name"
                                    type="text"
                                    class="input-field"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                            <div class="input-wrapper">
                                <label>Phone</label>
                                <input
                                    v-model="form.phone"
                                    type="tel"
                                    class="input-field"
                                    placeholder="Mobile number"
                                    required
                                />
                            </div>
                        </div>

                        <div class="input-group-row">
                            <div class="input-wrapper">
                                <label>Tentative date</label>
                                <input
                                    v-model="form.eventDate"
                                    type="date"
                                    class="input-field"
                                    required
                                />
                            </div>
                            <div class="input-wrapper">
                                <label>Location</label>
                                <input
                                    v-model="form.location"
                                    type="text"
                                    class="input-field"
                                    placeholder="City or venue"
                                    required
                                />
                            </div>
                        </div>

                        <div class="input-wrapper details-wrapper">
                            <label>Details</label>
                            <textarea
                                v-model="form.details"
                                class="input-field"
                                placeholder="Anything you'd like us to know?"
                            ></textarea>
                        </div>

                        <!-- Error message -->
                        <p v-if="error" class="error-message">{{ error }}</p>

                        <button type="submit" class="btn-submit" :disabled="isSubmitting">
                            <span v-if="isSubmitting">Sending...</span>
                            <template v-else>
                                Enquire
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </template>
                        </button>
                    </form>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
:root {
    --primary: #0066FF;
    --primary-light: #e6f0ff;
    --primary-hover: #0052cc;
    --bg-body: #F0F2F5;
    --bg-card: #ffffff;
    --text-main: #111827;
    --text-muted: #6b7280;
    --border-color: #e5e7eb;
    --sidebar-overlay: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8));
}

.booking-page {
    min-height: 100vh;
    background-color: #F0F2F5;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Main Container */

.error-container {
    text-align: center;
    padding: 60px 20px;
    background: #ffffff;
    border-radius: 24px;
    box-shadow: 0 20px 40px -5px rgba(0,0,0,0.1);
}

/* Skeleton styles */
@keyframes skeleton-loading {
    0% { background-color: #f3f4f6; }
    50% { background-color: #e5e7eb; }
    100% { background-color: #f3f4f6; }
}

.skeleton-container {
    pointer-events: none;
    opacity: 1;
    animation: none;
}

.skeleton-sidebar {
    background-image: none;
    background-color: #e5e7eb;
}

.skeleton-sidebar::before {
    display: none;
}

.skeleton-text {
    background-color: #e5e7eb;
    border-radius: 6px;
    margin-bottom: 10px;
    animation: skeleton-loading 1.5s infinite ease-in-out;
}

.skeleton-welcome { width: 100px; height: 16px; margin-bottom: 12px; }
.skeleton-brand { width: 200px; height: 48px; }

.skeleton-title { width: 70%; height: 32px; margin-bottom: 16px; }
.skeleton-subtitle { width: 50%; height: 20px; margin-bottom: 32px; }
.skeleton-label { width: 120px; height: 16px; margin-bottom: 16px; }

.skeleton-box {
    background-color: #f3f4f6;
    animation: skeleton-loading 1.5s infinite ease-in-out;
    border: none;
}

.skeleton-service-label { width: 60px; height: 14px; margin-top: 8px; }

.skeleton-label-sm { width: 60px; height: 14px; margin-bottom: 8px; }

.skeleton-input {
    background-color: #f9fafb;
    border-color: #f3f4f6;
    height: 50px;
}

.skeleton-textarea { height: 100px; }

.skeleton-btn {
    height: 56px;
    background-color: #e5e7eb;
    margin-top: 20px;
    animation: skeleton-loading 1.5s infinite ease-in-out;
}

.error-container {
    color: #111827;
}

.error-icon {
    color: #ef4444;
    margin-bottom: 16px;
}

.error-container h2 {
    font-size: 1.5rem;
    margin-bottom: 8px;
}

.error-container p {
    color: #6b7280;
}

/* Main Container */
.booking-container {
    display: flex;
    background: #ffffff;
    width: 100%;
    max-width: 1000px;
    border-radius: 24px;
    box-shadow: 0 20px 40px -5px rgba(0,0,0,0.1);
    overflow: hidden;
    flex-direction: column;
    opacity: 0;
    animation: containerFadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes containerFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Sidebar */
.sidebar {
    background-image: url('https://images.unsplash.com/photo-1607861884586-c7cfaed16290?q=80&w=987&auto=format&fit=crop');
    background-size: cover;
    background-position: center;
    position: relative;
    padding: 40px;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 280px;
}

.sidebar::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8));
    z-index: 1;
}

.sidebar-content {
    position: relative;
    z-index: 2;
}

.welcome-text {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.9;
    margin-bottom: 8px;
}

.brand-name {
    font-size: 3rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 10px;
}

/* Form Section */
.form-section {
    padding: 40px;
    flex: 1;
}

.form-section > * {
    opacity: 0;
    animation: fadeInUp 0.5s ease forwards;
}

.form-title { animation-delay: 0.2s; }
.form-subtitle { animation-delay: 0.3s; }
.section-label { animation-delay: 0.4s; }
.services-grid { animation-delay: 0.5s; }
form { animation-delay: 0.6s; }

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

h2.form-title {
    font-size: 1.5rem;
    color: #111827;
    font-weight: 700;
    margin-bottom: 8px;
}

p.form-subtitle {
    color: #6b7280;
    font-size: 0.95rem;
    margin-bottom: 24px;
    line-height: 1.5;
}

.section-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 12px;
    display: block;
}

/* Services Grid */
.services-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 32px;
}

.service-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    text-align: center;
    padding: 10px 0;
    border-radius: 12px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.icon-box {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: #F3F4F6;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    color: #6b7280;
    border: 2px solid transparent;
}

.icon-box svg {
    width: 28px;
    height: 28px;
    stroke-width: 2;
    stroke: currentColor;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.3s ease;
}

.service-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #6b7280;
    transition: color 0.3s;
}

/* Active State */
.service-item.active .icon-box {
    background-color: #e6f0ff;
    color: #0066FF;
    border-color: #0066FF;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 102, 255, 0.15);
}

.service-item.active .service-label {
    color: #0066FF;
}

/* Hover Effects */
@media (hover: hover) {
    .service-item:hover .icon-box {
        background-color: #e5e7eb;
        transform: translateY(-2px);
    }
    
    .service-item.active:hover .icon-box {
        background-color: #e6f0ff;
    }

    .service-item:nth-child(1):hover svg {
        transform: rotate(15deg) scale(1.1);
    }

    .service-item:nth-child(2):hover svg circle {
        animation: pulse 1s infinite;
    }

    .service-item:nth-child(3):hover svg {
        animation: littleBounce 0.6s ease infinite;
    }

    .service-item:nth-child(4):hover svg {
        transform: rotate(-10deg);
    }
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
}

@keyframes littleBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
}

/* Inputs */
.input-group-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 16px;
}

.input-wrapper {
    display: flex;
    flex-direction: column;
}

.input-wrapper label {
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: #111827;
    margin-left: 2px;
    transition: color 0.2s;
}

.input-field {
    padding: 14px 16px;
    background: #F9FAFB;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    font-size: 1rem;
    color: #111827;
    transition: all 0.2s ease;
    width: 100%;
}

.input-field:focus {
    outline: none;
    background: #fff;
    border-color: #0066FF;
    box-shadow: 0 4px 12px rgba(0, 102, 255, 0.1);
    transform: translateY(-1px);
}

.input-wrapper:focus-within label {
    color: #0066FF;
}

textarea.input-field {
    resize: none;
    min-height: 100px;
}

.details-wrapper {
    margin-bottom: 24px;
}

/* Error Message */
.error-message {
    color: #ef4444;
    font-size: 0.875rem;
    margin-bottom: 16px;
}

/* Submit Button */
.btn-submit {
    background-color: #0066FF;
    color: white;
    border: none;
    padding: 16px;
    width: 100%;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    position: relative;
    overflow: hidden;
}

.btn-submit:hover:not(:disabled) {
    background-color: #0052cc;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 102, 255, 0.25);
}

.btn-submit:active:not(:disabled) {
    transform: scale(0.98);
}

.btn-submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.btn-submit svg {
    transition: transform 0.3s ease;
}

.btn-submit:hover:not(:disabled) svg {
    transform: translateX(4px);
}

/* Success State */
.success-state {
    text-align: center;
    padding: 40px 20px;
    animation: fadeInUp 0.5s ease forwards;
}

.success-checkmark {
    width: 70px;
    height: 70px;
    background: #d1fae5;
    color: #059669;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.check-path {
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: drawCheck 0.6s 0.3s ease forwards;
}

@keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes drawCheck {
    to { stroke-dashoffset: 0; }
}

.success-state h3 {
    font-size: 1.8rem;
    color: #111827;
    margin-bottom: 12px;
    font-weight: 700;
}

.success-state p {
    color: #6b7280;
    font-size: 1.1rem;
    line-height: 1.5;
}

.redirect-text {
    font-size: 0.9rem;
    color: #9ca3af;
    margin-top: 8px;
}

.btn-back {
    margin-top: 30px;
    padding: 12px 24px;
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    color: #6b7280;
    font-weight: 600;
    transition: all 0.2s;
}

.btn-back:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
}

/* Responsive */
@media (min-width: 768px) {
    .booking-container {
        flex-direction: row;
        min-height: 600px;
    }

    .sidebar {
        width: 40%;
        justify-content: center;
        padding: 50px;
    }

    .form-section {
        width: 60%;
        padding: 50px;
        overflow-y: auto;
    }

    .input-group-row {
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .services-grid {
        gap: 20px;
    }
    
    .icon-box {
        width: 70px;
        height: 70px;
    }
}

@media (max-width: 480px) {
    .booking-page {
        padding: 0;
        background-color: #ffffff;
    }
    
    .booking-container {
        border-radius: 0;
        box-shadow: none;
        min-height: 100vh;
    }

    .sidebar {
        min-height: 240px;
        padding: 30px;
    }

    .form-section {
        padding: 30px 24px;
        background: white;
        border-radius: 24px 24px 0 0;
        margin-top: -20px;
        position: relative;
        z-index: 10;
    }
    
    .services-grid {
        gap: 8px;
    }
    
    .icon-box {
        width: 56px;
        height: 56px;
        border-radius: 14px;
    }
    
    .icon-box svg {
        width: 24px;
        height: 24px;
    }
}
</style>
