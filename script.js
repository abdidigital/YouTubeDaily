// Memastikan kode berjalan setelah seluruh halaman (DOM) siap.
document.addEventListener('DOMContentLoaded', function () {
    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.ready();

    const YOUTUBE_API_KEY = 'AIzaSyAo0VMBnd4QL90ZJN7pIEakOhPY1MovE-M'; // <-- TETAP TIDAK AMAN DI SINI, HANYA UNTUK DEV

    // Selektor Elemen DOM
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const loadingSpinner = document.getElementById('loading');
    const categoryContainer = document.getElementById('categoryContainer');
    const resultsCategoryTitle = document.getElementById('resultsCategoryTitle');
    const resultsCategoryHr = document.getElementById('resultsCategoryHr');

    // --- Elemen untuk Pemutar Video Inline (Tanpa Pop-up) ---
    const inlineVideoPlayerContainer = document.getElementById('inlineVideoPlayerContainer');
    const youtubePlayerInlineDiv = document.getElementById('youtubePlayerInline');
    const inlineVideoTitle = document.getElementById('inlineVideoTitle');

    // Variabel untuk YouTube Player dan Playlist
    let youtubePlayerAPI;
    let currentVideoPlaylist = [];
    let currentVideoIndex = -1;

    // Memuat YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Fungsi ini akan dipanggil secara otomatis oleh API YouTube setelah siap.
    window.onYouTubeIframeAPIReady = function () {
        console.log('YouTube IFrame Player API is ready.');
        youtubePlayerAPI = new YT.Player('youtubePlayerInline', { // <-- Targetkan div pemutar inline
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
        // Tidak perlu memutar otomatis di sini, akan dipicu oleh playVideoInline
    }

    function onPlayerStateChange(event) {
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
        tg.showAlert(errorMessage + ' Silakan coba video lain.');
        // Sembunyikan pemutar jika ada error fatal
        inlineVideoPlayerContainer.classList.add('d-none');
        inlineVideoTitle.classList.add('d-none');
    }

    // --- FUNGSI BARU: playVideoInline (menggantikan playVideoInModal) ---
    const playVideoInline = (videoId, title, playlist, startIndex) => {
        inlineVideoTitle.textContent = title;
        currentVideoPlaylist = playlist;
        currentVideoIndex = startIndex;

        if (youtubePlayerAPI && typeof youtubePlayerAPI.loadVideoById === 'function') {
            console.log('Memuat video dengan YouTube Player API:', videoId);
            youtubePlayerAPI.loadVideoById(videoId);
        } else {
            // Fallback jika API belum siap
            youtubePlayerInlineDiv.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/$${videoId}?autoplay=1&rel=0&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            console.warn('YouTube Player API belum siap. Memuat video langsung ke iframe.');
        }

        // Pastikan pemutar terlihat
        inlineVideoPlayerContainer.classList.remove('d-none');
        inlineVideoTitle.classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Gulir ke atas ke pemutar
    };

    // Fungsi untuk memutar video selanjutnya dalam playlist
    const playNextVideoInPlaylist = () => {
        if (currentVideoPlaylist.length > 0 && currentVideoIndex < currentVideoPlaylist.length - 1) {
            currentVideoIndex++;
            const nextVideo = currentVideoPlaylist[currentVideoIndex];
            const nextVideoId = nextVideo.id;
            const nextVideoTitle = nextVideo.snippet.title;

            console.log(`Memutar video selanjutnya: ${nextVideoTitle} (ID: ${nextVideoId})`);
            inlineVideoTitle.textContent = nextVideoTitle; // Update judul
            if (youtubePlayerAPI) youtubePlayerAPI.loadVideoById(nextVideoId);
        } else {
            console.log('Playlist habis atau tidak ada video selanjutnya. Menghentikan pemutar.');
            if (youtubePlayerAPI && typeof youtubePlayerAPI.stopVideo === 'function') {
                youtubePlayerAPI.stopVideo();
            }
            // Sembunyikan pemutar jika playlist habis
            inlineVideoPlayerContainer.classList.add('d-none');
            inlineVideoTitle.classList.add('d-none');
        }
    };

    // Fungsi untuk memformat data video dari API agar konsisten
    const normalizeVideoData = (items) => {
        return items.map(item => ({
            id: typeof item.id === 'object' ? item.id.videoId : item.id,
            snippet: item.snippet,
        }));
    };

    // Fungsi performSearch dan displayCategoryVideos tetap sama
    const performSearch = async () => { /* ... kode yang sama ... */ };
    const displayCategoryVideos = async (categoryId, categoryName) => { /* ... kode yang sama ... */ };

    // Fungsi untuk menampilkan hasil video di DOM
    const displayResults = (videos, title = 'Video') => {
        resultsContainer.innerHTML = '';
        if (videos.length === 0) {
            resultsContainer.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Video tidak ditemukan.</p></div>';
            resultsCategoryTitle.classList.add('d-none');
            resultsCategoryHr.classList.add('d-none');
            return;
        }

        resultsCategoryTitle.textContent = title;
        resultsCategoryTitle.classList.remove('d-none');
        resultsCategoryHr.classList.remove('d-none');

        const fragment = document.createDocumentFragment();
        videos.forEach((video, index) => {
            const videoId = video.id;
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
        if (!video) {
            console.error('Video tidak ditemukan di playlist untuk indeks:', index);
            return;
        }

        const videoId = video.id;
        const videoTitle = video.snippet.title;

        if (event.target.closest('.play-button')) {
            playVideoInline(videoId, videoTitle, currentVideoPlaylist, index); // <-- Panggil fungsi pemutar inline
        } else if (event.target.closest('.download-btn')) {
            event.stopPropagation();
            tg.sendData(JSON.stringify({
                action: 'download',
                videoId: videoId,
                title: videoTitle
            }));
            tg.showAlert(`Permintaan unduh untuk "${videoTitle}" telah dikirim ke bot!`);
        } else {
            // Jika area kartu lain diklik, putar video secara inline
            playVideoInline(videoId, videoTitle, currentVideoPlaylist, index); // <-- Panggil fungsi pemutar inline
        }
    });

    // --- Hapus semua event listener dan logika yang terkait dengan videoModalEl ---
    // Karena tidak ada lagi modal, bagian ini dihapus.
    
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (event) => event.key === 'Enter' && performSearch());
    
    // Fungsi displayCategories tetap sama
    const displayCategories = () => { /* ... kode yang sama ... */ };
    
    // --- Fungsi Helper dan Inisialisasi ---

    const showLoading = (isLoading) => {
        loadingSpinner.classList.toggle('d-none', !isLoading);
        if (isLoading) {
            resultsContainer.innerHTML = '';
            resultsCategoryTitle.classList.add('d-none');
            resultsCategoryHr.classList.add('d-none');
            // Sembunyikan pemutar inline saat loading
            inlineVideoPlayerContainer.classList.add('d-none');
            inlineVideoTitle.classList.add('d-none');
        }
    };

    const handleFetchError = (error, prefix = 'Gagal mengambil data') => {
        console.error(`${prefix}:`, error);
        resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert"><strong>${prefix}:</strong> ${error.message}<br>Pastikan API Key Anda valid dan tidak ada batasan domain/referrer.</div>`;
        resultsCategoryTitle.classList.add('d-none');
        resultsCategoryHr.classList.add('d-none');
        // Sembunyikan pemutar inline jika ada error
        inlineVideoPlayerContainer.classList.add('d-none');
        inlineVideoTitle.classList.add('d-none');
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
    displayCategoryVideos(null, 'Video Populer di Indonesia');

});
