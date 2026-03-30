// ========================================
// Main JavaScript for Theme and Language Toggle
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme and language
    initTheme();
    initLanguage();
    
    // Set up event listeners
    setupThemeToggle();
    setupLanguageToggle();
});

// ========================================
// Theme Management
// ========================================

function initTheme() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        body.classList.remove('dark-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
    }
    
    // Save theme preference
    localStorage.setItem('theme', theme);
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
}

// ========================================
// Language Management
// ========================================

function initLanguage() {
    // Check for saved language preference or default to Russian
    const savedLang = localStorage.getItem('language') || 'ru';
    applyLanguage(savedLang);
}

function applyLanguage(lang) {
    const currentLangEl = document.getElementById('current-lang');
    
    // Update current language indicator
    if (currentLangEl) {
        currentLangEl.textContent = lang === 'ru' ? 'EN' : 'RU';
    }
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
    
    // Update all elements with language data attributes
    updateTextContent(lang);
    updatePlaceholders(lang);
    
    // Save language preference
    localStorage.setItem('language', lang);
}

function updateTextContent(lang) {
    const attribute = `data-lang-${lang}`;
    const elements = document.querySelectorAll(`[${attribute}]`);
    
    elements.forEach(element => {
        const text = element.getAttribute(attribute);
        if (text) {
            // Check if element is a select option
            if (element.tagName === 'OPTION') {
                element.textContent = text;
            } else if (element.innerHTML.includes('<')) {
                // If element contains HTML tags, preserve them
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = element.innerHTML;
                
                // Try to find text nodes and replace
                const walker = document.createTreeWalker(
                    tempDiv,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                // For complex content, just replace the innerHTML
                element.innerHTML = text;
            } else {
                element.textContent = text;
            }
        }
    });
}

function updatePlaceholders(lang) {
    const attribute = `data-placeholder-${lang}`;
    const elements = document.querySelectorAll(`[${attribute}]`);
    
    elements.forEach(element => {
        const placeholder = element.getAttribute(attribute);
        if (placeholder) {
            element.placeholder = placeholder;
        }
    });
}

function setupLanguageToggle() {
    const langToggle = document.getElementById('lang-toggle');
    if (!langToggle) return;
    
    langToggle.addEventListener('click', function() {
        const currentLang = document.documentElement.lang || 'ru';
        const newLang = currentLang === 'ru' ? 'en' : 'ru';
        applyLanguage(newLang);
    });
}

// ========================================
// Utility Functions
// ========================================

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe sections for animation
document.querySelectorAll('.section, .achievement-card, .experience-card, .education-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ========================================
// Keyboard Shortcuts
// ========================================

document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K: Toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.click();
    }
    
    // Ctrl/Cmd + L: Toggle language
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) langToggle.click();
    }
});

// ========================================
// Print Support
// ========================================

window.addEventListener('beforeprint', function() {
    // Ensure light theme for printing
    document.body.classList.remove('dark-theme');
});

window.addEventListener('afterprint', function() {
    // Restore theme after printing
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
});
