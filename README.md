# Dmitry Potekhin - Resume Website

Professional resume website built with HTML, CSS, and JavaScript. Designed for GitHub Pages deployment.

## 🌟 Features

- **Bilingual Support**: Toggle between Russian and English
- **Theme Toggle**: Switch between light and dark themes
- **Responsive Design**: Works perfectly on all devices
- **Resume Page**: Professional resume with downloadable PDFs
- **Books Collection**: Browse through 424+ books with search and filter
- **Modern UI**: Clean, professional design with smooth animations

## 📁 Project Structure

```
github_pages_site/
├── index.html          # Main resume page
├── books.html          # Books collection page
├── css/
│   └── styles.css      # Main stylesheet with theme support
├── js/
│   ├── main.js         # Theme and language switching
│   ├── books.js        # Books page functionality
│   └── books-data.js   # Books data (424 books)
├── downloads/
│   ├── resume_ru.pdf   # Russian resume PDF
│   └── resume_en.pdf   # English resume PDF
└── README.md           # This file
```

## 🚀 Deployment to GitHub Pages

1. Create a new repository on GitHub
2. Push all files to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Resume website"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Go to repository Settings → Pages
4. Select "main" branch as source
5. Your site will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## 🎨 Customization

### Updating Personal Information
- Edit contact info in `index.html`
- Replace PDF files in `downloads/` folder
- Update books list in `js/books-data.js`

### Changing Colors
- Modify CSS variables in `css/styles.css` (`:root` section)
- Light theme colors start at line 8
- Dark theme colors start at line 27

### Adding New Sections
- Add HTML structure in `index.html`
- Style it in `css/styles.css`
- Add translations with `data-lang-ru` and `data-lang-en` attributes

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + K`: Toggle theme
- `Ctrl/Cmd + L`: Toggle language
- `Ctrl/Cmd + F`: Focus search (on books page)
- `Esc`: Clear search (on books page)

## 🛠️ Tech Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS variables
- **JavaScript**: Vanilla JS (no dependencies)
- **Responsive**: Mobile-first approach

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## 📄 License

This project is open source and available under the MIT License.

## 👤 Contact

- **Email**: dvpotekhin@gmail.com
- **Telegram**: [@dmpotekhin](https://t.me/dmpotekhin)
- **GitHub**: [github.com/dmpotekhin](https://github.com/dmpotekhin)

---

**Built with ❤️ by Dmitry Potekhin**
