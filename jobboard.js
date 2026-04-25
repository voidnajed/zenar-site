// Job Board — Self-contained static data loader
// Loads from /data/job-listings.json and /data/job-sources.json

let jobboardState = {
    listings: [],
    sources: [],
    filteredListings: [],
    filters: {
        location: '',
        status: ''
    }
};

// Initialize job board when tab is loaded
function initJobBoard() {
    loadJobBoardData();
}

async function loadJobBoardData() {
    try {
        // Fetch listings and sources
        const [listingsRes, sourcesRes] = await Promise.all([
            fetch('./data/job-listings.json').catch(() => ({ ok: false })),
            fetch('./data/job-sources.json').catch(() => ({ ok: false }))
        ]);

        if (listingsRes.ok) {
            const data = await listingsRes.json();
            jobboardState.listings = data.listings || [];
        }

        if (sourcesRes.ok) {
            const data = await sourcesRes.json();
            jobboardState.sources = data.sources || [];
        }

        renderJobBoard();
    } catch (error) {
        console.error('Error loading job board data:', error);
        document.getElementById('jb-listings').innerHTML = `<p style="color:var(--color-error);">Error loading job data. Check that /data/job-listings.json exists.</p>`;
    }
}

function renderJobBoard() {
    updateJobBoardStats();
    updateJobBoardTimestamp();
    updateJobBoardLocationFilter();
    applyJobBoardFilters();
    renderJobBoardSources();
}

function updateJobBoardTimestamp() {
    const el = document.getElementById('jb-updated-time');
    if (jobboardState.listings.length > 0 && jobboardState.listings[0].discovered) {
        const d = new Date(jobboardState.listings[0].discovered);
        el.textContent = d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET';
    }
}

function updateJobBoardStats() {
    const total = jobboardState.listings.length;
    const newCount = jobboardState.listings.filter(j => j.status === 'new').length;
    const sentCount = jobboardState.listings.filter(j => j.status === 'sent').length;
    const expiredCount = jobboardState.listings.filter(j => j.status === 'expired').length;

    document.getElementById('jb-stats').innerHTML = `
        <div style="padding:var(--space-3) var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);flex:1;min-width:120px;text-align:center;">
            <div style="font-size:var(--text-sm);opacity:0.7;">Total</div>
            <div style="font-size:1.5rem;font-weight:600;">${total}</div>
        </div>
        <div style="padding:var(--space-3) var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);flex:1;min-width:120px;text-align:center;">
            <div style="font-size:var(--text-sm);opacity:0.7;">New</div>
            <div style="font-size:1.5rem;font-weight:600;color:#4ade80;">${newCount}</div>
        </div>
        <div style="padding:var(--space-3) var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);flex:1;min-width:120px;text-align:center;">
            <div style="font-size:var(--text-sm);opacity:0.7;">Sent</div>
            <div style="font-size:1.5rem;font-weight:600;color:#60a5fa;">${sentCount}</div>
        </div>
        <div style="padding:var(--space-3) var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);flex:1;min-width:120px;text-align:center;">
            <div style="font-size:var(--text-sm);opacity:0.7;">Expired</div>
            <div style="font-size:1.5rem;font-weight:600;color:#ef4444;">${expiredCount}</div>
        </div>
    `;
}

function updateJobBoardLocationFilter() {
    const locations = [...new Set(jobboardState.listings.map(j => j.location).filter(Boolean))].sort();
    const select = document.getElementById('jb-filter-location');
    const currentValue = select.value;

    const options = ['<option value="">All Locations</option>'];
    locations.forEach(loc => {
        options.push(`<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`);
    });

    select.innerHTML = options.join('');
    select.value = currentValue;
    select.addEventListener('change', applyJobBoardFilters);
}

function applyJobBoardFilters() {
    jobboardState.filters.location = document.getElementById('jb-filter-location').value;
    jobboardState.filters.status = document.getElementById('jb-filter-status').value;

    jobboardState.filteredListings = jobboardState.listings.filter(listing => {
        const locMatch = !jobboardState.filters.location || listing.location === jobboardState.filters.location;
        const statMatch = !jobboardState.filters.status || listing.status === jobboardState.filters.status;
        return locMatch && statMatch;
    });

    renderJobBoardListings();
}

