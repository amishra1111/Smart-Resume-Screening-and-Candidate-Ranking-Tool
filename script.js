// ---------------------------------------------------------------
// Scoring engine (pure client-side — see rankCandidates below)
// ---------------------------------------------------------------
const SKILL_KEYWORDS = [
  "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang",
  "rust", "ruby", "php", "swift", "kotlin", "scala",
  "html", "css", "sql", "nosql", "graphql",
  "react", "angular", "vue", "next.js", "node.js", "node", "django", "flask",
  "fastapi", "spring", "express",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd",
  "linux", "git", "github", "gitlab", "jenkins",
  "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras",
  "machine learning", "deep learning", "nlp", "data science", "data analysis",
  "data engineering", "etl", "airflow", "spark", "hadoop",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
  "rest api", "microservices", "agile", "scrum", "jira",
  "project management", "product management", "communication", "leadership",
  "problem solving", "teamwork", "excel", "tableau", "power bi",
];

const STOPWORDS = new Set(
  "a an the and or but if of at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very s t can will just don should now i me my we our you your he him his she her it its they them their this that these those is am are was were be been being have has had do does did".split(" ")
);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9+#.\-]+/g) || []).filter(
    (t) => t.length > 1 && !STOPWORDS.has(t)
  );
}

function extractSkills(text) {
  const normalized = (text || "").toLowerCase();
  const found = new Set();
  for (const skill of SKILL_KEYWORDS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("(?<![a-z0-9])" + escaped + "(?![a-z0-9])");
    if (re.test(normalized)) found.add(skill);
  }
  return found;
}

function semanticScores(jobDescription, resumeTexts) {
  const docs = [jobDescription, ...resumeTexts].map(tokenize);
  const vocab = new Map();
  docs.forEach((doc) => doc.forEach((t) => { if (!vocab.has(t)) vocab.set(t, vocab.size); }));
  const vocabSize = vocab.size;
  if (vocabSize === 0) return resumeTexts.map(() => 0);

  const df = new Array(vocabSize).fill(0);
  const tfVectors = docs.map((doc) => {
    const vec = new Array(vocabSize).fill(0);
    doc.forEach((t) => { vec[vocab.get(t)] += 1; });
    const total = doc.length || 1;
    for (let i = 0; i < vocabSize; i++) vec[i] = vec[i] / total;
    return vec;
  });
  docs.forEach((doc) => {
    const seen = new Set(doc);
    seen.forEach((t) => { df[vocab.get(t)] += 1; });
  });

  const n = docs.length;
  const idf = df.map((d) => Math.log((1 + n) / (1 + d)) + 1);
  const tfidfVectors = tfVectors.map((vec) => vec.map((v, i) => v * idf[i]));

  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  const jobVec = tfidfVectors[0];
  return tfidfVectors.slice(1).map((vec) => cosine(jobVec, vec));
}

function parseResumeEntries(raw) {
  const text = (raw || "").trim();
  if (!text) throw new Error("Add at least one candidate resume.");

  const blocks = text.split(/\n\s*-{3,}\s*\n/);
  const resumes = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n").map((l) => l.replace(/\s+$/, ""));
    const name = lines[0].trim() || ("Candidate " + (resumes.length + 1));
    const resumeText = lines.slice(1).join("\n").trim();
    if (!resumeText) continue;
    resumes.push({ name, text: resumeText });
  }

  if (resumes.length === 0) {
    throw new Error("Use the format: name on the first line, resume below, then a line of ---");
  }
  return resumes;
}

