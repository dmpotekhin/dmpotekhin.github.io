# Dmitry Potekhin — Personal Website

Professional website with resume, book collection (520+ books with notes), bilingual support, and dark/light themes. Deployed via GitHub Pages.

## Features

- **Resume**: Russian/English resume with downloadable PDFs
- **Books Collection**: 521 books with genre filtering, sorting, and search
- **Book Notes**: Expandable summaries (5 theses + takeaway) for 520 books
- **Genre System**: 📖 Fiction | 🧠 Self-dev | 💻 IT/QA | 🌍 History
- **Bilingual**: Russian/English toggle (Ctrl+L)
- **Theme**: Light/dark toggle (Ctrl+K)
- **Responsive**: Mobile-friendly design

## Project Structure

```
├── index.html            # Resume page
├── books.html            # Books collection page
├── css/
│   └── styles.css        # Theme support + book notes styles
├── js/
│   ├── main.js           # Theme/language switching
│   ├── books.js          # Books page: filter, sort, search, notes
│   ├── books-data.js     # 521 books from Excel (auto-generated)
│   └── notes-data.js     # Book notes: 5 theses + takeaway
├── downloads/
│   ├── resume_ru.pdf
│   └── resume_en.pdf
├── Книги.xlsx            # Source of truth for book data
└── README.md
```

## Book Notes Format

Each note in `js/notes-data.js`:
```json
{
  "theses": [
    "Тезис 1: герой и задача",
    "Тезис 2: место/время",
    "Тезис 3: конфликт",
    "Тезис 4: поворот",
    "Тезис 5: итог"
  ],
  "takeaway": "Вывод: суть книги, чему учит, польза."
}
```

## How to Add a Book

1. **Add to Excel**: edit `Книги.xlsx` (columns: Author, Title, Genre)
2. **Tell the AI**: `обнови таблицу` — AI parses Excel, regenerates `books-data.js`, writes a note, commits and pushes
3. **Live**: https://dmpotekhin.github.io/books.html (Cmd+Shift+R if cached)

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Toggle theme
- `Ctrl/Cmd + L`: Toggle language
- `Ctrl/Cmd + F`: Focus search (books page)
- `Esc`: Clear search (books page)

## Tech Stack

- HTML5, CSS3, Vanilla JS — no frameworks
- GitHub Pages for hosting
- Excel as data source

## Contact

- Email: dvpotekhin@gmail.com
- Telegram: [@dmpotekhin](https://t.me/dmpotekhin)
- GitHub: [github.com/dmpotekhin](https://github.com/dmpotekhin)

---

**Built by Dmitry Potekhin**
