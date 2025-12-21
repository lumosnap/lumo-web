<template>
  <div>
    <!-- Hero Section -->
    <section class="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
      <!-- Background Elements -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 -right-32 w-96 h-96 bg-[var(--color-accent)] opacity-5 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 -left-32 w-80 h-80 bg-[var(--color-teal)] opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div class="container relative z-10">
        <div class="max-w-3xl mx-auto text-center">
          <div class="animate-fade-in">
            <span class="inline-block px-4 py-2 mb-6 text-sm font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full border border-[var(--color-accent)]/20">
              Built for Professional Photographers
            </span>
          </div>
          
          <h1 class="animate-fade-in-delay-1 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
            Share Thousands of Photos.
            <span class="text-accent-gradient">Effortlessly.</span>
          </h1>
          
          <p class="animate-fade-in-delay-2 text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10">
            Stop relying on Google Drive or messaging apps. Let your clients browse, pick favorites, and give feedback — all from one beautiful link.
          </p>
          
          <div class="animate-fade-in-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#download" class="btn btn-primary text-base py-3 px-8">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              Download for Free
            </a>
            <a href="#how-it-works" class="btn btn-secondary text-base py-3 px-8">
              See How It Works
            </a>
          </div>
        </div>

        <!-- Hero Visual -->
        <div class="mt-16 md:mt-24 animate-fade-in-delay-3">
          <div class="relative max-w-4xl mx-auto">
            <div class="card-elevated p-4 md:p-6 glow-accent">
              <div class="aspect-video bg-[var(--color-bg-tertiary)] rounded-lg overflow-hidden flex items-center justify-center">
                <div class="text-center p-8">
                  <div class="text-6xl mb-4">📸</div>
                  <p class="text-[var(--color-text-muted)] text-sm">Your photo albums, beautifully presented</p>
                </div>
              </div>
            </div>
            <!-- Floating Elements -->
            <div class="absolute -top-6 -right-6 card p-4 shadow-xl animate-float hidden md:block">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
                  <span class="text-xl">❤️</span>
                </div>
                <div>
                  <p class="text-sm font-medium">Client picked 47 photos</p>
                  <p class="text-xs text-[var(--color-text-muted)]">Wedding Album</p>
                </div>
              </div>
            </div>
            <div class="absolute -bottom-4 -left-4 card p-3 shadow-xl hidden md:block" style="animation: float 6s ease-in-out 1s infinite;">
              <div class="flex items-center gap-2">
                <span class="text-lg">✅</span>
                <span class="text-sm">Synced to cloud</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>

    <!-- Problem Section -->
    <section class="section bg-[var(--color-bg-secondary)]">
      <div class="container">
        <div class="max-w-3xl mx-auto text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-4">
            Sharing photos shouldn't be this hard
          </h2>
          <p class="text-[var(--color-text-secondary)] text-lg">
            You've captured the perfect moments. Now what?
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div class="card p-6">
            <div class="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
              <span class="text-2xl">😤</span>
            </div>
            <h3 class="text-lg font-semibold mb-2">Slow Uploads</h3>
            <p class="text-[var(--color-text-secondary)] text-sm">
              Uploading 5,000+ high-res photos to Google Drive takes forever — and that's if it doesn't fail halfway.
            </p>
          </div>

          <div class="card p-6">
            <div class="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
              <span class="text-2xl">😵</span>
            </div>
            <h3 class="text-lg font-semibold mb-2">Client Downloads Everything</h3>
            <p class="text-[var(--color-text-secondary)] text-sm">
              Your clients have to download every single photo just to see them? That's 50GB+ of frustration.
            </p>
          </div>

          <div class="card p-6">
            <div class="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4">
              <span class="text-2xl">🤯</span>
            </div>
            <h3 class="text-lg font-semibold mb-2">Tracking Favorites</h3>
            <p class="text-[var(--color-text-secondary)] text-sm">
              "I like photo 234, 567, and... wait, which one was that again?" — every client, ever.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="section">
      <div class="container">
        <div class="max-w-3xl mx-auto text-center mb-16">
          <span class="inline-block px-3 py-1 mb-4 text-xs font-medium text-[var(--color-teal)] bg-[var(--color-teal)]/10 rounded-full">
            Features
          </span>
          <h2 class="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to deliver photos like a pro
          </h2>
          <p class="text-[var(--color-text-secondary)] text-lg">
            Streamlined workflow from shoot to client approval.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 lg:gap-8">
          <div class="card p-8">
            <div class="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center mb-6">
              <span class="text-3xl">☁️</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Instant Cloud Sync</h3>
            <p class="text-[var(--color-text-secondary)]">
              Drop your photos into LumoSnap. They're compressed intelligently and synced to the cloud in the background. Keep shooting, we'll handle the rest.
            </p>
          </div>

          <div class="card p-8">
            <div class="w-14 h-14 rounded-2xl bg-[var(--color-teal)]/10 flex items-center justify-center mb-6">
              <span class="text-3xl">🔗</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">One Link, Infinite Photos</h3>
            <p class="text-[var(--color-text-secondary)]">
              Share a single link with your client. They can browse all photos in a beautiful web gallery — no downloads, no sign-ups, no friction.
            </p>
          </div>

          <div class="card p-8">
            <div class="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6">
              <span class="text-3xl">❤️</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Client Favorites</h3>
            <p class="text-[var(--color-text-secondary)]">
              Clients pick their favorites with a single tap. No more confusing spreadsheets or "I like photo number 1234" messages.
            </p>
          </div>

          <div class="card p-8">
            <div class="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6">
              <span class="text-3xl">🖥️</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Real-Time Desktop Sync</h3>
            <p class="text-[var(--color-text-secondary)]">
              See which photos your clients picked — right in the desktop app. Their favorites appear instantly, ready for editing.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="section bg-[var(--color-bg-secondary)]">
      <div class="container">
        <div class="max-w-3xl mx-auto text-center mb-16">
          <span class="inline-block px-3 py-1 mb-4 text-xs font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
            How It Works
          </span>
          <h2 class="text-3xl md:text-4xl font-bold mb-4">
            From shoot to selection in 3 steps
          </h2>
        </div>

        <div class="max-w-4xl mx-auto">
          <div class="grid md:grid-cols-3 gap-8">
            <!-- Step 1 -->
            <div class="text-center">
              <div class="relative mb-6">
                <div class="w-20 h-20 mx-auto rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] flex items-center justify-center">
                  <span class="text-4xl">📤</span>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-accent)] text-black font-bold text-sm flex items-center justify-center">
                  1
                </div>
              </div>
              <h3 class="text-lg font-semibold mb-2">Upload Photos</h3>
              <p class="text-[var(--color-text-secondary)] text-sm">
                Create an album in the desktop app and add your photos. They sync automatically.
              </p>
            </div>

            <!-- Step 2 -->
            <div class="text-center">
              <div class="relative mb-6">
                <div class="w-20 h-20 mx-auto rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] flex items-center justify-center">
                  <span class="text-4xl">📧</span>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-accent)] text-black font-bold text-sm flex items-center justify-center">
                  2
                </div>
              </div>
              <h3 class="text-lg font-semibold mb-2">Share Link</h3>
              <p class="text-[var(--color-text-secondary)] text-sm">
                Send the album link to your client. They view and pick favorites instantly.
              </p>
            </div>

            <!-- Step 3 -->
            <div class="text-center">
              <div class="relative mb-6">
                <div class="w-20 h-20 mx-auto rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center glow-accent">
                  <span class="text-4xl">✨</span>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-accent)] text-black font-bold text-sm flex items-center justify-center">
                  3
                </div>
              </div>
              <h3 class="text-lg font-semibold mb-2">Receive Favorites</h3>
              <p class="text-[var(--color-text-secondary)] text-sm">
                Their picks appear on your desktop app in real-time. Start editing the photos that matter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Download CTA Section -->
    <section id="download" class="section">
      <div class="container">
        <div class="max-w-3xl mx-auto text-center">
          <div class="card-elevated p-12 md:p-16 glow-accent relative overflow-hidden">
            <!-- Background decoration -->
            <div class="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent)] opacity-5 rounded-full blur-3xl"></div>
            
            <span class="text-6xl mb-6 block">📷</span>
            <h2 class="text-3xl md:text-4xl font-bold mb-4">
              Ready to streamline your workflow?
            </h2>
            <p class="text-[var(--color-text-secondary)] text-lg mb-8 max-w-lg mx-auto">
              Join photographers who've already simplified their client delivery process.
            </p>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#" class="btn btn-primary text-base py-4 px-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                Download for Windows
              </a>
              <a href="#" class="btn btn-secondary text-base py-4 px-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                Download for Mac
              </a>
            </div>
            
            <p class="text-[var(--color-text-muted)] text-sm mt-6">
              Free to use • No sign-up required to start
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Uses default layout automatically
</script>