from __future__ import annotations

from io import BytesIO

import pandas as pd
import streamlit as st

from src.extractor import extract_text_from_file
from src.scoring import rank_candidates


st.set_page_config(
    page_title="Smart Resume Screening",
    page_icon="📄",
    layout="wide",
)

st.title("Smart Resume Screening and Candidate Ranking Tool")
st.caption("Upload resumes, paste a job description, and rank candidates by match quality.")

with st.sidebar:
    st.header("Instructions")
    st.write("1. Paste the job description.")
    st.write("2. Upload one or more resumes.")
    st.write("3. Click Rank Candidates.")
    st.divider()
    st.write("Supported formats: TXT, PDF, DOCX")

job_description = st.text_area(
    "Job Description",
    height=220,
    placeholder="Paste the role requirements, skills, and responsibilities here.",
)

uploaded_files = st.file_uploader(
    "Upload Resumes",
    type=["txt", "pdf", "docx"],
    accept_multiple_files=True,
)

rank_clicked = st.button("Rank Candidates", type="primary")

if rank_clicked:
    if not job_description.strip():
        st.error("Please enter a job description.")
    elif not uploaded_files:
        st.error("Please upload at least one resume.")
    else:
        resumes = []
        skipped_files = []

        for uploaded_file in uploaded_files:
            try:
                text = extract_text_from_file(uploaded_file.name, uploaded_file.getvalue())
                resumes.append({"name": uploaded_file.name, "text": text})
            except Exception as exc:
                skipped_files.append((uploaded_file.name, str(exc)))

        if not resumes:
            st.error("No resumes could be processed.")
        else:
            results = rank_candidates(job_description, resumes)

            st.subheader("Ranked Candidates")
            display_df = results[
                [
                    "rank",
                    "candidate",
                    "final_score",
                    "semantic_score",
                    "skill_score",
                    "matched_skills",
                    "missing_skills",
                ]
            ].copy()
            display_df["final_score"] = (display_df["final_score"] * 100).round(2)
            display_df["semantic_score"] = (display_df["semantic_score"] * 100).round(2)
            display_df["skill_score"] = (display_df["skill_score"] * 100).round(2)
            st.dataframe(display_df, use_container_width=True, hide_index=True)

            top_candidate = results.iloc[0]
            st.subheader("Top Match Summary")
            st.success(top_candidate["summary"])

            st.subheader("Candidate Details")
            for _, row in results.iterrows():
                with st.expander(f"#{row['rank']} {row['candidate']} - {row['final_score'] * 100:.2f}%"):
                    left, right = st.columns(2)
                    with left:
                        st.metric("Final Score", f"{row['final_score'] * 100:.2f}%")
                        st.metric("Semantic Score", f"{row['semantic_score'] * 100:.2f}%")
                    with right:
                        st.metric("Skill Score", f"{row['skill_score'] * 100:.2f}%")
                        st.write("**Matched Skills:**", ", ".join(row["matched_skills"]) or "None")
                    st.write("**Missing Skills:**", ", ".join(row["missing_skills"]) or "None")
                    st.write("**Summary:**")
                    st.write(row["summary"])
                    st.write("**Extracted Resume Text Preview:**")
                    st.text(row["text_preview"])

            if skipped_files:
                st.warning("Some files could not be processed.")
                for filename, error_message in skipped_files:
                    st.write(f"- {filename}: {error_message}")
