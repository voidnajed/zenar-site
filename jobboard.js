// Job Board — Load from PHP API (bypasses static file caching)

let jobboardState = { listings: [], sources: [], filteredListings: [] };

async function loadAndRender() {
    try {
        console.log('[jobboard] Fetching from API...');
        const [listingsRes, sourcesRes] = await Promise.all([
            fetch('./api.php?resource=listings'),
            fetch('./api.php?resource=sources')
        ]);

        if (!listingsRes.ok || !sourcesRes.ok) {
            console.error('[jobboard] API error:', listingsRes.status, sourcesRes.status);
            return;
        }

        const listings = await listingsRes.json();
        const sources = await sourcesRes.json();

        jobboardState.listings = listings.listings || [];
        jobboardState.sources = sources.sources || [];
        jobboardState.filteredListings = jobboardState.listings;

        console.log('[jobboard] Loaded:', jobboardState.listings.length, 'listings');
        render();
    } catch (e) {
        console.error('[jobboard] Error:', e);
    }
}

function render() {
    // Timestamp
    const timeEl = document.getElementById('jb-updated-time');
    if (timeEl && jobboardState.listings[0]) {
        const timestamp = jobboardState.listings[0].discovered || jobboardState.listings[0].discoveredAt;
        if (timestamp) {
            const d = new Date(timestamp);
            timeEl.textContent = d.toLocaleString('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' 
            }) + ' ET';
        }
    }

    // Stats
    const stats = document.getElementById('jb-stats');
    if (stats) {
        stats.innerHTML = `<div style="padding:var(--space-3) var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);text-align:center;flex:1;min-width:120px;"><div style="font-size:var(--text-sm);opacity:0.7;">Total Jobs</div><div style="font-size:1.5rem;font-weight:600;">${jobboardState.listings.length}</div></div>`;
    }

    // Locations filter
    const locEl = document.getElementById('jb-filter-location');
    if (locEl) {
        const locs = [...new Set(jobboardState.listings.map(j => j.location).filter(Boolean))].sort();
        locEl.innerHTML = '<option value="">All Locations</option>' + 
            locs.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
        locEl.onchange = () => {
            const selectedLoc = locEl.value;
            jobboardState.filteredListings = selectedLoc 
                ? jobboardState.listings.filter(l => l.location === selectedLoc)
                : jobboardState.listings;
            renderListings();
        };
    }

    renderListings();

    // Sources
    const srcEl = document.getElementById('jb-sources');
    if (srcEl && jobboardState.sources.length) {
        srcEl.innerHTML = jobboardState.sources.map(s => `
            <div style="padding:var(--space-3);background:var(--color-surface);border-radius:var(--radius-md);">
                <h4 style="margin:0 0 var(--space-1);font-size:var(--text-md);">${escapeHtml(s.name)}</h4>
                <p style="margin:0 0 var(--space-2);opacity:0.8;font-size:var(--text-sm);">${escapeHtml(s.description || '')}</p>
                <a href="${s.url}" target="_blank" rel="noopener noreferrer" style="font-size:var(--text-xs);color:var(--color-primary);text-decoration:none;">
                    ${escapeHtml(s.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))} →
                </a>
            </div>
        `).join('');
    }
}

function renderListings() {
    const container = document.getElementById('jb-listings');
    if (!container) return;

    if (!jobboardState.filteredListings.length) {
        container.innerHTML = '<p style="opacity:0.6;">No listings match your filters.</p>';
        return;
    }

    container.innerHTML = jobboardState.filteredListings.map(l => `
        <div style="padding:var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);border-left:3px solid #4ade80;">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:var(--space-3);margin-bottom:var(--space-2);">
                <div>
                    <h3 style="margin:0;font-size:var(--text-lg);font-weight:600;">${escapeHtml(l.jobTitle || 'Untitled')}</h3>
                    <p style="margin:var(--space-1) 0 0;opacity:0.8;">${escapeHtml(l.company)}</p>
                </div>
                ${l.matchScore ? `<span style="padding:var(--space-1) var(--space-3);background:rgba(74,222,128,0.2);color:#4ade80;border-radius:var(--radius-sm);font-size:var(--text-xs);font-weight:600;white-space:nowrap;">${l.matchScore}% match</span>` : ''}
            </div>

            <div style="display:grid;gap:var(--space-2);font-size:var(--text-sm);opacity:0.8;margin-bottom:var(--space-3);">
                <div><strong>📍</strong> ${escapeHtml(l.location || 'N/A')}</div>
                ${l.salaryRange ? `<div><strong>💰</strong> ${escapeHtml(l.salaryRange)}</div>` : ''}
                ${l.source ? `<div><strong>🔗</strong> ${escapeHtml(l.source)}</div>` : ''}
            </div>

            <a href="${l.link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:var(--space-2) var(--space-4);background:var(--color-primary);color:var(--color-text-inverse);border-radius:var(--radius-md);text-decoration:none;font-weight:500;">
                View Job →
            </a>
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', loadAndRender);