function rankCandidates(jobDescription, resumes) {
  const requiredSkills = extractSkills(jobDescription);
  const resumeTexts = resumes.map((r) => r.text);
  const semScores = semanticScores(jobDescription, resumeTexts);

  const rows = resumes.map((resume, i) => {
    const candidateSkills = extractSkills(resume.text);
    const matched = [...requiredSkills].filter((s) => candidateSkills.has(s)).sort();
    const missing = [...requiredSkills].filter((s) => !candidateSkills.has(s)).sort();
    const skillScore = requiredSkills.size ? matched.length / requiredSkills.size : 0;
    const semanticScore = semScores[i];
    const finalScore = 0.6 * semanticScore + 0.4 * skillScore;
    return { name: resume.name, finalScore, semanticScore, skillScore, matched, missing };
  });

  rows.sort((a, b) => b.finalScore - a.finalScore);
  return rows;
}

// ---------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------
const form = document.getElementById("screen-form");
const jobEl = document.getElementById("job");
const resumesEl = document.getElementById("resumes");
const jobError = document.getElementById("job-error");
const resumesError = document.getElementById("resumes-error");
const resultsEl = document.getElementById("results");
const findingsNote = document.getElementById("findings-note");
const clockEl = document.getElementById("clock");

function stampClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  clockEl.textContent = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
}
stampClock();

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function chipList(items, cls, emptyLabel) {
  if (!items.length) return '<span class="none">' + emptyLabel + '</span>';
  return items.map((s) => '<span class="chip ' + cls + '">' + escapeHtml(s) + '</span>').join("");
}

function renderResults(ranked) {
  if (ranked.length === 0) {
    resultsEl.innerHTML = '<div class="empty">No candidates parsed. Check the resume format above.</div>';
    findingsNote.textContent = "no candidates";
    return;
  }

  const top = ranked[0];
  let html = '<div class="top-line">Best match on file: <b>' + escapeHtml(top.name) + '</b> — ' +
    Math.round(top.finalScore * 100) + '% overall fit</div>';

  ranked.forEach((r, i) => {
    const pct = Math.round(r.finalScore * 100);
    const semPct = Math.round(r.semanticScore * 100);
    const skillPct = Math.round(r.skillScore * 100);
    const delay = (i * 0.08).toFixed(2);

    html += `
      <div class="card">
        <div class="card-top">
          <div>
            <div class="card-id">CANDIDATE NO. ${String(i + 1).padStart(2, "0")}</div>
            <h3 class="card-name">${escapeHtml(r.name)}</h3>
          </div>
          <div class="score-block">
            <div class="score-final">
              ${pct}%
              <span class="redact" style="--d:${delay}s"></span>
            </div>
            <div class="score-label">overall fit</div>
          </div>
        </div>
        <div class="bars">
          <div class="bar-row">
            <span class="bl">Semantic</span>
            <span class="bar-track"><span class="bar-fill" data-w="${semPct}"></span></span>
            <span class="bv">${semPct}%</span>
          </div>
          <div class="bar-row">
            <span class="bl">Skill match</span>
            <span class="bar-track"><span class="bar-fill" data-w="${skillPct}"></span></span>
            <span class="bv">${skillPct}%</span>
          </div>
        </div>
        <div class="skills">
          ${chipList(r.matched, "matched", "no listed skills matched")}
          ${chipList(r.missing, "missing", "")}
        </div>
      </div>`;
  });

  resultsEl.innerHTML = html;
  findingsNote.textContent = ranked.length + " candidate" + (ranked.length === 1 ? "" : "s") + " filed";

  // animate bar fills after paint
  requestAnimationFrame(() => {
    document.querySelectorAll(".bar-fill").forEach((el) => {
      el.style.width = el.getAttribute("data-w") + "%";
    });
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  jobError.classList.remove("show");
  resumesError.classList.remove("show");

  const job = jobEl.value.trim();
  if (!job) {
    jobError.classList.add("show");
    jobEl.focus();
    return;
  }

  let resumes;
  try {
    resumes = parseResumeEntries(resumesEl.value);
  } catch (err) {
    resumesError.textContent = err.message;
    resumesError.classList.add("show");
    resumesEl.focus();
    return;
  }

  const ranked = rankCandidates(job, resumes);
  renderResults(ranked);
  document.getElementById("findings").scrollIntoView({ behavior: "smooth", block: "start" });
});
