// Memastikan kode berjalan setelah seluruh halaman (DOM) siap.
document.addEventListener('DOMContentLoaded', function () {
    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.ready();

    // =================================================================================
    // PERINGATAN KRITIS: Kunci API YouTube Anda TERTANAM LANGSUNG di kode frontend ini.
    // Ini adalah RESIKO KEAMANAN YANG SANGAT SERIUS karena siapa pun dapat melihat
    // dan menyalahgunakan kunci Anda.
    // SOLUSI WAJIB: Pindahkan SEMUA LOGIKA pemanggilan API YouTube ke server backend
    // bot Telegram Anda (misalnya, menggunakan Node.js, Python, PHP, dll.).
    // Klien (Web App ini) harus berkomunikasi dengan backend Anda, dan backend Anda
    // yang akan memanggil API YouTube menggunakan kunci yang aman di sisi server.
    // Untuk tujuan pengembangan SEMENTARA dan DEMONSTRASI, kunci ini tetap ada,
    // TAPI PASTIKAN UNTUK MENGAMANKANNYA DI GOOGLE CLOUD CONSOLE dengan membatasi
    // penggunaannya hanya untuk domain hosting Anda atau IP server backend Anda.
    // =================================================================================
    const YOUTUBE_API_KEY = 'AIzaSyAo0VMBnd4QL90ZJN7pIEakOhPY1MovE-M'; // <-- SANGAT TIDAK AMAN, HANYA UNTUK DEV

    // Selektor Elemen DOM
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const loadingSpinner = document.getElementById('loading');
    const categoryContainer = document.getElementById('categoryContainer');
    const resultsCategoryTitle = document.getElementById('resultsCategoryTitle');
    const resultsCategoryHr = document.getElementById('resultsCategoryHr');

    // Elemen untuk Pemutar Video Inline (Tanpa Pop-up)
    const inlineVideoPlayerContainer = document.getElementById('inlineVideoPlayerContainer');
    const youtubePlayerInlineDiv = document.getElementById('youtubePlayerInline'); // Div untuk inisialisasi YT.Player
    const inlineVideoTitle = document.getElementById('inlineVideoTitle');

    // Variabel untuk YouTube Player dan Playlist
    let youtubePlayerAPI;
    let currentVideoPlaylist = [];
    let currentVideoIndex = -1;

    // Memuat YouTube IFrame API secara asinkron satu kali.
    // URL yang benar adalah "https://www.youtube.com/iframe_api".
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Fungsi ini akan dipanggil secara otomatis oleh API YouTube setelah siap.
    window.onYouTubeIframeAPIReady = function () {
        console.log('YouTube IFrame Player API is ready.');
        // Inisialisasi YT.Player pada div 'youtubePlayerInline'
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
        // Tidak perlu memutar otomatis di sini, pemutaran akan dipicu oleh playVideoInline
    }

    function onPlayerStateChange(event) {
        // Jika video selesai diputar (state 0), coba putar video selanjutnya.
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
        tg.showAlert(errorMessage + ' Silakan coba video lain.'); // Gunakan alert Telegram
        // Sembunyikan pemutar jika ada error fatal
        inlineVideoPlayerContainer.classList.add('d-none');
        inlineVideoTitle.classList.add('d-none');
    }

    // Fungsi untuk memutar video secara inline (tidak lagi di modal pop-up)
    const playVideoInline = (videoId, title, playlist, startIndex) => {
        inlineVideoTitle.textContent = title;
        currentVideoPlaylist = playlist;
        currentVideoIndex = startIndex;

        if (youtubePlayerAPI && typeof youtubePlayerAPI.loadVideoById === 'function') {
            console.log('Memuat video dengan YouTube Player API:', videoId);
            youtubePlayerAPI.loadVideoById(videoId);
        } else {
            // Fallback jika YouTube Player API belum siap atau gagal inisialisasi
            // Pastikan URL iframe YouTube sudah benar
            youtubePlayerInlineDiv.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            console.warn('YouTube Player API belum siap. Memuat video langsung ke iframe.');
        }

        // Pastikan kontainer pemutar video terlihat
        inlineVideoPlayerContainer.classList.remove('d-none');
        inlineVideoTitle.classList.remove('d-none');
        // Gulir halaman ke atas untuk memastikan pemutar terlihat
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
            inlineVideoTitle.textContent = nextVideoTitle; // Perbarui judul video yang sedang diputar
            if (youtubePlayerAPI) youtubePlayerAPI.loadVideoById(nextVideoId);
        } else {
            console.log('Playlist habis atau tidak ada video selanjutnya. Menghentikan pemutar.');
            if (youtubePlayerAPI && typeof youtubePlayerAPI.stopVideo === 'function') {
                youtubePlayerAPI.stopVideo(); // Hentikan video saat playlist habis
            }
            // Sembunyikan pemutar jika playlist habis
            inlineVideoPlayerContainer.classList.add('d-none');
            inlineVideoTitle.classList.add('d-none');
        }
    };

    // Fungsi untuk memformat data video dari API agar konsisten
    const normalizeVideoData = (items) => {
        // Memastikan ID video diambil dengan benar, baik dari 'videoId' dalam objek 'id'
        // atau langsung dari 'id' jika sudah berupa string (untuk API 'videos').
        return items.map(item => ({
            id: typeof item.id === 'object' && item.id.videoId ? item.id.videoId : item.id,
            snippet: item.snippet,
        }));
    };

    // Fungsi untuk melakukan pencarian video
    const performSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) {
            tg.showAlert('Mohon masukkan kata kunci pencarian.');
            return;
        }

        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0') {
            tg.showAlert('Kesalahan: API Key YouTube belum diatur dengan benar atau masih menggunakan placeholder. Periksa script.js untuk detail.');
            return;
        }

        showLoading(true);
        const maxResults = 12; // Jumlah hasil pencarian yang diinginkan
        // URL API untuk pencarian video (gunakan 'type=video')
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${YOUTUBE_API_KEY}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error ${response.status}: ${errorData.error.message}`);
            }
            const data = await response.json();
            // Penting: currentVideoPlaylist diisi dari hasil pencarian yang dinormalisasi
            currentVideoPlaylist = normalizeVideoData(data.items);
            currentVideoIndex = -1; // Reset indeks saat playlist baru dimuat
            console.log('Playlist setelah pencarian:', currentVideoPlaylist);
            displayResults(currentVideoPlaylist, `Hasil Pencarian: "${query}"`);
        } catch (error) {
            handleFetchError(error, 'Gagal melakukan pencarian'); // Pesan error lebih spesifik
        } finally {
            showLoading(false); // Sembunyikan spinner loading
        }
    };

    // Fungsi untuk menampilkan video populer berdasarkan kategori
    const displayCategoryVideos = async (categoryId, categoryName) => {
        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'AIzaSyAkgcQAn-vxpxp2UoPZ2zQLKwfVNLWRtl0') {
            tg.showAlert('Kesalahan: API Key YouTube belum diatur dengan benar atau masih menggunakan placeholder. Periksa script.js untuk detail.');
            return;
        }

        showLoading(true);
        let apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=ID&maxResults=12&key=${YOUTUBE_API_KEY}`;
        if (categoryId) {
            apiUrl += `&videoCategoryId=${categoryId}`; // Tambahkan filter kategori jika ada
        }
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error ${response.status}: ${errorData.error.message}`);
            }
            const data = await response.json();
            // Penting: currentVideoPlaylist diisi dari hasil kategori yang dinormalisasi
            currentVideoPlaylist = normalizeVideoData(data.items);
            currentVideoIndex = -1; // Reset indeks saat playlist baru dimuat
            console.log('Playlist setelah memuat kategori:', currentVideoPlaylist);
            displayResults(currentVideoPlaylist, categoryName);
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
            resultsContainer.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted text-lg">Video tidak ditemukan. Coba kata kunci lain.</p></div>';
            resultsCategoryTitle.classList.add('d-none'); // Sembunyikan judul jika tidak ada hasil
            resultsCategoryHr.classList.add('d-none'); // Sembunyikan HR jika tidak ada hasil
            return;
        }

        resultsCategoryTitle.textContent = title;
        resultsCategoryTitle.classList.remove('d-none');
        resultsCategoryHr.classList.remove('d-none');

        const fragment = document.createDocumentFragment(); // Gunakan DocumentFragment untuk performa
        videos.forEach((video, index) => {
            const videoId = video.id; // ID video yang sudah dinormalisasi
            const { title: videoTitle, channelTitle, thumbnails } = video.snippet;
            const thumbnailUrl = thumbnails.high.url; // Gunakan thumbnail kualitas tinggi

            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4'; // Kolom responsif Bootstrap
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
            playVideoInline(videoId, videoTitle, currentVideoPlaylist, index); // Panggil fungsi pemutar inline
        } else if (event.target.closest('.download-btn')) {
            event.stopPropagation(); // Mencegah event 'click' menyebar ke card parent
            // Ini adalah cara mengirim data ke bot untuk diproses di backend Telegram.
            tg.sendData(JSON.stringify({
                action: 'download',
                videoId: videoId,
                title: videoTitle
            }));
            tg.showAlert(`Permintaan unduh untuk "${videoTitle}" telah dikirim ke bot!`);
            // Opsional: Tutup Web App setelah mengirim permintaan jika perlu
            // tg.close();
        } else {
            // Jika area kartu lain diklik, putar video secara inline
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

        categoryContainer.innerHTML = ''; // Kosongkan kontainer kategori sebelumnya
        categories.forEach(cat => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-danger btn-sm category-btn rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md transition duration-200';
            button.innerHTML = `<i class="bi bi-tag-fill me-1"></i> ${cat.name}`;
            button.dataset.categoryId = cat.id;
            button.dataset.categoryName = cat.name;
            categoryContainer.appendChild(button);
        });
        
        // Event listener yang benar dan efisien menggunakan delegasi event
        categoryContainer.addEventListener('click', (event) => {
            const btn = event.target.closest('.category-btn');
            if (btn) {
                const { categoryId, categoryName } = btn.dataset;
                displayCategoryVideos(categoryId, categoryName);
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Gulir ke atas halaman
            }
        });
    };
    
    // --- Fungsi Helper dan Inisialisasi ---

    const showLoading = (isLoading) => {
        loadingSpinner.classList.toggle('d-none', !isLoading);
        if (isLoading) {
            resultsContainer.innerHTML = ''; // Bersihkan hasil saat loading
            resultsCategoryTitle.classList.add('d-none');
            resultsCategoryHr.classList.add('d-none');
            // Sembunyikan pemutar inline saat loading dimulai
            inlineVideoPlayerContainer.classList.add('d-none');
            inlineVideoTitle.classList.add('d-none');
        }
    };

    const handleFetchError = (error, prefix = 'Gagal mengambil data') => {
        console.error(`${prefix}:`, error);
        // Tampilkan pesan error di container hasil
        resultsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger text-center p-4 rounded-lg shadow-sm" role="alert">
                    <h5 class="alert-heading font-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i> ${prefix}!</h5>
                    <p class="mb-0">${error.message}.</p>
                    <p class="text-sm mt-2">Pastikan API Key Anda valid, tidak ada batasan domain/referrer yang salah, dan kuota API belum habis.</p>
                </div>
            </div>`;
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

        // Opsi: Terapkan tema untuk elemen spesifik di Tailwind atau Bootstrap
        // Misalnya, ubah warna background body secara langsung jika tidak ada variabel TG
        document.body.style.backgroundColor = tg.backgroundColor || '#f0f2f5';
        document.body.style.color = tg.textColor || '#333';
    };

    // Panggilan Inisialisasi
    applyTelegramTheme(); // Terapkan tema Telegram saat aplikasi dimuat
    displayCategories(); // Tampilkan tombol kategori
    displayCategoryVideos(null, 'Video Populer di Indonesia'); // Memuat video populer saat pertama kali dibuka
});
        
