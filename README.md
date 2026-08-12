# Smart Resume Screening and Candidate Ranking Tool

A small Streamlit project that extracts text from resumes, compares each resume against a job description, and ranks candidates by match quality.

## Features

- Upload multiple resumes in `.txt`, `.pdf`, or `.docx` format
- Paste a job description
- Extract common skills from both the job description and resumes
- Rank candidates using a blend of TF-IDF similarity and skill overlap
- Review matched skills, missing skills, and a short candidate summary

## Tech Stack

- Python
- Streamlit
- scikit-learn
- pandas
- PyPDF2
- python-docx

## Setup

1. Create a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the app:

```bash
streamlit run app.py
```

## How It Works

1. The app extracts text from each uploaded resume.
2. The job description and resumes are normalized.
3. A TF-IDF cosine similarity score is computed for each candidate.
4. Known skills are matched and used to adjust the final ranking.
5. The top candidates are displayed in order.

## Notes

This is a starter project scaffold. You can extend it with:

- OCR for scanned resumes
- Better skill extraction with spaCy or a custom NER model
- Database-backed candidate storage
- Export to CSV or PDF
- Login and recruiter dashboards
