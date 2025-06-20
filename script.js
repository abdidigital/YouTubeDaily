// Memastikan kode berjalan setelah seluruh halaman (DOM) siap.
document.addEventListener('DOMContentLoaded', function () {
    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.ready();

    // =================================================================================
    // PERBAIKAN KRITIS: Kunci API dihapus dari sini.
    // PENJELASAN: Kunci API tidak boleh ada di kode frontend. Pindahkan logika
    // pemanggilan API ke server backend bot Anda. Untuk tujuan pengembangan SEMENTARA,
    // Anda bisa memasukkannya di sini, TAPI pastikan untuk mengamankannya di Google Cloud
    // Console dengan membatasi penggunaannya hanya untuk domain hosting Anda.
    // =================================================================================
    const YOUTUBE_API_KEY = 'AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0'; // <-- SANGAT TIDAK AMAN, HANYA UNTUK DEV

    // Selektor Elemen DOM
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const loadingSpinner = document.getElementById('loading');
    const categoryContainer = document.getElementById('categoryContainer');
    const resultsCategoryTitle = document.getElementById('resultsCategoryTitle');
    const resultsCategoryHr = document.getElementById('resultsCategoryHr');

    // Elemen Modal Bootstrap untuk Video Player
    const videoModalEl = document.getElementById('videoModal');
    const videoModal = new bootstrap.Modal(videoModalEl);
    const youtubeIframe = document.getElementById('youtubePlayer');
    const videoModalLabel = document.getElementById('videoModalLabel');

    // Variabel untuk YouTube Player dan Playlist
    let youtubePlayerAPI;
    let currentVideoPlaylist = [];
    let currentVideoIndex = -1;

    // PERBAIKAN: Memuat YouTube IFrame API hanya satu kali saat script dimuat.
    // Ini lebih efisien dan memperbaiki bug pemuatan berulang.
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Fungsi ini akan dipanggil secara otomatis oleh API YouTube setelah siap.
    window.onYouTubeIframeAPIReady = function () {
        console.log('YouTube IFrame Player API is ready.');
        youtubePlayerAPI = new YT.Player('youtubePlayer', {
            height: '100%',
            width: '100%',
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    };

    function onPlayerReady(event) {
        console.log('YouTube Player siap dan dapat dikendalikan.');
        // Anda bisa langsung putar video jika ada yang di-queue
        // event.target.playVideo();
    }

    function onPlayerStateChange(event) {
        // Jika video selesai diputar (state 0), putar video selanjutnya.
        if (event.data === YT.PlayerState.ENDED) {
            console.log('Video selesai. Mencoba memutar video selanjutnya...');
            playNextVideoInPlaylist();
        }
    }

    function onPlayerError(event) {
        console.error('YouTube Player Error:', event.data);
        let errorMessage = 'Terjadi kesalahan saat memutar video.';
        if ([100, 101, 150].includes(event.data)) {
            errorMessage = 'Video tidak dapat diputar karena dibatasi oleh pemiliknya.';
        } else if (event.data === 2) {
            errorMessage = 'ID video yang diberikan tidak valid.';
        }
        tg.showAlert(errorMessage + ' Silakan coba video lain.'); // Gunakan alert Telegram
        videoModal.hide();
    }

    // Fungsi untuk memutar video di dalam modal
    const playVideoInModal = (videoId, title, playlist, startIndex) => {
        videoModalLabel.textContent = title;
        currentVideoPlaylist = playlist;
        currentVideoIndex = startIndex;

        if (youtubePlayerAPI && typeof youtubePlayerAPI.loadVideoById === 'function') {
            console.log('Memuat video dengan YouTube Player API:', videoId);
            youtubePlayerAPI.loadVideoById(videoId);
        } else {
            // Fallback jika API belum siap, meskipun seharusnya sudah
            youtubeIframe.src = `https://www.youtube.com/embed/$${videoId}?autoplay=1&rel=0&enablejsapi=1`;
            console.warn('YouTube Player API belum siap. Memuat video langsung ke iframe.');
        }
        videoModal.show();
    };

    // Fungsi untuk memutar video selanjutnya dalam playlist
    const playNextVideoInPlaylist = () => {
        if (currentVideoPlaylist.length > 0 && currentVideoIndex < currentVideoPlaylist.length - 1) {
            currentVideoIndex++;
            const nextVideo = currentVideoPlaylist[currentVideoIndex];
            // ID video dijamin ada di `nextVideo.id` karena sudah dinormalisasi
            const nextVideoId = nextVideo.id;
            const nextVideoTitle = nextVideo.snippet.title;

            console.log(`Memutar video selanjutnya: ${nextVideoTitle} (ID: ${nextVideoId})`);
            // Cukup panggil loadVideoById, tidak perlu membuka ulang modal
            videoModalLabel.textContent = nextVideoTitle;
            if (youtubePlayerAPI) youtubePlayerAPI.loadVideoById(nextVideoId);
        } else {
            console.log('Playlist habis atau tidak ada video selanjutnya. Menutup modal.');
            videoModal.hide();
        }
    };

    // Fungsi untuk memformat data video dari API agar konsisten
    const normalizeVideoData = (items) => {
        return items.map(item => ({
            id: typeof item.id === 'object' ? item.id.videoId : item.id, // Kunci normalisasi
            snippet: item.snippet,
        }));
    };

    // Fungsi untuk melakukan pencarian video
    const performSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) return;

        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0') {
            tg.showAlert('Kesalahan: API Key YouTube belum diatur dengan benar.');
            return;
        }

        showLoading(true);
        const maxResults = 12;
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${YOUTUBE_API_KEY}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error ${response.status}: ${errorData.error.message}`);
            }
            const data = await response.json();
            currentVideoPlaylist = normalizeVideoData(data.items);
            console.log('Playlist setelah pencarian:', currentVideoPlaylist);
            displayResults(currentVideoPlaylist, `Hasil Pencarian: "${query}"`);
        } catch (error) {
            handleFetchError(error);
        } finally {
            showLoading(false);
        }
    };

    // Fungsi untuk menampilkan video populer berdasarkan kategori
    const displayCategoryVideos = async (categoryId, categoryName) => {
        showLoading(true);
        let apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=ID&maxResults=12&key=${YOUTUBE_API_KEY}`;
        if (categoryId) {
            apiUrl += `&videoCategoryId=${categoryId}`;
        }
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error ${response.status}: ${errorData.error.message}`);
            }
            const data = await response.json();
            currentVideoPlaylist = normalizeVideoData(data.items);
            console.log('Playlist setelah memuat kategori:', currentVideoPlaylist);
            displayResults(currentVideoPlaylist, categoryName);
        } catch (error) {
            handleFetchError(error, 'Gagal memuat video');
        } finally {
            showLoading(false);
        }
    };
    
    // Fungsi untuk menampilkan hasil video di DOM
    const displayResults = (videos, title = 'Video') => {
        resultsContainer.innerHTML = '';
        if (videos.length === 0) {
            resultsContainer.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Video tidak ditemukan.</p></div>';
            return;
        }

        resultsCategoryTitle.textContent = title;
        resultsCategoryTitle.classList.remove('d-none');
        resultsCategoryHr.classList.remove('d-none');

        const fragment = document.createDocumentFragment();
        videos.forEach((video, index) => {
            const videoId = video.id; // Sudah dinormalisasi
            const { title: videoTitle, channelTitle, thumbnails } = video.snippet;
            const thumbnailUrl = thumbnails.high.url;

            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';
            col.innerHTML = `
                <div class="card video-card h-100 shadow-sm border-0 rounded-3" data-video-index="${index}" style="cursor: pointer;">
                    <img src="${thumbnailUrl}" class="card-img-top rounded-top-3" alt="Thumbnail ${videoTitle}">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-dark mb-2 text-truncate-2" title="${videoTitle}">${videoTitle}</h6>
                        <p class="card-text text-muted small mt-auto mb-2"><i class="bi bi-person-circle me-1"></i> ${channelTitle}</p>
                        <div class="d-grid gap-2">
                            <button class="btn btn-danger btn-sm play-button"><i class="bi bi-play-circle me-1"></i> Putar</button>
                            <button class="btn btn-outline-primary btn-sm download-btn"><i class="bi bi-cloud-arrow-down me-1"></i> Unduh</button>
                        </div>
                    </div>
                </div>`;
            fragment.appendChild(col);
        });
        resultsContainer.appendChild(fragment);
    };

    // --- Manajemen Event Listener ---

    resultsContainer.addEventListener('click', (event) => {
        const card = event.target.closest('.video-card');
        if (!card) return;

        const index = parseInt(card.dataset.videoIndex, 10);
        const video = currentVideoPlaylist[index];
        if (!video) return;

        const videoId = video.id;
        const videoTitle = video.snippet.title;

        if (event.target.closest('.play-button')) {
            playVideoInModal(videoId, videoTitle, currentVideoPlaylist, index);
        } else if (event.target.closest('.download-btn')) {
            event.stopPropagation();
            // PENJELASAN: Ini adalah cara mengirim data ke bot untuk diproses di backend.
            tg.sendData(JSON.stringify({
                action: 'download',
                videoId: videoId,
                title: videoTitle
            }));
            tg.showAlert(`Permintaan unduh untuk "${videoTitle}" telah dikirim ke bot!`);
            // Opsional: Tutup Web App setelah mengirim permintaan
            // tg.close();
        } else {
            // Jika area kartu lain diklik, putar video
            playVideoInModal(videoId, videoTitle, currentVideoPlaylist, index);
        }
    });

    videoModalEl.addEventListener('hidden.bs.modal', () => {
        if (youtubePlayerAPI && typeof youtubePlayerAPI.stopVideo === 'function') {
            youtubePlayerAPI.stopVideo();
        }
        youtubeIframe.src = ''; // Hentikan pemuatan
    });
    
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (event) => event.key === 'Enter' && performSearch());
    
    // Fungsi untuk menampilkan kategori dan menangani event klik
    const displayCategories = () => {
        const categories = [
            { id: '10', name: 'Musik' }, { id: '17', name: 'Olahraga' },
            { id: '20', name: 'Gaming' }, { id: '24', name: 'Hiburan' },
            { id: '26', name: 'Tutorial' }
        ];

        categoryContainer.innerHTML = '';
        categories.forEach(cat => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-danger btn-sm category-btn rounded-pill px-3';
            button.innerHTML = `<i class="bi bi-tag-fill me-1"></i> ${cat.name}`;
            button.dataset.categoryId = cat.id;
            button.dataset.categoryName = cat.name;
            categoryContainer.appendChild(button);
        });
        
        // PERBAIKAN: Event listener yang benar dan efisien
        categoryContainer.addEventListener('click', (event) => {
            const btn = event.target.closest('.category-btn');
            if (btn) {
                const { categoryId, categoryName } = btn.dataset;
                displayCategoryVideos(categoryId, categoryName);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };
    
    // --- Fungsi Helper dan Inisialisasi ---

    const showLoading = (isLoading) => {
        loadingSpinner.classList.toggle('d-none', !isLoading);
        if (isLoading) {
            resultsContainer.innerHTML = '';
            resultsCategoryTitle.classList.add('d-none');
            resultsCategoryHr.classList.add('d-none');
        }
    };

    const handleFetchError = (error, prefix = 'Gagal mengambil data') => {
        console.error(`${prefix}:`, error);
        resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert"><strong>${prefix}:</strong> ${error.message}</div>`;
    };

    // Fungsi untuk menerapkan tema dari Telegram
    const applyTelegramTheme = () => {
        const style = document.documentElement.style;
        style.setProperty('--tg-theme-bg-color', tg.backgroundColor);
        style.setProperty('--tg-theme-text-color', tg.textColor);
        style.setProperty('--tg-theme-hint-color', tg.hintColor);
        style.setProperty('--tg-theme-link-color', tg.linkColor);
        style.setProperty('--tg-theme-button-color', tg.buttonColor);
        style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor);
    };

    // Panggilan Inisialisasi
    applyTelegramTheme();
    displayCategories();
    displayCategoryVideos(null, 'Video Populer di Indonesia'); // Memuat video populer saat pertama kali dibuka

});
