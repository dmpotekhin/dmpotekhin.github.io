// ========================================
// Books Page JavaScript
// Search, Filter, Sort, and Display Functionality
// ========================================

let allBooks = [];
let filteredBooks = [];
let currentGenreFilter = 'all';
let currentAuthorFilter = 'all';
let currentSearchQuery = '';
let currentSort = 'title-asc';

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the books page
    if (typeof booksData === 'undefined') {
        return;
    }
    
    // Initialize books
    allBooks = booksData;
    filteredBooks = [...allBooks];
    
    // Initialize the page
    initBooksPage();
});

// ========================================
// Initialization
// ========================================

function initBooksPage() {
    // Populate dropdowns
    populateGenreDropdown();
    populateAuthorsDropdown();
    
    // Build stats from data
    buildStats();
    
    // Set up event listeners
    setupSearchListener();
    setupGenreFilterListener();
    setupFilterListener();
    setupSortListener();
    setupResetListener();
    
    // Initial render
    renderBooks();
    
    // Hide loading indicator
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

// ========================================
// Populate Genre Dropdown
// ========================================

function populateGenreDropdown() {
    const genreFilter = document.getElementById('genre-filter');
    if (!genreFilter) return;
    
    // Get unique genres and sort them
    const genres = [...new Set(allBooks.map(book => book.genre))].sort();
    
    // Add genres to dropdown
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });
}

// ========================================
// Populate Authors Dropdown
// ========================================

function populateAuthorsDropdown() {
    const authorFilter = document.getElementById('author-filter');
    if (!authorFilter) return;
    
    // Get unique authors and sort them
    const authors = [...new Set(allBooks.map(book => book.author))].sort();
    
    // Add authors to dropdown
    authors.forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        authorFilter.appendChild(option);
    });
}

// ========================================
// Build Stats from Data
// ========================================

function buildStats() {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    // Count books per genre
    const genreCounts = {};
    allBooks.forEach(book => {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
    });
    
    // Genre emoji mapping
    const genreEmojis = {
        '📖 Художественная литература': '📖',
        '🧠 Саморазвитие / Бизнес / Психология': '🧠',
        '💻 IT / QA / Разработка': '💻',
        '🌍 История / Страноведение': '🌍'
    };
    
    // Get the largest genre for highlight
    const genreEntries = Object.entries(genreCounts);
    genreEntries.sort((a, b) => b[1] - a[1]);
    const largestGenre = genreEntries[0] ? genreEntries[0][0] : null;
    
    // Create stat cards
    genreEntries.forEach(([genre, count]) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        if (genre === largestGenre) {
            card.classList.add('highlight');
        }
        
        // Extract emoji from genre or use fallback
        const emoji = genreEmojis[genre] || '📚';
        
        card.innerHTML = `
            <span class="stat-emoji">${emoji}</span>
            <span class="stat-number">${count}</span>
            <span class="stat-label" data-lang-ru="${genre}" data-lang-en="${genre.replace(/[📖🧠💻🌍]\s*/, '')}">${genre}</span>
        `;
        
        // Make stat cards clickable - filter by that genre
        card.addEventListener('click', function() {
            const genreFilter = document.getElementById('genre-filter');
            if (genreFilter) {
                genreFilter.value = genre;
                currentGenreFilter = genre;
                applyFilters();
            }
        });
        
        card.style.cursor = 'pointer';
        card.title = `Фильтровать: ${genre}`;
        
        statsGrid.appendChild(card);
    });
    
    // Update total count
    const totalBooksEl = document.getElementById('total-books');
    if (totalBooksEl) {
        totalBooksEl.textContent = allBooks.length;
    }
}

// ========================================
// Event Listeners
// ========================================

function setupSearchListener() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    let debounceTimer;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            applyFilters();
        }, 300);
    });
}

function setupGenreFilterListener() {
    const genreFilter = document.getElementById('genre-filter');
    if (!genreFilter) return;
    
    genreFilter.addEventListener('change', function(e) {
        currentGenreFilter = e.target.value;
        applyFilters();
    });
}

function setupFilterListener() {
    const authorFilter = document.getElementById('author-filter');
    if (!authorFilter) return;
    
    authorFilter.addEventListener('change', function(e) {
        currentAuthorFilter = e.target.value;
        applyFilters();
    });
}

function setupSortListener() {
    const sortSelect = document.getElementById('sort-select');
    if (!sortSelect) return;
    
    sortSelect.addEventListener('change', function(e) {
        currentSort = e.target.value;
        sortBooks();
        renderBooks();
    });
}

function setupResetListener() {
    const resetBtn = document.getElementById('reset-filters');
    if (!resetBtn) return;
    
    resetBtn.addEventListener('click', function() {
        // Reset all filters
        currentGenreFilter = 'all';
        currentAuthorFilter = 'all';
        currentSearchQuery = '';
        currentSort = 'title-asc';
        
        // Reset UI elements
        const searchInput = document.getElementById('search-input');
        const genreFilter = document.getElementById('genre-filter');
        const authorFilter = document.getElementById('author-filter');
        const sortSelect = document.getElementById('sort-select');
        
        if (searchInput) searchInput.value = '';
        if (genreFilter) genreFilter.value = 'all';
        if (authorFilter) authorFilter.value = 'all';
        if (sortSelect) sortSelect.value = 'title-asc';
        
        // Reapply filters
        applyFilters();
    });
}

