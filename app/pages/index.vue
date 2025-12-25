<template>
  <div class="scroll-smooth">
    <!-- Hero Section -->
    <section class="container mx-auto px-6 mb-32">
        <div class="flex flex-col items-center text-center max-w-5xl mx-auto">
            <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-8 animate-fade-in text-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm">
                Built for Professional Photographers
            </div>

            <h1 class="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8 text-slate-900">
                Share Thousands <br class="hidden md:block" />
                of Photos. <span
                    class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Effortlessly.</span>
            </h1>

            <p class="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                Stop relying on Google Drive or messaging apps. Let your clients browse, pick favorites, and give
                feedback —
                all from one beautiful link.
            </p>

            <div class="flex flex-col sm:flex-row items-center gap-4 mb-20">
                <MagneticButton
                    class="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 w-full sm:w-auto px-8 py-4 rounded-full font-semibold">
                    <span>Download for Free</span>
                </MagneticButton>
                <MagneticButton
                    class="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md w-full sm:w-auto px-8 py-4 rounded-full font-semibold">
                    <span>See How It Works</span>
                    <Icon name="lucide:play" size="16" fill="currentColor" />
                </MagneticButton>
            </div>

            <!-- Hero Visual - Light Mode Browser Mockup -->
            <div class="hero-visual group">
                <div class="hero-glow group-hover:opacity-60"></div>

                <div class="mock-browser">
                    <!-- Mock Browser Header -->
                    <div class="h-12 border-b border-slate-100 bg-slate-50 flex items-center px-4 gap-2">
                        <div class="flex gap-1.5">
                            <div class="w-3 h-3 rounded-full bg-slate-300"></div>
                            <div class="w-3 h-3 rounded-full bg-slate-300"></div>
                            <div class="w-3 h-3 rounded-full bg-slate-300"></div>
                        </div>
                        <div
                            class="ml-4 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs text-slate-400 flex items-center gap-2 flex-1 shadow-sm">
                            <div class="w-3 h-3 rounded-full bg-green-400"></div>
                            lumosnap.com/share/wedding-album
                        </div>
                    </div>

                    <!-- Mock Content -->
                    <div class="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 bg-white">
                        <!-- Left Column: Album Info -->
                        <div class="md:col-span-4 space-y-6 text-left">
                            <div>
                                <div class="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
                                    Portfolio</div>
                                <h3 class="text-3xl font-serif italic text-slate-900 mb-1">Wedding Album</h3>
                                <p class="text-sm text-slate-400">June 12, 2024 • 482 Photos</p>
                            </div>

                            <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
                                <div class="flex items-center gap-3 mb-4">
                                    <div
                                        class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-200">
                                        JD</div>
                                    <div class="text-sm">
                                        <p class="text-slate-900 font-semibold">Jane Doe</p>
                                        <p class="text-slate-500 text-xs">Client Access</p>
                                    </div>
                                </div>
                                <div
                                    class="flex items-center gap-2 text-rose-600 text-sm font-medium bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                                    <Icon name="lucide:heart" size="16" fill="currentColor" />
                                    Picked 47 favorites
                                </div>
                            </div>

                            <div
                                class="flex items-center gap-2 text-emerald-600 text-xs font-medium bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
                                <Icon name="lucide:check-circle-2" size="14" /> Synced to cloud
                            </div>
                        </div>

                        <!-- Right Column: Photo Grid Mockup -->
                        <div class="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <!-- Images -->
                            <!-- Image 1 -->
                            <div
                                class="rounded-xl overflow-hidden aspect-[4/5] relative group/photo shadow-sm hover:shadow-md transition-all">
                                <img src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=400&auto=format&fit=crop"
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                    alt="Wedding">
                                <div
                                    class="absolute inset-0 bg-black/0 group-hover/photo:bg-black/10 transition-colors">
                                </div>
                            </div>
                            <!-- Image 2 (Heart) -->
                            <div
                                class="rounded-xl overflow-hidden aspect-[4/5] relative group/photo shadow-sm hover:shadow-md transition-all ring-4 ring-rose-500 ring-offset-2">
                                <img src="https://images.unsplash.com/photo-1550713450-94c9b4fc9f25?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=400&auto=format&fit=crop"
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                    alt="Wedding">
                                <div
                                    class="absolute top-3 right-3 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-subtle">
                                    <Icon name="lucide:heart" size="14" fill="white" class="text-white" />
                                </div>
                                <div
                                    class="absolute inset-0 bg-black/0 group-hover/photo:bg-black/10 transition-colors">
                                </div>
                            </div>
                            <!-- Image 3 -->
                            <div
                                class="rounded-xl overflow-hidden aspect-[4/5] relative group/photo shadow-sm hover:shadow-md transition-all">
                                <img src="https://images.unsplash.com/flagged/photo-1562616382-b884d7188d8a?q=80&w=3088&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=400&auto=format&fit=crop"
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                    alt="Wedding">
                                <div
                                    class="absolute inset-0 bg-black/0 group-hover/photo:bg-black/10 transition-colors">
                                </div>
                            </div>
                            <!-- Image 4 -->
                            <div
                                class="rounded-xl overflow-hidden aspect-[4/5] relative group/photo shadow-sm hover:shadow-md transition-all">
                                <img src="https://plus.unsplash.com/premium_photo-1675851210020-045950ac0215?q=80&w=973&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=400&auto=format&fit=crop"
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                    alt="Wedding">
                                <div
                                    class="absolute inset-0 bg-black/0 group-hover/photo:bg-black/10 transition-colors">
                                </div>
                            </div>
                            <!-- Image 5 -->
                            <div
                                class="rounded-xl overflow-hidden aspect-[4/5] relative group/photo shadow-sm hover:shadow-md transition-all">
                                <img src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=400&auto=format&fit=crop"
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                    alt="Wedding">
                                <div
                                    class="absolute inset-0 bg-black/0 group-hover/photo:bg-black/10 transition-colors">
                                </div>
                            </div>
                            <!-- Image 6 -->
                            <div
                                class="rounded-xl overflow-hidden aspect-[4/5] relative group/photo shadow-sm hover:shadow-md transition-all">
                                <img src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=400&auto=format&fit=crop"
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                    alt="Wedding">
                                <div
                                    class="absolute inset-0 bg-black/0 group-hover/photo:bg-black/10 transition-colors">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- The Problem Section - Storytelling Version -->
    <section class="container mx-auto px-6 mb-32">
        <div class="mb-20 max-w-2xl mx-auto text-center">
            <h2 class="text-3xl md:text-5xl font-bold mb-6 text-slate-900">
                The Traditional Workflow <br /> is <span class="text-rose-500">Broken</span>.
            </h2>
            <p class="text-slate-600 text-lg">You've captured the perfect moments. But delivering them is where the
                nightmare begins.</p>
        </div>

        <div class="max-w-5xl mx-auto relative">

            <!-- Story Point 1: Uploads (Stuck Bulk Upload) -->
            <div
                class="story-point reveal-on-scroll">
                <!-- Center Marker Line (Desktop) -->
                <div
                    class="timeline-line hidden md:block">
                </div>
                <!-- Mobile Line -->
                <div class="absolute left-8 top-0 bottom-0 w-px bg-slate-200 -z-10 md:hidden"></div>
                <!-- Marker Dot -->
                <div
                    class="timeline-marker text-rose-500">
                    1</div>

                <!-- Text Content -->
                <div class="story-content">
                    <h3 class="text-2xl font-bold mb-3 text-rose-950">The Upload Bottleneck</h3>
                    <p class="text-slate-600 text-lg leading-relaxed">You export 5,000 photos. You drag them to the
                        browser.
                        Then you watch the progress bar crawl. '2 hours remaining' has been on the screen for 4
                        hours.</p>
                </div>

                <!-- Visual Mockup -->
                <div class="story-visual">
                    <div
                        class="story-card group relative overflow-hidden">
                        <div
                            class="flex flex-col h-64 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative font-sans">
                            <!-- Mock Drive Header -->
                            <div
                                class="bg-white border-b border-slate-200 p-3 flex items-center gap-4 shadow-sm z-10">
                                <div class="text-lg font-bold text-slate-700">My Drive</div>
                                <div
                                    class="flex-1 bg-slate-100 h-8 rounded-lg flex items-center px-3 text-slate-400 text-sm">
                                    Search
                                    in Drive</div>
                            </div>

                            <!-- File Grid Background -->
                            <div class="p-4 grid grid-cols-3 gap-3 overflow-hidden opacity-50 pointer-events-none">
                                <div
                                    class="aspect-[4/3] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col p-2 items-center justify-center">
                                    <div class="w-10 h-10 bg-slate-100 rounded mb-2"></div>
                                    <div class="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                                <div
                                    class="aspect-[4/3] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col p-2 items-center justify-center">
                                    <div class="w-10 h-10 bg-slate-100 rounded mb-2"></div>
                                    <div class="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                                <div
                                    class="aspect-[4/3] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col p-2 items-center justify-center">
                                    <div class="w-10 h-10 bg-slate-100 rounded mb-2"></div>
                                    <div class="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                                <div
                                    class="aspect-[4/3] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col p-2 items-center justify-center">
                                    <div class="w-10 h-10 bg-slate-100 rounded mb-2"></div>
                                    <div class="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                                <div
                                    class="aspect-[4/3] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col p-2 items-center justify-center">
                                    <div class="w-10 h-10 bg-slate-100 rounded mb-2"></div>
                                    <div class="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                                <div
                                    class="aspect-[4/3] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col p-2 items-center justify-center">
                                    <div class="w-10 h-10 bg-slate-100 rounded mb-2"></div>
                                    <div class="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                            </div>

                            <!-- Upload Popup (Bottom Right) -->
                            <div
                                class="absolute bottom-0 right-4 w-64 bg-white rounded-t-xl shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.15)] border border-slate-200 border-b-0 overflow-hidden transform transition-transform duration-500 translate-y-0 z-20">
                                <div class="bg-[#333] text-white px-4 py-3 flex justify-between items-center">
                                    <span class="text-sm font-medium">Uploading 4,821 items</span>
                                    <Icon name="lucide:chevron-right" size="16" class="rotate-90 opacity-70" />
                                </div>
                                <div class="p-0">
                                    <!-- Progress Header -->
                                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                        <div class="flex justify-between text-xs text-slate-500 mb-2 font-medium">
                                            <span>Less than 1 eternity remaining </span>
                                            <span>2%</span>
                                        </div>
                                        <div class="h-1 bg-slate-200 rounded-full overflow-hidden mb-1">
                                            <div class="h-full bg-blue-600 w-[2%] rounded-full animate-pulse"></div>
                                        </div>
                                    </div>

                                    <!-- File List -->
                                    <div class="max-h-32 overflow-hidden bg-white relative">
                                        <div
                                            class="flex items-center gap-3 p-3 border-b border-slate-50 hover:bg-slate-50">
                                            <div
                                                class="w-8 h-8 bg-red-50 rounded flex items-center justify-center text-red-500">
                                                <Icon name="lucide:image" size="14" />
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="text-xs font-medium text-slate-700 truncate">
                                                    IMG_8921.RAW</div>
                                                <div class="text-[10px] text-slate-400">45 MB • Waiting...</div>
                                            </div>
                                            <div
                                                class="w-4 h-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin">
                                            </div>
                                        </div>
                                        <div
                                            class="flex items-center gap-3 p-3 border-b border-slate-50 hover:bg-slate-50">
                                            <div
                                                class="w-8 h-8 bg-red-50 rounded flex items-center justify-center text-red-500">
                                                <Icon name="lucide:image" size="14" />
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="text-xs font-medium text-slate-700 truncate">
                                                    IMG_8922.RAW</div>
                                                <div class="text-[10px] text-slate-400">45 MB • Waiting...</div>
                                            </div>
                                            <div
                                                class="w-4 h-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin">
                                            </div>
                                        </div>
                                        <div
                                            class="flex items-center gap-3 p-3 border-b border-slate-50 hover:bg-slate-50">
                                            <div
                                                class="w-8 h-8 bg-red-50 rounded flex items-center justify-center text-red-500">
                                                <Icon name="lucide:image" size="14" />
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="text-xs font-medium text-slate-700 truncate">
                                                    IMG_8923.RAW</div>
                                                <div class="text-[10px] text-slate-400">45 MB • Waiting...</div>
                                            </div>
                                            <div
                                                class="w-4 h-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin">
                                            </div>
                                        </div>
                                        <!-- Gradient Overlay -->
                                        <div
                                            class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Story Point 2: Delivery (Slow Drive Load) -->
            <div
                class="story-point reveal-on-scroll">
                <!-- Center Marker Line (Desktop) -->
                <div
                    class="timeline-line hidden md:block">
                </div>
                <!-- Mobile Line -->
                <div class="absolute left-8 top-0 bottom-0 w-px bg-slate-200 -z-10 md:hidden"></div>
                <!-- Marker Dot -->
                <div
                    class="timeline-marker text-orange-500">
                    2</div>

                <!-- Text Content -->
                <div class="story-content">
                    <h3 class="text-2xl font-bold mb-3 text-orange-950">The Infinite Load</h3>
                    <p class="text-slate-600 text-lg leading-relaxed">You share a Google Drive link. Your client
                        opens it on
                        their phone, but high-res photos load line-by-line like it's 1999. They lose interest fast.
                    </p>
                </div>

                <!-- Visual Mockup -->
                <div class="story-visual">
                    <div
                        class="story-card group relative overflow-hidden">
                        <div
                            class="flex flex-col bg-black border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-72 relative">
                            <!-- Mock Drive Viewer Header -->
                            <div
                                class="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center justify-between z-20">
                                <div class="flex items-center gap-2 text-zinc-400">
                                    <div
                                        class="w-4 h-4 bg-blue-500 rounded text-white flex items-center justify-center text-[10px] font-bold">
                                        G</div>
                                    <span class="text-xs">IMG_8922.JPG</span>
                                </div>
                                <Icon name="lucide:download" size="14" class="text-zinc-500" />
                            </div>

                            <!-- Progressive Loading Simulation -->
                            <div
                                class="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden">
                                <!-- The Image -->
                                <div class="relative w-full h-full">
                                    <img src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop"
                                        class="w-full h-full object-cover" alt="Loading...">
                                    <!-- Scan line effect -->
                                    <div class="absolute inset-0 bg-zinc-900/90 border-t-2 border-blue-500/50 animate-[scan_4s_ease-in-out_infinite]"
                                        style="clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); transform-origin: top;">
                                        <div
                                            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                                            <Icon name="lucide:loader-2" size="24" class="text-blue-500 animate-spin" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Story Point 3: Feedback (WhatsApp Chaos) -->
            <div
                class="story-point reveal-on-scroll">
                <!-- Center Marker Line (Desktop) -->
                <div
                    class="timeline-line hidden md:block">
                </div>
                <!-- Mobile Line -->
                <div class="absolute left-8 top-0 bottom-0 w-px bg-slate-200 -z-10 md:hidden"></div>
                <!-- Marker Dot -->
                <div
                    class="timeline-marker text-amber-500">
                    3</div>

                <!-- Text Content -->
                <div class="story-content">
                    <h3 class="text-2xl font-bold mb-3 text-amber-950">The WhatsApp Chaos</h3>
                    <p class="text-slate-600 text-lg leading-relaxed">Then comes the barrage of WhatsApp messages.
                        'I like the
                        3rd one', 'Edit this one'. You're stuck decoding screenshots and vague texts.</p>
                </div>

                <!-- Visual Mockup -->
                <div class="story-visual">
                    <div
                        class="story-card group relative overflow-hidden max-w-xs">
                        <div
                            class="flex flex-col h-full bg-[#E5DDD5] rounded-2xl overflow-hidden border border-slate-200 font-sans relative">
                            <!-- WhatsApp Header -->
                            <div class="bg-[#075E54] p-3 flex items-center gap-3 text-white shadow-sm z-10">
                                <div class="w-8 h-8 bg-slate-200 rounded-full overflow-hidden">
                                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop"
                                        alt="Client">
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-sm font-bold leading-none">Sarah (Client)</span>
                                    <span class="text-[10px] opacity-80 leading-none mt-1">online</span>
                                </div>
                            </div>

                            <!-- Chat Area -->
                            <div class="p-3 space-y-2 relative overflow-y-auto max-h-96">
                                <!-- Background Pattern Overlay (Subtle) -->
                                <div
                                    class="absolute inset-0 opacity-5 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                                </div>

                                <!-- Message 1 (You - Photographer) -->
                                <div
                                    class="relative z-10 self-end ml-auto bg-[#DCF8C6] p-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%] text-sm text-slate-800 float-right clear-both">
                                    <div>Hey Sarah, did you pick the photos you like?</div>
                                    <div class="text-[10px] text-slate-500 text-right mt-1">2:30 PM ✓✓</div>
                                </div>
                                <div class="clear-both"></div>

                                <!-- Message 2 (Client - Sarah) -->
                                <div
                                    class="relative z-10 self-start bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-sm text-slate-800">
                                    <div>Took me 2 days to download everything 😅 I like the 3rd and 4th with the red dress!</div>
                                    <div class="text-[10px] text-slate-400 text-right mt-1">4:15 PM</div>
                                </div>

                                <!-- Message 3 (You - Photographer) -->
                                <div
                                    class="relative z-10 self-end ml-auto bg-[#DCF8C6] p-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%] text-sm text-slate-800 float-right clear-both">
                                    <div>3rd and 4th? Can you reply to the exact files?</div>
                                    <div class="text-[10px] text-slate-500 text-right mt-1">4:22 PM ✓✓</div>
                                </div>
                                <div class="clear-both"></div>

                                <!-- Message 4 (Client - Sarah frustrated) -->
                                <div
                                    class="relative z-10 self-start bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-sm text-slate-800">
                                    <div>Oh no I have to scroll through all of them again to find them 🥴</div>
                                    <div class="text-[10px] text-slate-400 text-right mt-1">4:25 PM</div>
                                </div>

                                <!-- Message 5 (You - Photographer's desperate attempt) -->
                                <div
                                    class="relative z-10 self-end ml-auto bg-[#DCF8C6] p-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%] text-sm text-slate-800 float-right clear-both">
                                    <div>Maybe try scrolling to the middle? I think the red dress ones are around there...</div>
                                    <div class="text-[10px] text-slate-500 text-right mt-1">4:28 PM ✓✓</div>
                                </div>
                                <div class="clear-both"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </section>

    <!-- Features Bento Grid -->
    <section id="features" class="container mx-auto px-6 mb-32">
        <div class="text-center mb-16 max-w-3xl mx-auto">
            <div
                class="inline-block mb-4 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 text-sm font-semibold">
                Features</div>
            <h2 class="text-3xl md:text-5xl font-bold mb-6 text-slate-900">Everything you need to deliver like a
                pro.</h2>
            <p class="text-slate-500 text-lg">Streamlined workflow from shoot to client approval.</p>
        </div>

        <div class="bento-grid">

            <!-- Feature 1: Instant Cloud Sync (Large Left) -->
            <div class="bento-card bento-large-left group"
                style="transition-delay: 100ms;">
                <div class="relative z-10 h-full w-full">
                    <div class="p-8 pb-0 relative z-20">
                        <div class="p-3 bg-blue-100 w-fit rounded-xl text-blue-600 mb-6">
                            <Icon name="lucide:cloud" size="24" />
                        </div>
                        <h3 class="text-2xl font-bold mb-3 text-slate-900">Instant Cloud Sync</h3>
                        <p class="text-slate-500 leading-relaxed max-w-sm mb-8">
                            Drop your photos into LumoSnap. They're compressed intelligently and synced to the cloud
                            in the
                            background.
                        </p>
                    </div>

                    <!-- Visual -->
                    <div
                        class="absolute bottom-0 left-0 right-0 h-64 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                        <div class="p-6 space-y-4">
                            <div class="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                                <span>Syncing Collection</span>
                                <span class="text-blue-600">84%</span>
                            </div>
                            <!-- Progress Bars -->
                            <div class="space-y-3">
                                <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div class="h-full bg-blue-500 w-[84%] rounded-full animate-pulse"></div>
                                </div>
                                <div class="flex gap-2">
                                    <div class="h-2 w-1/3 bg-slate-100 rounded-full overflow-hidden">
                                        <div class="h-full bg-slate-300 w-full"></div>
                                    </div>
                                    <div class="h-2 w-1/3 bg-slate-100 rounded-full overflow-hidden">
                                        <div class="h-full bg-slate-300 w-full"></div>
                                    </div>
                                    <div class="h-2 w-1/3 bg-slate-100 rounded-full overflow-hidden">
                                        <div class="h-full bg-blue-500 w-[60%] animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-4 gap-2 pt-2 opacity-50">
                                <div class="aspect-square bg-slate-100 rounded-md border border-slate-200"></div>
                                <div class="aspect-square bg-slate-100 rounded-md border border-slate-200"></div>
                                <div class="aspect-square bg-slate-100 rounded-md border border-slate-200"></div>
                                <div class="aspect-square bg-slate-100 rounded-md border border-slate-200"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Feature 2: Client Favorites (Tall Right) -->
            <div class="bento-card bento-tall-right group"
                style="transition-delay: 200ms;">
                <div class="relative z-10 h-full w-full">
                    <div class="relative h-full flex flex-col">
                        <div class="absolute inset-0 z-0">
                            <img src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                                class="w-full h-full object-cover opacity-60" alt="Portrait">
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent">
                            </div>
                        </div>

                        <div class="relative z-10 mt-auto p-8 text-center">
                            <div
                                class="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce mb-6 text-rose-500">
                                <Icon name="lucide:heart" size="28" fill="currentColor" />
                            </div>
                            <h3 class="text-xl font-bold mb-2">Client Favorites</h3>
                            <p class="text-slate-300 text-sm leading-relaxed">
                                Clients pick their favorites with a single tap. No more confusing spreadsheets.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Feature 3: One Link (Wide Top Right) -->
            <div class="bento-card bento-wide group p-8 min-h-[200px]"
                style="transition-delay: 300ms;">
                <div class="relative z-10 h-full w-full">
                    <div class="h-full flex flex-col">
                        <div class="p-3 bg-indigo-100 w-fit rounded-xl text-indigo-600 mb-4">
                            <Icon name="lucide:share-2" size="24" />
                        </div>
                        <h3 class="text-lg font-bold mb-2 text-slate-900">One Link, Infinite Photos</h3>
                        <p class="text-sm text-slate-500">No downloads, no sign-ups, no friction for your clients.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Feature 4: Desktop Sync (Wide Bottom Right) -->
            <div class="bento-card bento-wide group p-8 min-h-[200px]"
                style="transition-delay: 400ms;">
                <div class="relative z-10 h-full w-full">
                    <div class="h-full flex flex-col">
                        <div class="p-3 bg-purple-100 w-fit rounded-xl text-purple-600 mb-4">
                            <Icon name="lucide:monitor" size="24" />
                        </div>
                        <h3 class="text-lg font-bold mb-2 text-slate-900">Real-Time Desktop Sync</h3>
                        <p class="text-sm text-slate-500">Favorites appear instantly on your desktop app, ready for
                            editing.</p>
                    </div>
                </div>
            </div>

        </div>
    </section>

    <!-- How It Works -->
    <section id="how-it-works" class="container mx-auto px-6 mb-32">
        <div class="steps-container">
            <h2 class="text-3xl md:text-4xl font-bold text-center mb-16 text-slate-900">From shoot to selection in 3
                steps
            </h2>

            <div class="steps-grid">
                <!-- Connector Line (Desktop) -->
                <div
                    class="steps-connector-line">
                </div>

                <!-- Step 1 -->
                <div class="step-item group">
                    <div
                        class="step-icon-wrapper">
                        📤
                        <div
                            class="step-badge">
                            1</div>
                    </div>
                    <h3 class="text-xl font-bold mb-3 text-slate-900">Upload Photos</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Create an album in the desktop app and add
                        your photos.
                        They sync automatically.</p>
                </div>

                <!-- Step 2 -->
                <div class="step-item group">
                    <div
                        class="step-icon-wrapper">
                        📧
                        <div
                            class="step-badge">
                            2</div>
                    </div>
                    <h3 class="text-xl font-bold mb-3 text-slate-900">Share Link</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Send the album link to your client. They view
                        and pick
                        favorites instantly.</p>
                </div>

                <!-- Step 3 -->
                <div class="step-item group">
                    <div
                        class="step-icon-wrapper">
                        ✨
                        <div
                            class="step-badge">
                            3</div>
                    </div>
                    <h3 class="text-xl font-bold mb-3 text-slate-900">Receive Favorites</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Their picks appear on your desktop app in
                        real-time. Start
                        editing.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Footer Section -->
    <section class="container mx-auto px-6 pb-20">
        <div class="cta-box">
            <!-- Background Decorations -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div
                    class="cta-decoration cta-bg-1">
                </div>
                <div
                    class="cta-decoration cta-bg-2">
                </div>
            </div>

            <div class="relative z-10 max-w-3xl mx-auto">
                <div
                    class="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-8 border border-white/10 text-3xl">
                    📷
                </div>
                <h2 class="text-4xl md:text-6xl font-bold mb-6">Ready to streamline your workflow?</h2>
                <p class="text-xl text-slate-300 mb-10">Join photographers who've already simplified their client
                    delivery
                    process.</p>

                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        class="px-8 py-4 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                        <Icon name="lucide:monitor" size="20" /> Download for Windows
                    </button>
                    <button
                        class="px-8 py-4 bg-transparent border border-white/20 text-white rounded-full font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                        <Icon name="lucide:monitor" size="20" /> Download for Mac
                    </button>
                </div>
                <p class="mt-6 text-sm text-slate-400 opacity-80">Free to use • No sign-up required to start</p>
            </div>
        </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
    const revealElements = document.querySelectorAll('.reveal-on-scroll, .bento-card')

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible')
                revealObserver.unobserve(entry.target)
            }
        })
    }, { threshold: 0.15 })

    revealElements.forEach(el => revealObserver.observe(el))
})
</script>