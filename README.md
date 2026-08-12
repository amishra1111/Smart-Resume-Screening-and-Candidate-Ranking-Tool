# Candidate Screening File

A static, single-purpose website for ranking candidate resumes against a job description. No backend, no build step, no server — everything runs client-side in the browser.

## Features

- Paste a job description
- Upload multiple candidate resumes as **PDF**, **DOCX**, or **TXT**
- Drag-and-drop or click-to-browse file upload, with per-file parsing status
- Candidate names auto-detected from filenames (editable inline)
- Ranks candidates using:
  - **Semantic similarity** — TF-IDF + cosine similarity between the job description and each resume
  - **Skill match** — overlap between skills mentioned in the job description and skills found in each resume
- Shows matched and missing skills per candidate
- Fully client-side: resume files are parsed in the browser and never uploaded to a server

## Tech Stack

- HTML / CSS / vanilla JavaScript (no framework, no bundler)
- [pdf.js](https://mozilla.github.io/pdf.js/) — PDF text extraction (loaded via CDN)
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) — DOCX text extraction (loaded via CDN)

## File Structure

```
candidate-screening-site/
├── index.html   # Page markup
├── style.css    # All styling
└── script.js    # Scoring engine + UI logic (file parsing, ranking, rendering)
```

## Running Locally

No install or build required. Either:

- Open `index.html` directly in a browser, or
- Serve the folder with any static file server, e.g.:

```bash
cd candidate-screening-site
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

> Opening `index.html` directly works for most browsers, but some enforce stricter file-access rules for `fetch`/module-style requests. If PDF/DOCX parsing seems to hang when opened directly via `file://`, use a local server instead.

## Deploying

This is a static site — deploy it anywhere that serves static files, with no configuration:

- **Vercel**: import the repo, no framework preset or build command needed
- **Netlify**: drag-and-drop the folder, or connect the repo
- **GitHub Pages**: push to a repo and enable Pages on the branch

## How Scoring Works

1. Skills are detected in the job description and each resume using a built-in keyword list (`SKILL_KEYWORDS` in `script.js`).
2. **Semantic score** — TF-IDF vectors are built for the job description and all resumes, then compared with cosine similarity.
3. **Skill score** — the fraction of job-description skills that also appear in the resume.
4. **Final score** = `0.6 × semantic score + 0.4 × skill score`.
5. Candidates are sorted by final score, descending.

To tune matching, edit the `SKILL_KEYWORDS` array or the score weighting in `rankCandidates()` inside `script.js`.

## Notes

- Resume text extraction quality depends on the source file — scanned/image-only PDFs (no embedded text layer) won't extract any text.
- All processing happens in your browser tab; no resume content is sent to any server.
