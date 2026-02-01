// careers-loader.js - Dynamically loads job postings from jobs folder

// GitHub config
const GITHUB_USER = "MahathiSharmaAIT";
const GITHUB_REPO = "Norte_Rahul";
const GITHUB_BRANCH = "main";
const JOBS_FOLDER = "jobs";

const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${JOBS_FOLDER}?ref=${GITHUB_BRANCH}`;

// Parse markdown frontmatter
function parseFrontmatter(content) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;

    const frontmatter = {};
    const lines = match[1].split('\n');
    let currentKey = null;
    let currentList = [];

    lines.forEach(line => {
        if (line.trim().startsWith('- ')) {
            if (currentKey) currentList.push(line.trim().substring(2));
        } else if (line.includes(':')) {
            if (currentKey && currentList.length > 0) {
                frontmatter[currentKey] = currentList;
                currentList = [];
            }
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            currentKey = key.trim();
            if (value) {
                frontmatter[currentKey] = value;
                currentKey = null;
            }
        }
    });

    if (currentKey && currentList.length > 0) {
        frontmatter[currentKey] = currentList;
    }

    return frontmatter;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Create a single list row
function createListItem(job, index) {
    return `
        <div class="job-list-item" onclick="openModal(${index})">
            <div class="job-list-left">
                <span class="job-list-title">${job.title}</span>
                <div class="job-list-meta">
                    <span>📍 ${job.location}</span>
                    <span>💼 ${job.contract_type}</span>
                    <span>⏱ ${job.duration}</span>
                </div>
            </div>
            <span class="job-list-badge">${job.status}</span>
        </div>
    `;
}

// Build modal content for a specific job
function buildModal(job) {
    const requiredSkills = Array.isArray(job.required_skills)
        ? job.required_skills.map(s => `<li>${s}</li>`).join('')
        : '';

    const niceToHave = (job.nice_to_have && Array.isArray(job.nice_to_have))
        ? `<div class="modal-section">
                <h4>Nice to Have</h4>
                <ul class="modal-skills">${job.nice_to_have.map(s => `<li>${s}</li>`).join('')}</ul>
           </div>`
        : '';

    return `
        <div class="modal-overlay" id="jobModal">
            <div class="modal-box">
                <button class="modal-close" onclick="closeModal()">&times;</button>

                <div class="modal-header">
                    <h2>${job.title}</h2>
                    <div class="modal-header-meta">
                        <span>📍 ${job.location}</span>
                        <span>💼 Contract (${job.contract_type})</span>
                        <span>⏱ ${job.duration}</span>
                    </div>
                </div>

                <div class="modal-body">
                    <div class="modal-section">
                        <h4>About the Role</h4>
                        <p>${job.description}</p>
                    </div>

                    <div class="modal-section">
                        <h4>Required Skills</h4>
                        <ul class="modal-skills">${requiredSkills}</ul>
                    </div>

                    ${niceToHave}

                    <div class="modal-details">
                        <div class="modal-detail-item">
                            <strong>Duration</strong>
                            <span>${job.duration}</span>
                        </div>
                        <div class="modal-detail-item">
                            <strong>Rate</strong>
                            <span>${job.rate}</span>
                        </div>
                        <div class="modal-detail-item">
                            <strong>Start Date</strong>
                            <span>${job.start_date}</span>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <p class="modal-email">To apply, email us at <a href="mailto:account@nortetalentco.com">account@nortetalentco.com</a></p>
                    <p class="modal-posted">Posted: ${formatDate(job.posted_date)}</p>
                </div>
            </div>
        </div>
    `;
}

// --- Modal open / close ---
let allJobs = [];

function openModal(index) {
    const existing = document.getElementById('jobModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', buildModal(allJobs[index]));

    const modal = document.getElementById('jobModal');
    void modal.offsetWidth;
    modal.classList.add('active');

    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', escapeClose);
}

function closeModal() {
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => { if (modal) modal.remove(); }, 250);
    }
    document.removeEventListener('keydown', escapeClose);
}

function escapeClose(e) {
    if (e.key === 'Escape') closeModal();
}

// --- Fetch file list from GitHub API ---
async function getJobFileNames() {
    const response = await fetch(GITHUB_API_URL);
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    const files = await response.json();
    return files.filter(f => f.name.endsWith('.md')).map(f => f.name);
}

// --- Main loader ---
async function loadJobs() {
    const container = document.getElementById('jobs-container');

    try {
        const jobFiles = await getJobFileNames();
        allJobs = [];

        for (const filename of jobFiles) {
            try {
                const res = await fetch(`${JOBS_FOLDER}/${filename}`);
                if (res.ok) {
                    const content = await res.text();
                    const jobData = parseFrontmatter(content);
                    if (jobData && jobData.status === 'Open') {
                        allJobs.push(jobData);
                    }
                }
            } catch (err) {
                console.error(`Error loading ${filename}:`, err);
            }
        }

        // Sort newest first
        allJobs.sort((a, b) => new Date(b.posted_date) - new Date(a.posted_date));

        if (allJobs.length > 0) {
            container.innerHTML = `<div class="jobs-list">${allJobs.map((job, i) => createListItem(job, i)).join('')}</div>`;
        } else {
            container.innerHTML = `
                <div style="text-align:center; padding:3rem; color:#6B7280;">
                    <h3 style="color:#1A2332; margin-bottom:1rem;">No Open Positions</h3>
                    <p>We don't have any open positions right now, but we're always looking for great talent.</p>
                    <p style="margin-top:0.8rem;">Email us at <a href="mailto:account@nortetalentco.com" style="color:#1A2332; font-weight:600;">account@nortetalentco.com</a></p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:2rem; color:#EF4444;">
                Unable to load job postings. Please try again later.
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', loadJobs);