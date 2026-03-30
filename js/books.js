// ========================================
// Books Page JavaScript
// Search, Filter, and Display Functionality
// ========================================

let allBooks = [];
let filteredBooks = [];
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
    // Populate authors dropdown
    populateAuthorsDropdown();
    
    // Set up event listeners
    setupSearchListener();
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
        
        // Add language attributes if needed
        option.setAttribute('data-lang-ru', author);
        option.setAttribute('data-lang-en', author);
        
        authorFilter.appendChild(option);
    });
}

// ========================================
// Event Listeners
// ========================================

function setupSearchListener() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    // Use debounce for better performance
    let debounceTimer;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            applyFilters();
        }, 300);
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
        currentAuthorFilter = 'all';
        currentSearchQuery = '';
        currentSort = 'title-asc';
        
        // Reset UI elements
        const searchInput = document.getElementById('search-input');
        const authorFilter = document.getElementById('author-filter');
        const sortSelect = document.getElementById('sort-select');
        
        if (searchInput) searchInput.value = '';
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
        // Author filter
        const matchesAuthor = currentAuthorFilter === 'all' || book.author === currentAuthorFilter;
        
        // Search filter
        const matchesSearch = currentSearchQuery === '' || 
            book.title.toLowerCase().includes(currentSearchQuery) ||
            book.author.toLowerCase().includes(currentSearchQuery);
        
        return matchesAuthor && matchesSearch;
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
    card.style.animationDelay = `${Math.min(index * 0.05, 1)}s`;
    
    // Book icon
    const icon = document.createElement('div');
    icon.className = 'book-icon';
    icon.textContent = '📖';
    
    // Book title
    const title = document.createElement('div');
    title.className = 'book-title';
    title.textContent = book.title;
    title.title = book.title; // Tooltip for long titles
    
    // Book author
    const author = document.createElement('div');
    author.className = 'book-author';
    author.textContent = book.author;
    
    // Assemble card
    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(author);
    
    return card;
}

function animateBookCards() {
    const cards = document.querySelectorAll('.book-card');
    
    // Add CSS for animation if not already present
    if (!document.getElementById('book-card-animation')) {
        const style = document.createElement('style');
        style.id = 'book-card-animation';
        style.textContent = `
            .book-card {
                opacity: 0;
                transform: translateY(20px);
                animation: fadeInUp 0.5s ease forwards;
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
// Export/Import Functions (for future use)
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