function renderJobBoardListings() {
    const container = document.getElementById('jb-listings');

    if (jobboardState.filteredListings.length === 0) {
        container.innerHTML = '<p style="opacity:0.6;">No listings match your filters.</p>';
        return;
    }

    container.innerHTML = jobboardState.filteredListings.map(listing => `
        <div style="padding:var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);border-left:3px solid ${
            listing.status === 'new' ? '#4ade80' :
            listing.status === 'sent' ? '#60a5fa' :
            '#ef4444'
        };">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:var(--space-3);margin-bottom:var(--space-2);">
                <div>
                    <h3 style="margin:0;font-size:var(--text-lg);font-weight:600;">${escapeHtml(listing.jobTitle || listing.title || 'Untitled')}</h3>
                    <p style="margin:var(--space-1) 0 0;opacity:0.8;">${escapeHtml(listing.company)}</p>
                </div>
                <span style="padding:var(--space-1) var(--space-3);background:${
                    listing.status === 'new' ? 'rgba(74,222,128,0.2);color:#4ade80' :
                    listing.status === 'sent' ? 'rgba(96,165,250,0.2);color:#60a5fa' :
                    'rgba(239,68,68,0.2);color:#ef4444'
                };border-radius:var(--radius-sm);font-size:var(--text-xs);font-weight:600;white-space:nowrap;">${listing.status.toUpperCase()}</span>
            </div>

            <div style="display:grid;gap:var(--space-2);font-size:var(--text-sm);opacity:0.8;margin-bottom:var(--space-3);">
                <div><strong>📍</strong> ${escapeHtml(listing.location || 'N/A')}</div>
                ${listing.salaryRange ? `<div><strong>💰</strong> ${escapeHtml(listing.salaryRange)}</div>` : ''}
                ${listing.source ? `<div><strong>🔗</strong> ${escapeHtml(listing.source)}</div>` : ''}
            </div>

            <a href="${listing.link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:var(--space-2) var(--space-4);background:var(--color-primary);color:var(--color-text-inverse);border-radius:var(--radius-md);text-decoration:none;font-weight:500;transition:opacity 0.2s;">
                View Job →
            </a>
        </div>
    `).join('');
}

function renderJobBoardSources() {
    const container = document.getElementById('jb-sources');

    if (jobboardState.sources.length === 0) {
        container.innerHTML = '<p style="opacity:0.6;">No sources configured.</p>';
        return;
    }

    container.innerHTML = jobboardState.sources.map(source => `
        <div style="padding:var(--space-3);background:var(--color-surface);border-radius:var(--radius-md);">
            <h4 style="margin:0 0 var(--space-1);font-size:var(--text-md);">${escapeHtml(source.name)}</h4>
            <p style="margin:0 0 var(--space-2);opacity:0.8;font-size:var(--text-sm);">${escapeHtml(source.description || '')}</p>
            <a href="${source.url}" target="_blank" rel="noopener noreferrer" style="font-size:var(--text-xs);color:var(--color-primary);text-decoration:none;">
                ${escapeHtml(source.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))} →
            </a>
        </div>
    `).join('');
}

// Utility
function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Hook into the zenar site's tab system
// When the jobboard tab is clicked, initialize the job board
document.addEventListener('DOMContentLoaded', () => {
    // Find the jobboard tab button and add a click handler
    const jobboardBtn = document.querySelector('[data-tab="jobboard"]');
    if (jobboardBtn) {
        jobboardBtn.addEventListener('click', () => {
            // Delay initialization until tab is actually visible
            setTimeout(initJobBoard, 100);
        });
    }

    // Also listen to global tab switching events if the site uses them
    document.addEventListener('tabChanged', (e) => {
        if (e.detail?.tab === 'jobboard') {
            initJobBoard();
        }
    });
});
