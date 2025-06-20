// Memastikan kode berjalan setelah seluruh halaman (DOM) siap.
document.addEventListener('DOMContentLoaded', function () {
    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.ready();

    // =================================================================================
    // PENTING: DIAGNOSIS MASALAH 'TIDAK ADA RESULT'
    // =================================================================================
    // Jika Anda masih mendapatkan 'Tidak ada result', 99% penyebabnya adalah:
    // 1. Kunci API YouTube Anda 'AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0' TIDAK VALID,
    //    SUDAH KADALUWARSA, atau TIDAK DIBERI IZIN (restricted) dengan benar.
    // 2. Batasan (restrictions) pada Kunci API Anda di Google Cloud Console TIDAK
    //    SESUAI dengan domain di mana Web App ini di-hosting.
    // 3. Kuota harian API YouTube Anda HABIS.
    // 4. Ada masalah jaringan yang mencegah Web App menghubungi API YouTube.
    // =================================================================================
    // SOLUSI SEMENTARA (HANYA UNTUK DEBUGGING):
    // Ganti 'AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0' dengan KUNCI API YouTube Anda yang AKTIF.
    // Setelah mendapatkan kunci yang aktif, pastikan untuk mengamankannya di BACKEND.
    // =================================================================================
    const YOUTUBE_API_KEY = 'AIzaSyAo0VMBnd4QL90ZJN7pIEakOhPY1MovE-M'; // GANTI DENGAN KUNCI API ANDA!

    // Selektor Elemen DOM
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const loadingSpinner = document.getElementById('loading');
    const categoryContainer = document.getElementById('categoryContainer');
    const resultsCategoryTitle = document.getElementById('resultsCategoryTitle');
    const resultsCategoryHr = document.getElementById('resultsCategoryHr');

    // Elemen untuk Pemutar Video Inline
    const inlineVideoPlayerContainer = document.getElementById('inlineVideoPlayerContainer');
    const youtubePlayerInlineDiv = document.getElementById('youtubePlayerInline');
    const inlineVideoTitle = document.getElementById('inlineVideoTitle');

    // Variabel untuk YouTube Player dan Playlist
    let youtubePlayerAPI;
    let currentVideoPlaylist = [];
    let currentVideoIndex = -1;

    // Memuat YouTube IFrame API secara asinkron satu kali.
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Fungsi ini akan dipanggil secara otomatis oleh API YouTube setelah siap.
    window.onYouTubeIframeAPIReady = function () {
        console.log('YouTube IFrame Player API is ready.');
        youtubePlayerAPI = new YT.Player('youtubePlayerInline', {
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
            errorMessage = 'Video tidak dapat diputar karena dibatasi oleh pemiliknya atau masalah hak cipta.';
        } else if (event.data === 2) {
            errorMessage = 'ID video yang diberikan tidak valid.';
        }
        tg.showAlert(errorMessage + ' Silakan coba video lain.');
        inlineVideoPlayerContainer.classList.add('d-none');
        inlineVideoTitle.classList.add('d-none');
    }

    // Fungsi untuk memutar video secara inline
    const playVideoInline = (videoId, title, playlist, startIndex) => {
        inlineVideoTitle.textContent = title;
        currentVideoPlaylist = playlist;
        currentVideoIndex = startIndex;

        if (youtubePlayerAPI && typeof youtubePlayerAPI.loadVideoById === 'function') {
            console.log('Memuat video dengan YouTube Player API:', videoId);
            youtubePlayerAPI.loadVideoById(videoId);
        } else {
            console.warn('YouTube Player API belum siap atau gagal. Memuat video langsung ke iframe.');
            youtubePlayerInlineDiv.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }
        inlineVideoPlayerContainer.classList.remove('d-none');
        inlineVideoTitle.classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Fungsi untuk memutar video selanjutnya dalam playlist
    const playNextVideoInPlaylist = () => {
        if (currentVideoPlaylist.length > 0 && currentVideoIndex < currentVideoPlaylist.length - 1) {
            currentVideoIndex++;
            const nextVideo = currentVideoPlaylist[currentVideoIndex];
            const nextVideoId = nextVideo.id;
            const nextVideoTitle = nextVideo.snippet.title;

            console.log(`Memutar video selanjutnya: ${nextVideoTitle} (ID: ${nextVideoId})`);
            inlineVideoTitle.textContent = nextVideoTitle;
            if (youtubePlayerAPI) youtubePlayerAPI.loadVideoById(nextVideoId);
        } else {
            console.log('Playlist habis atau tidak ada video selanjutnya. Menghentikan pemutar.');
            if (youtubePlayerAPI && typeof youtubePlayerAPI.stopVideo === 'function') {
                youtubePlayerAPI.stopVideo();
            }
            inlineVideoPlayerContainer.classList.add('d-none');
            inlineVideoTitle.classList.add('d-none');
        }
    };

    // Fungsi untuk memformat data video dari API agar konsisten
    const normalizeVideoData = (items) => {
        if (!Array.isArray(items)) {
            console.error('normalizeVideoData: Input bukan array', items);
            return [];
        }
        return items.map(item => {
            // Log setiap item untuk inspeksi
            // console.log('Normalizing item:', item);
            return {
                id: typeof item.id === 'object' && item.id.videoId ? item.id.videoId : item.id,
                snippet: item.snippet,
            };
        });
    };

    // Fungsi untuk melakukan pencarian video
    const performSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) {
            tg.showAlert('Mohon masukkan kata kunci pencarian.');
            return;
        }

        // Peringatan jika API Key masih placeholder
        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0') {
            tg.showAlert('Kesalahan: API Key YouTube belum diatur dengan benar atau masih menggunakan placeholder. Periksa konsol browser (F12) untuk panduan debug.');
            console.error('----------------------------------------------------');
            console.error('PERINGATAN KRITIS: API KEY ANDA MASIH PLACEHOLDER!');
            console.error('Ganti `AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0` di `script.js` dengan kunci API YouTube Anda yang valid.');
            console.error('Jika Anda sudah menggantinya dan masih error, pastikan:');
            console.error('  1. Kunci API Anda aktif di Google Cloud Console.');
            console.error('  2. Batasan (Restrictions) pada kunci API Anda (misal: "HTTP referrers") sesuai dengan URL hosting Web App Anda.');
            console.error('  3. Kuota harian API YouTube Anda belum habis.');
            console.error('----------------------------------------------------');
            return;
        }

        showLoading(true);
        const maxResults = 12;
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${YOUTUBE_API_KEY}`;
        
        console.log('Mulai pencarian dengan URL:', apiUrl); // Log URL API
        
        try {
            const response = await fetch(apiUrl);
            console.log('Status respons API:', response.status, response.statusText); // Log status respons
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Data error dari API:', errorData); // Log data error
                throw new Error(`Error ${response.status}: ${errorData.error.message || 'Unknown API error'}`);
            }
            
            const data = await response.json();
            console.log('Data mentah dari API:', data); // Log data mentah
            
            currentVideoPlaylist = normalizeVideoData(data.items);
            currentVideoIndex = -1; // Reset indeks saat playlist baru dimuat
            console.log('Playlist setelah normalisasi:', currentVideoPlaylist); // Log playlist yang dinormalisasi

            if (currentVideoPlaylist.length === 0) {
                console.warn('Pencarian tidak menemukan video.');
                displayResults([], `Hasil Pencarian: "${query}"`); // Tampilkan "tidak ditemukan"
            } else {
                displayResults(currentVideoPlaylist, `Hasil Pencarian: "${query}"`);
            }
        } catch (error) {
            handleFetchError(error, 'Gagal melakukan pencarian');
        } finally {
            showLoading(false);
        }
    };

    // Fungsi untuk menampilkan video populer berdasarkan kategori
    const displayCategoryVideos = async (categoryId, categoryName) => {
        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0') {
            tg.showAlert('Kesalahan: API Key YouTube belum diatur dengan benar atau masih menggunakan placeholder. Periksa konsol browser (F12) untuk panduan debug.');
            console.error('----------------------------------------------------');
            console.error('PERINGATAN KRITIS: API KEY ANDA MASIH PLACEHOLDER!');
            console.error('Ganti `AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0` di `script.js` dengan kunci API YouTube Anda yang valid.');
            console.error('Jika Anda sudah menggantinya dan masih error, pastikan:');
            console.error('  1. Kunci API Anda aktif di Google Cloud Console.');
            console.error('  2. Batasan (Restrictions) pada kunci API Anda (misal: "HTTP referrers") sesuai dengan URL hosting Web App Anda.');
            console.error('  3. Kuota harian API YouTube Anda belum habis.');
            console.error('----------------------------------------------------');
            return;
        }

        showLoading(true);
        let apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=ID&maxResults=12&key=${YOUTUBE_API_KEY}`;
        if (categoryId) {
            apiUrl += `&videoCategoryId=${categoryId}`;
        }
        
        console.log('Mulai memuat kategori dengan URL:', apiUrl); // Log URL API kategori
        
        try {
            const response = await fetch(apiUrl);
            console.log('Status respons API (kategori):', response.status, response.statusText); // Log status respons
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Data error dari API (kategori):', errorData); // Log data error
                throw new Error(`Error ${response.status}: ${errorData.error.message || 'Unknown API error'}`);
            }
            
            const data = await response.json();
            console.log('Data mentah dari API (kategori):', data); // Log data mentah
            
            currentVideoPlaylist = normalizeVideoData(data.items);
            currentVideoIndex = -1; // Reset indeks saat playlist baru dimuat
            console.log('Playlist setelah normalisasi (kategori):', currentVideoPlaylist); // Log playlist yang dinormalisasi

            if (currentVideoPlaylist.length === 0) {
                console.warn('Tidak ada video ditemukan untuk kategori ini.');
                displayResults([], categoryName); // Tampilkan "tidak ditemukan"
            } else {
                displayResults(currentVideoPlaylist, categoryName);
            }
        } catch (error) {
            handleFetchError(error, 'Gagal memuat video populer');
        } finally {
            showLoading(false);
        }
    };
    
    // Fungsi untuk menampilkan hasil video di DOM
    const displayResults = (videos, title = 'Video') => {
        resultsContainer.innerHTML = ''; // Kosongkan kontainer hasil sebelumnya
        if (videos.length === 0) {
            resultsContainer.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted text-lg">Video tidak ditemukan. Coba kata kunci lain atau periksa koneksi internet Anda.</p></div>';
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
                <div class="card video-card h-100 shadow-sm border-0 rounded-lg overflow-hidden" data-video-index="${index}" style="cursor: pointer;">
                    <img src="${thumbnailUrl}" class="card-img-top rounded-t-lg w-full h-auto object-cover" alt="Thumbnail ${videoTitle}">
                    <div class="card-body d-flex flex-column p-3">
                        <h6 class="card-title text-dark mb-2 font-semibold text-truncate-2" title="${videoTitle}">${videoTitle}</h6>
                        <p class="card-text text-muted small mt-auto mb-2"><i class="bi bi-person-circle me-1"></i> ${channelTitle}</p>
                        <div class="d-grid gap-2 mt-2">
                            <button class="btn btn-danger btn-sm play-button rounded-full py-2"><i class="bi bi-play-circle me-1"></i> Putar</button>
                            <button class="btn btn-outline-primary btn-sm download-btn rounded-full py-2"><i class="bi bi-cloud-arrow-down me-1"></i> Unduh</button>
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
            playVideoInline(videoId, videoTitle, currentVideoPlaylist, index);
        } else if (event.target.closest('.download-btn')) {
            event.stopPropagation();
            tg.sendData(JSON.stringify({
                action: 'download',
                videoId: videoId,
                title: videoTitle
            }));
            tg.showAlert(`Permintaan unduh untuk "${videoTitle}" telah dikirim ke bot!`);
        } else {
            playVideoInline(videoId, videoTitle, currentVideoPlaylist, index);
        }
    });
    
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    
    // Fungsi untuk menampilkan kategori dan menangani event klik
    const displayCategories = () => {
        const categories = [
            { id: '10', name: 'Musik' }, { id: '17', name: 'Olahraga' },
            { id: '20', name: 'Gaming' }, { id: '24', name: 'Hiburan' },
            { id: '26', name: 'Tutorial' }, { id: '22', name: 'Blog & Vlogs' },
            { id: '28', name: 'Sains & Teknologi' }, { id: '23', name: 'Komedi' }
        ];

        categoryContainer.innerHTML = '';
        categories.forEach(cat => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-danger btn-sm category-btn rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md transition duration-200';
            button.innerHTML = `<i class="bi bi-tag-fill me-1"></i> ${cat.name}`;
            button.dataset.categoryId = cat.id;
            button.dataset.categoryName = cat.name;
            categoryContainer.appendChild(button);
        });
        
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
            inlineVideoPlayerContainer.classList.add('d-none');
            inlineVideoTitle.classList.add('d-none');
        }
    };

    const handleFetchError = (error, prefix = 'Gagal mengambil data') => {
        console.error(`${prefix}:`, error);
        resultsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger text-center p-4 rounded-lg shadow-sm" role="alert">
                    <h5 class="alert-heading font-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i> ${prefix}!</h5>
                    <p class="mb-0">${error.message}.</p>
                    <p class="text-sm mt-2">Ini sering terjadi karena:
                    <ul>
                        <li><i class="bi bi-key-fill me-1"></i> **API Key tidak valid/kadaluarsa:** Periksa kembali kunci API YouTube Anda di Google Cloud Console.</li>
                        <li><i class="bi bi-globe me-1"></i> **Pembatasan API Key:** Pastikan batasan HTTP referrer (jika ada) sesuai dengan domain hosting Web App ini.</li>
                        <li><i class="bi bi-graph-up me-1"></i> **Kuota API habis:** Anda mungkin telah mencapai batas kuota harian API YouTube Anda.</li>
                        <li><i class="bi bi-wifi-off me-1"></i> **Masalah jaringan:** Periksa koneksi internet Anda.</li>
                    </ul>
                    Lihat konsol browser (F12) untuk detail error lebih lanjut.</p>
                </div>
            </div>`;
        resultsCategoryTitle.classList.add('d-none');
        resultsCategoryHr.classList
