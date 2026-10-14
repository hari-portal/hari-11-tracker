# Class XI Study Tracker

A zero-dependency, offline-friendly study tracker for **NCERT Class XI Physics, Chemistry and Mathematics**.
Tick off **Study**, **Revise** and **Test** for every subtopic, attach an infographic to each one, and watch your progress add up.

![Screenshot](docs/screenshot.png)

## Features

- **Three subject tabs** (Physics, Chemistry, Mathematics) with one consistent layout.
- **Study / Revise / Test checkboxes** on every subtopic (602 in total), plus per-chapter "select all" in the column headers.
- **Infographic upload** per subtopic: click or drag-and-drop, click the thumbnail to enlarge, × to remove.
- **Progress summary** at the top: overall ring, per-subject cards and per-chapter progress bars.
- **Collapsible chapters**, with Expand all / Collapse all, and search within a subject.
- Light and dark mode, responsive down to phone width.
- Export / import your progress (including infographics) as JSON; reset button.

## Run it

No build step and no server needed. Open `index.html` in a browser.

### Host on GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. Your tracker will be live at `https://<your-username>.github.io/<repo-name>/`.

## Where your data is saved

Everything stays in **your browser** (nothing is uploaded anywhere):

- Checkbox state and preferences: `localStorage`
- Infographic images: `IndexedDB` (large images are downscaled to max 1800 px)

Progress is per browser and per site address. Use **Export progress** to back it up or move it to another device.

## Project structure

```
.
├── index.html            # page markup
├── assets/
│   ├── css/styles.css    # styling (light/dark themes, per-subject accents)
│   └── js/app.js         # tracker logic
├── data/syllabus.js      # generated syllabus data (window.SYLLABUS)
├── source/               # original table-of-contents spreadsheets
│   ├── physics.xlsx
│   ├── chemistry.xlsx
│   └── maths.xlsx
├── scripts/
│   ├── build_data.py     # source/*.xlsx -> data/syllabus.js
│   └── requirements.txt
└── docs/screenshot.png
```

## Updating the syllabus

Edit the spreadsheets in `source/` (keeping their column layout), then regenerate the data file:

```bash
pip install -r scripts/requirements.txt
python scripts/build_data.py
```

Note: progress is keyed by each row's position within its chapter, so inserting or reordering rows in an existing chapter will shift saved ticks. Append new rows at the end of a chapter where possible.

## Tech

Plain HTML, CSS and JavaScript. No frameworks, no external requests.