// ========================================
// Filtering Logic
// ========================================

function applyFilters() {
    filteredBooks = allBooks.filter(book => {
        // Genre filter
        const matchesGenre = currentGenreFilter === 'all' || book.genre === currentGenreFilter;
        
        // Author filter
        const matchesAuthor = currentAuthorFilter === 'all' || book.author === currentAuthorFilter;
        
        // Search filter
        const matchesSearch = currentSearchQuery === '' || 
            book.title.toLowerCase().includes(currentSearchQuery) ||
            book.author.toLowerCase().includes(currentSearchQuery) ||
            book.genre.toLowerCase().includes(currentSearchQuery);
        
        return matchesGenre && matchesAuthor && matchesSearch;
    });
    
    // Sort the filtered results
    sortBooks();
    
    // Render the books
    renderBooks();
}

// ========================================
// Sorting Logic
// ========================================

function sortBooks() {
    filteredBooks.sort((a, b) => {
        switch(currentSort) {
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            case 'author-asc':
                return a.author.localeCompare(b.author);
            case 'author-desc':
                return b.author.localeCompare(a.author);
            case 'genre-asc':
                return a.genre.localeCompare(b.genre) || a.title.localeCompare(b.title);
            case 'genre-desc':
                return b.genre.localeCompare(a.genre) || a.title.localeCompare(b.title);
            default:
                return 0;
        }
    });
}

// ========================================
// Rendering Books
// ========================================

function renderBooks() {
    const container = document.getElementById('books-container');
    const noResults = document.getElementById('no-results');
    const shownBooksEl = document.getElementById('shown-books');
    
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Update count
    if (shownBooksEl) {
        shownBooksEl.textContent = filteredBooks.length;
    }
    
    // Show/hide no results message
    if (filteredBooks.length === 0) {
        if (noResults) noResults.style.display = 'block';
        return;
    } else {
        if (noResults) noResults.style.display = 'none';
    }
    
    // Create book cards
    filteredBooks.forEach((book, index) => {
        const bookCard = createBookCard(book, index);
        container.appendChild(bookCard);
    });
    
    // Add animation
    animateBookCards();
}

function createBookCard(book, index) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.style.animationDelay = `${Math.min(index * 0.02, 1)}s`;
    
    // Book icon: extract emoji from genre (e.g. "📖 Художественная литература" → "📖")
    const icon = document.createElement('div');
    icon.className = 'book-icon';
    const genreParts = book.genre.split(' ');
    icon.textContent = genreParts[0] || '📚';
    
    // Genre badge
    const genreBadge = document.createElement('span');
    genreBadge.className = 'book-genre-badge';
    genreBadge.textContent = book.genre;
    
    // Book title
    const title = document.createElement('div');
    title.className = 'book-title';
    title.textContent = book.title;
    title.title = book.title;
    
    // Book author
    const author = document.createElement('div');
    author.className = 'book-author';
    author.textContent = book.author;
    
    // Assemble card
    card.appendChild(icon);
    card.appendChild(genreBadge);
    card.appendChild(title);
    card.appendChild(author);
    
    return card;
}

function animateBookCards() {
    const cards = document.querySelectorAll('.book-card');
    
    if (!document.getElementById('book-card-animation')) {
        const style = document.createElement('style');
        style.id = 'book-card-animation';
        style.textContent = `
            .book-card {
                opacity: 0;
                transform: translateY(20px);
                animation: fadeInUp 0.4s ease forwards;
            }
            
            @keyframes fadeInUp {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========================================
// Statistics and Info
// ========================================

function updateBookStats() {
    const totalBooksEl = document.getElementById('total-books');
    const shownBooksEl = document.getElementById('shown-books');
    
    if (totalBooksEl) {
        totalBooksEl.textContent = allBooks.length;
    }
    
    if (shownBooksEl) {
        shownBooksEl.textContent = filteredBooks.length;
    }
}

// ========================================
// Export/Import Functions
// ========================================

function exportBooksToJSON() {
    const dataStr = JSON.stringify(allBooks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'books_collection.json';
    link.click();
    URL.revokeObjectURL(url);
}

// ========================================
// Keyboard Shortcuts for Books Page
// ========================================

document.addEventListener('keydown', function(e) {
    // Focus search on Ctrl/Cmd + F
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Reset filters on Ctrl/Cmd + R
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) resetBtn.click();
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('search-input');
        if (searchInput && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.blur();
            currentSearchQuery = '';
            applyFilters();
        }
    }
});

// ========================================
// Accessibility: Announce results
// ========================================

function announceResults() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    const currentLang = document.documentElement.lang || 'ru';
    const message = currentLang === 'ru' 
        ? `Найдено книг: ${filteredBooks.length}`
        : `Found ${filteredBooks.length} books`;
    
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Call announceResults when filters change
const originalApplyFilters = applyFilters;
applyFilters = function() {
    originalApplyFilters();
    announceResults();
};
