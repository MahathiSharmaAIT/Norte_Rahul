const JOBS_REPO = "MahathiSharmaAIT/Norte_Rahul.git";
const JOBS_PATH = "jobs";

async function fetchJobs() {
  const container = document.getElementById("jobs-container");

  try {
    // 1. Get list of job files from GitHub
    const apiUrl = `https://api.github.com/repos/${JOBS_REPO}/contents/${JOBS_PATH}`;
    const response = await fetch(apiUrl);
    const files = await response.json();

    // 2. Read each markdown file
    const jobs = await Promise.all(
      files
        .filter(file => file.name.endsWith(".md"))
        .map(async file => {
          const raw = await fetch(file.download_url).then(r => r.text());
          return parseFrontmatter(raw);
        })
    );

    // 3. Sort newest first
    jobs.sort((a, b) => new Date(b.posted_date) - new Date(a.posted_date));

    // 4. Render
    container.innerHTML = jobs
      .filter(job => job.status === "Open")
      .map(renderJobCard)
      .join("");

    if (!container.innerHTML.trim()) {
      container.innerHTML = `<p class="loading-text">No open positions right now.</p>`;
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="loading-text">Unable to load jobs.</p>`;
  }
}

// 🔹 Parse YAML frontmatter
function parseFrontmatter(md) {
  const match = md.match(/---([\s\S]*?)---/);
  const lines = match[1].split("\n");

  const data = {};
  let currentKey = null;

  lines.forEach(line => {
    if (line.startsWith("  - ")) {
      data[currentKey].push(line.replace("  - ", "").trim());
    } else if (line.includes(":")) {
      const [key, ...rest] = line.split(":");
      currentKey = key.trim();
      const value = rest.join(":").trim();

      data[currentKey] = value ? value : [];
    }
  });

  return data;
}

// 🔹 Render HTML
function renderJobCard(job) {
  return `
    <div class="job-card">
      <h3>${job.title}</h3>
      <p class="job-meta">${job.location} • ${job.contract_type}</p>
      <p>${job.description}</p>

      <div class="job-footer">
        <span class="job-rate">${job.rate || ""}</span>
        <a href="contact.html" class="btn btn-outline">Apply</a>
      </div>
    </div>
  `;
}

// Init
document.addEventListener("DOMContentLoaded", fetchJobs);
