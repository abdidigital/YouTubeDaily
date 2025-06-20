<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VideoTube - Temukan Video Favoritmu</title>
    <!-- Memuat Tailwind CSS untuk styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--tg-theme-bg-color, #f0f2f5); /* Default fallback */
            color: var(--tg-theme-text-color, #333); /* Default fallback */
            margin: 0;
            padding: 0;
        }
        /* Override Bootstrap's border-radius if needed, ensure consistency */
        .rounded-full { border-radius: 9999px; }
        .rounded-lg { border-radius: 0.5rem; }
        .rounded-3 { border-radius: 0.3rem; } /* Bootstrap's default */
        .rounded-t-lg { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
        .rounded-b-lg { border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; }

        /* Custom styles for video card and text truncation */
        .video-card {
            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .video-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        .text-truncate-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        /* Apply Telegram Web App colors using CSS variables */
        .btn-danger {
            background-color: var(--tg-theme-button-color, #dc3545);
            border-color: var(--tg-theme-button-color, #dc3545);
            color: var(--tg-theme-button-text-color, #fff);
        }
        .btn-outline-danger {
            border-color: var(--tg-theme-button-color, #dc3545);
            color: var(--tg-theme-button-color, #dc3545);
        }
        .btn-outline-danger:hover {
            background-color: var(--tg-theme-button-color, #dc3545);
            color: var(--tg-theme-button-text-color, #fff);
        }
        .btn-outline-primary {
            border-color: var(--tg-theme-link-color, #0d6efd);
            color: var(--tg-theme-link-color, #0d6efd);
        }
        .btn-outline-primary:hover {
            background-color: var(--tg-theme-link-color, #0d6efd);
            color: #fff;
        }
    </style>
    <!-- Memuat Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Memuat Bootstrap Icons CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
</head>
<body class="bg-gray-100 flex flex-col min-h-screen">

    <!-- Header Section -->
    <header class="bg-gradient-to-r from-red-600 to-red-800 text-white py-4 shadow-lg rounded-b-lg">
        <div class="container mx-auto flex flex-col md:flex-row items-center justify-between px-4">
            <h1 class="text-3xl font-bold mb-2 md:mb-0">
                <i class="bi bi-youtube me-2"></i>VideoTube
            </h1>
            <nav>
                <ul class="flex space-x-4">
                    <li><a href="#" class="hover:text-red-200 transition duration-300">Beranda</a></li>
                    <li><a href="#" class="hover:text-red-200 transition duration-300">Tentang</a></li>
                    <li><a href="#" class="hover:text-red-200 transition duration-300">Kontak</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <!-- Slot Iklan 1 (di bawah header) -->
    <div class="container my-4">
        <div class="flex justify-center">
            <div class="bg-gray-200 text-center py-2 rounded-lg shadow-md" style="width: 468px; height: 60px; line-height: 48px; border: 1px dashed #ccc;">
                <p class="text-gray-600 text-sm font-medium">Slot Iklan 468x60</p>
                <p class="text-gray-500 text-xs">(Konten Iklan Anda)</p>
            </div>
        </div>
    </div>

    <!-- Main Content Area -->
    <main class="container mx-auto flex-grow px-4 py-4">
        <!-- Inline Video Player Container -->
        <div id="inlineVideoPlayerContainer" class="ratio ratio-16x9 bg-black rounded-lg overflow-hidden shadow-xl mb-4 d-none">
            <div id="youtubePlayerInline"></div>
        </div>
        <h5 id="inlineVideoTitle" class="mt-3 mb-4 d-none text-center text-lg font-semibold text-gray-800"></h5>

        <!-- Search Bar -->
        <div class="input-group mb-4 shadow-sm rounded-lg overflow-hidden bg-white">
            <input type="text" id="searchInput" class="form-control p-3 border-0 focus:ring-0" placeholder="Cari video di YouTube..." aria-label="Cari video">
            <button class="btn btn-danger px-4 py-3" type="button" id="searchButton">
                <i class="bi bi-search me-2"></i>Cari
            </button>
        </div>

        <!-- Categories -->
        <div id="categoryContainer" class="d-flex flex-wrap justify-content-center gap-3 mb-5">
            <!-- Category buttons will be inserted here by JavaScript -->
        </div>

        <!-- Loading Spinner -->
        <div id="loading" class="text-center d-none my-5">
            <div class="spinner-border text-danger" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted mt-2">Memuat video...</p>
        </div>

        <!-- Results Section -->
        <h4 id="resultsCategoryTitle" class="text-center my-4 d-none text-gray-700 font-bold text-2xl"></h4>
        <hr id="resultsCategoryHr" class="mb-5 d-none border-t-2 border-red-300 w-24 mx-auto">
        <div id="results" class="row">
            <!-- Video results will be rendered here by JavaScript -->
        </div>
    </main>

    <!-- Slot Iklan 2 (di atas footer) -->
    <div class="container my-4">
        <div class="flex justify-center">
            <div class="bg-gray-200 text-center py-2 rounded-lg shadow-md" style="width: 468px; height: 60px; line-height: 48px; border: 1px dashed #ccc;">
                <p class="text-gray-600 text-sm font-medium">Slot Iklan 468x60</p>
                <p class="text-gray-500 text-xs">(Konten Iklan Anda)</p>
            </div>
        </div>
    </div>

    <!-- Footer Section -->
    <footer class="bg-gradient-to-r from-red-600 to-red-800 text-white py-5 mt-5 rounded-t-lg shadow-lg">
        <div class="container mx-auto text-center px-4">
            <p class="mb-2 text-lg font-semibold">VideoTube</p>
            <p class="text-sm">
                &copy; 2025 VideoTube. Semua Hak Dilindungi.
            </p>
            <p class="text-sm mt-1">
                Dibuat dengan ❤️ untuk pengalaman menonton terbaik.
            </p>
        </div>
    </footer>

    <!-- Memuat Bootstrap JS Bundle (termasuk Popper) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Memuat script.js kustom Anda -->
    <script src="script.js"></script>
</body>
</html>
                       
