/* =====================================================
   STORYNEST — AUTHOR DASHBOARD
   ===================================================== */

let currentUser = null;
let authorNovels = [];
let novelFilter = 'all';

document.addEventListener('DOMContentLoaded', initializeAuthorStudio);

async function initializeAuthorStudio() {
    // ---- Role guard ----
    const user = await requireAuthor({ redirect: 'author.html' });
    if (!user) return;

    currentUser = user;

    try {
        await loadAuthorData();
        setupLogout();
        setupNovelFilters();
    } catch (error) {
        console.error('Author Studio init failed:', error);
        redirectToLogin('author.html');
    }
}


async function loadAuthorData() {
    displayAuthor(currentUser);
    await loadAuthorNovels();
}


function redirectToLogin(destination) {
    window.location.replace(
        `login.html?redirect=${encodeURIComponent(destination)}`
    );
}


/* ---------- Logout ---------- */

function setupLogout() {
    const logoutBtn = document.getElementById('logoutButton');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to logout?')) return;

        try {
            await supabaseClient.auth.signOut();
            localStorage.removeItem(AUTH_STORAGE_KEY);
            window.location.replace('index.html');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Could not log out. Please try again.', 'error');
        }
    });
}


/* ---------- Filters ---------- */

function setupNovelFilters() {
    const buttons = document.querySelectorAll('.novel-filter');
    buttons.forEach(btn => {
        btn.addEventListener('click', function () {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            novelFilter = this.dataset.filter;
            displayNovels();
        });
    });
}


/* ---------- Author header ---------- */

function displayAuthor(user) {
    const displayName =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Author';

    const bio = user.user_metadata?.bio ||
        'Tell readers about yourself and your stories.';

    setText('welcomeMessage', `Welcome, ${displayName} 👋`);
    setText('authorName', displayName);
    setText('authorBio', bio);
    setText('authorAvatar', displayName.charAt(0).toUpperCase());
    setText('profileButton', displayName);

    document.title = `${displayName} — Author Studio | StoryNest`;
}


function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}


/* ---------- Load all author novels ---------- */

async function loadAuthorNovels() {
    if (!currentUser) return;

    try {
        const { data: novels, error } = await supabaseClient
            .from('novels')
            .select('*')
            .eq('author_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Could not load author novels:', error);
            const novelList = document.getElementById('novelList');
            if (novelList) {
                novelList.innerHTML = `
                    <div class="dashboard-empty">
                        <div>⚠️</div>
                        <h3>Could not load your novels.</h3>
                        <p>${escapeHTML(error.message)}</p>
                    </div>
                `;
            }
            return;
        }

        authorNovels = novels || [];

        await loadChapterStatistics();
        await loadNovelRatings();
        await loadNovelReaderCounts();
        await loadNovelReaderCounts();
        await loadReaderGrowth();

        displayNovels();
        displayTopNovels();
        updateDashboardStatistics();

    } catch (error) {
        console.error('Error loading novels:', error);
        showToast('Failed to load novels.', 'error');
    }
}


/* ---------- Chapter counts ---------- */

async function loadChapterStatistics() {
    if (!authorNovels.length) {
        updateChapterCounters(0);
        return;
    }

    const novelIds = authorNovels.map(n => n.id);

    try {
        const { data: chapters, error } = await supabaseClient
            .from('chapters')
            .select('id, novel_id')
            .in('novel_id', novelIds);

        if (error) {
            authorNovels.forEach(n => n.chapterCount = 0);
            updateChapterCounters(0);
            return;
        }

        authorNovels.forEach(novel => {
            novel.chapterCount =
                chapters.filter(ch => ch.novel_id === novel.id).length;
        });

        updateChapterCounters(chapters?.length || 0);

    } catch (error) {
        console.error('Chapter stats error:', error);
        updateChapterCounters(0);
    }
}


/* ---------- Ratings ---------- */

async function loadNovelRatings() {
    if (!authorNovels.length) {
        updateAverageRating();
        return;
    }

    const novelIds = authorNovels.map(n => n.id);

    try {
        const { data, error } = await supabaseClient
            .from('novel_ratings_summary')
            .select('*')
            .in('novel_id', novelIds);

        if (error) {
            authorNovels.forEach(n => {
                n.average_rating = 0;
                n.rating_count = 0;
            });
            updateAverageRating();
            return;
        }

        const map = {};
        (data || []).forEach(row => { map[row.novel_id] = row; });

        authorNovels.forEach(novel => {
            const s = map[novel.id];
            novel.average_rating = s?.average_rating
                ? parseFloat(s.average_rating)
                : 0;
            novel.rating_count = s?.rating_count || 0;
        });

        updateAverageRating();

    } catch (err) {
        console.warn('Ratings fetch failed:', err);
        updateAverageRating();
    }
}


function updateAverageRating() {
    const el = document.getElementById('averageRatingStat');
    if (!el) return;

    const rated = authorNovels.filter(n => n.rating_count > 0);
    if (!rated.length) {
        el.textContent = '—';
        return;
    }

    const totalStars = rated.reduce(
        (sum, n) => sum + n.average_rating * n.rating_count, 0
    );
    const totalCount = rated.reduce((sum, n) => sum + n.rating_count, 0);
    const overall = totalCount > 0 ? totalStars / totalCount : 0;

    el.textContent = `${overall.toFixed(1)} ⭐`;
}


/* ---------- Readers ---------- */

async function loadNovelReaderCounts() {
    if (!authorNovels.length) {
        updateTotalReaders();
        return;
    }

    const novelIds = authorNovels.map(n => n.id);

    try {
        const { data, error } = await supabaseClient
            .from('novel_readers_summary')
            .select('*')
            .in('novel_id', novelIds);

        if (error) {
            authorNovels.forEach(n => n.reader_count = 0);
            updateTotalReaders();
            return;
        }

        const map = {};
        (data || []).forEach(row => { map[row.novel_id] = row.reader_count; });

        authorNovels.forEach(novel => {
            novel.reader_count = map[novel.id] || 0;
        });

        updateTotalReaders();

    } catch (err) {
        console.warn('Reader count fetch failed:', err);
        updateTotalReaders();
    }
}


function updateTotalReaders() {
    const el = document.getElementById('totalReadersStat');
    if (!el) return;

    const total = authorNovels.reduce(
        (sum, n) => sum + (n.reader_count || 0), 0
    );
    el.textContent = total.toLocaleString();
}


/* =====================================================
   READER GROWTH (last 6 months)
   ===================================================== */

async function loadReaderGrowth() {
    const container = document.getElementById('readerGrowthContainer');
    if (!container) return;

    if (!authorNovels.length) {
        renderGrowthEmpty(container, 'No novels yet.');
        return;
    }

    const novelIds = authorNovels.map(n => n.id);

    // Fetch monthly reader counts for all author's novels
    const { data: rows, error } = await supabaseClient
        .from('novel_monthly_readers')
        .select('novel_id, first_read_month, new_readers')
        .in('novel_id', novelIds);

    if (error) {
        console.warn('Reader growth fetch failed:', error);
        renderGrowthEmpty(container, 'Could not load reader growth.');
        return;
    }

    // Build the last 6 months window
    const months = getLastSixMonths();

    // Aggregate: month → total new readers
    const monthlyTotals = {};
    months.forEach(m => { monthlyTotals[m.key] = 0; });

    // Track per-novel totals for the "top growing novels" list
    const perNovel = {};

    (rows || []).forEach(row => {
        const monthKey = row.first_read_month.slice(0, 7); // "2026-01"

        if (monthlyTotals[monthKey] !== undefined) {
            monthlyTotals[monthKey] += row.new_readers;
        }

        perNovel[row.novel_id] =
            (perNovel[row.novel_id] || 0) + row.new_readers;
    });

    // Top growing novels (last 6 months)
    const topNovels = Object.entries(perNovel)
        .map(([id, count]) => {
            const novel = authorNovels.find(n => n.id === id);
            return {
                title: novel?.title || 'Untitled',
                count,
            };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    renderGrowthChart(container, months, monthlyTotals, topNovels);
}


/* ---------- Build the 6-month window ---------- */

function getLastSixMonths() {
    const out = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en-US', { month: 'short' });

        out.push({ key, label, year, month });
    }
    return out;
}


/* ---------- Render the chart ---------- */

function renderGrowthChart(container, months, monthlyTotals, topNovels) {
    const values = months.map(m => monthlyTotals[m.key] || 0);
    const maxValue = Math.max(...values, 1);

    const thisMonth = values[values.length - 1] || 0;
    const lastMonth = values[values.length - 2] || 0;
    const totalSixMonths = values.reduce((a, b) => a + b, 0);

    // Change vs last month
    let changeText = '—';
    let changeClass = '';
    if (lastMonth === 0 && thisMonth > 0) {
        changeText = 'New this month';
        changeClass = 'positive';
    } else if (lastMonth > 0) {
        const diff = thisMonth - lastMonth;
        const pct = Math.round((diff / lastMonth) * 100);
        if (pct > 0) {
            changeText = `+${pct}%`;
            changeClass = 'positive';
        } else if (pct < 0) {
            changeText = `${pct}%`;
            changeClass = 'negative';
        } else {
            changeText = 'No change';
        }
    }

    const barsHTML = months.map((m, i) => {
        const value = values[i];
        const heightPercent = maxValue > 0
            ? Math.max(4, (value / maxValue) * 100)
            : 4;

        // Show the value label always if it's non-zero, or on hover
        const labelClass = value > 0 ? 'growth-bar-value always' : 'growth-bar-value';

        return `
            <div class="growth-bar-wrap">
                <div class="growth-bar" style="height: ${heightPercent}%;">
                    <span class="${labelClass}">${value}</span>
                </div>
                <span class="growth-bar-label">${m.label}</span>
            </div>
        `;
    }).join('');

    const topHTML = topNovels.length
        ? `
            <div class="growth-top-list">
                <h4>Top Growing Novels</h4>
                ${topNovels.map((n, i) => `
                    <div class="growth-top-item">
                        <div class="growth-top-rank">#${i + 1}</div>
                        <div class="growth-top-title">${escapeHTML(n.title)}</div>
                        <div class="growth-top-count">+${n.count}</div>
                    </div>
                `).join('')}
            </div>
        `
        : '';

    // Nothing tracked at all?
    if (totalSixMonths === 0) {
        container.innerHTML = `
            <div class="growth-empty">
                <div class="growth-empty-icon">📈</div>
                <h3>No reader data yet</h3>
                <p>Once readers start opening your novels, their monthly growth will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="reader-growth-summary">
            <div class="growth-stat">
                <span>This Month</span>
                <strong>${thisMonth.toLocaleString()}</strong>
                <small>new readers</small>
            </div>
            <div class="growth-stat">
                <span>vs Last Month</span>
                <strong class="${changeClass}">${changeText}</strong>
                <small>${lastMonth.toLocaleString()} last month</small>
            </div>
            <div class="growth-stat">
                <span>Last 6 Months</span>
                <strong>${totalSixMonths.toLocaleString()}</strong>
                <small>total new readers</small>
            </div>
        </div>

        <div class="growth-chart">
            ${barsHTML}
        </div>

        ${topHTML}
    `;
}


/* ---------- Empty state helper ---------- */

function renderGrowthEmpty(container, message) {
    container.innerHTML = `
        <div class="growth-empty">
            <div class="growth-empty-icon">📈</div>
            <h3>No reader data yet</h3>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}


/* ---------- Counters ---------- */

function updateChapterCounters(total) {
    setText('chapterCount', total);
    setText('activityChapterCount', total);
}


function updateDashboardStatistics() {
    const published = authorNovels.filter(n => n.status === 'published');
    const drafts = authorNovels.filter(n => n.status !== 'published');

    setText('publishedNovelCount', published.length);
    setText('activityPublishedCount', published.length);
    setText('activityDraftCount', drafts.length);
}


/* ---------- Novel list ---------- */

function displayNovels() {
    const novelList = document.getElementById('novelList');
    if (!novelList) return;

    let filtered = authorNovels;
    if (novelFilter === 'published') {
        filtered = authorNovels.filter(n => n.status === 'published');
    } else if (novelFilter === 'draft') {
        filtered = authorNovels.filter(n => n.status !== 'published');
    }

    if (!filtered.length) {
        const message =
            novelFilter === 'all' ? "You haven't created any novels yet." :
            novelFilter === 'published' ? "You haven't published any novels yet." :
            "You don't have any drafts.";

        novelList.innerHTML = `
            <div class="dashboard-empty">
                <div>📖</div>
                <h3>${message}</h3>
                <p>Create your first story and share it with StoryNest readers.</p>
                <a href="add-novel.html" class="primary-btn">+ Create Your First Novel</a>
            </div>
        `;
        return;
    }

    novelList.innerHTML = '';

    filtered.forEach(novel => {
        const item = document.createElement('article');
        item.className = 'author-novel';

        const statusClass = novel.status === 'published' ? 'published' : 'draft';
        const statusText = novel.status === 'published' ? 'Published' : 'Draft';
        const cover = novel.cover_url || 'image/default-cover.png';

        const ratingHTML = novel.rating_count > 0
            ? `<p class="novel-rating-compact">
                   <span class="stars">${renderStars(novel.average_rating)}</span>
                   <span>${novel.average_rating.toFixed(1)}</span>
                   <span class="count">(${novel.rating_count})</span>
               </p>`
            : `<p class="novel-rating-compact"><span class="count">No ratings yet</span></p>`;

        const readersHTML = novel.reader_count > 0
            ? `<p class="muted">👥 ${novel.reader_count.toLocaleString()} reader${novel.reader_count !== 1 ? 's' : ''}</p>`
            : '';

        item.innerHTML = `
            <div class="author-cover">
                <img src="${escapeHTML(cover)}"
                     alt="${escapeHTML(novel.title)}"
                     loading="lazy"
                     onerror="this.onerror=null;this.src='image/default-cover.png';">
            </div>
            <div class="author-novel-info">
                <span class="status ${statusClass}">● ${statusText}</span>
                <h2>${escapeHTML(novel.title)}</h2>
                <p>${escapeHTML(novel.genre || 'Story')} • ${novel.chapterCount || 0} Chapters</p>
                ${ratingHTML}
                ${readersHTML}
                <p class="muted">${novel.status === 'published' ? 'Published story' : 'Story in progress'}</p>
            </div>
            <div class="author-actions">
                <button class="secondary-btn edit-novel" data-id="${novel.id}">Edit</button>
                <button class="secondary-btn manage-chapters" data-id="${novel.id}">Chapters</button>
                <button class="secondary-btn novel-statistics" data-id="${novel.id}">Statistics</button>
                <button class="danger-btn delete-novel" data-id="${novel.id}">Delete</button>
            </div>
        `;

        item.querySelector('.edit-novel').addEventListener('click', function () {
            window.location.href = `edit-novel.html?id=${encodeURIComponent(this.dataset.id)}`;
        });

        item.querySelector('.manage-chapters').addEventListener('click', function () {
            window.location.href = `chapters.html?id=${encodeURIComponent(this.dataset.id)}`;
        });

        item.querySelector('.novel-statistics').addEventListener('click', function () {
            window.location.href = `statistics.html?id=${encodeURIComponent(this.dataset.id)}`;
        });

        item.querySelector('.delete-novel').addEventListener('click', function () {
            deleteNovel(this.dataset.id);
        });

        novelList.appendChild(item);
    });
}


/* ---------- Delete a novel ---------- */

async function deleteNovel(novelId) {
    const novel = authorNovels.find(n => n.id === novelId);
    if (!novel) return;

    const confirmed = confirm(
        `Delete "${novel.title}"?\n\n` +
        `This will permanently delete the novel, its chapters, ` +
        `characters, ratings and reading history.`
    );
    if (!confirmed) return;

    try {
        await supabaseClient.from('chapters').delete().eq('novel_id', novelId);
        await supabaseClient.from('characters').delete().eq('novel_id', novelId);
        await supabaseClient.from('ratings').delete().eq('novel_id', novelId);
        await supabaseClient.from('reading_history').delete().eq('novel_id', novelId);

        const { error } = await supabaseClient
            .from('novels')
            .delete()
            .eq('id', novelId);

        if (error) throw error;

        showToast(`"${novel.title}" has been deleted.`);
        await loadAuthorNovels();

    } catch (error) {
        console.error('Delete error:', error);
        showToast('Could not delete the novel: ' + error.message, 'error');
    }
}



/* ---------- Top novels ---------- */

function displayTopNovels() {
    const topNovels = document.getElementById('topNovels');
    if (!topNovels) return;

    const published = authorNovels
        .filter(n => n.status === 'published')
        .sort((a, b) => {
            // Rating first
            if (b.average_rating !== a.average_rating) {
                return b.average_rating - a.average_rating;
            }
            // Tiebreaker: more readers wins
            return (b.reader_count || 0) - (a.reader_count || 0);
        });

    if (!published.length) {
        topNovels.innerHTML = `
            <div class="dashboard-empty">
                <div>📚</div>
                <p>Your published novels will appear here.</p>
            </div>
        `;
        return;
    }

    topNovels.innerHTML = '';

    published.slice(0, 3).forEach((novel, index) => {
        const item = document.createElement('div');
        item.className = 'top-novel';

        const readers = novel.reader_count > 0
            ? `👥 ${novel.reader_count.toLocaleString()} readers`
            : 'No readers yet';

        const rating = novel.rating_count > 0
            ? ` • ⭐ ${novel.average_rating.toFixed(1)} (${novel.rating_count})`
            : '';

        item.innerHTML = `
            <div class="top-rank">#${index + 1}</div>
            <div class="top-novel-cover">📖</div>
            <div class="top-novel-info">
                <strong>${escapeHTML(novel.title)}</strong>
                <span>${escapeHTML(novel.genre || 'Story')} • ${novel.chapterCount || 0} Chapters</span>
            </div>
            <span class="analytics-pending">${readers}${rating}</span>
        `;

        topNovels.appendChild(item);
    });
}


/* ---------- Stars helper ---------- */

function renderStars(average, max = 5) {
    const rounded = Math.round(average * 2) / 2;
    let stars = '';
    for (let i = 1; i <= max; i++) {
        stars += (i <= rounded) ? '★' : '☆';
    }
    return stars;
}


/* ---------- Search panel ---------- */

const searchBtn = document.getElementById('searchBtn');
const searchPanel = document.getElementById('searchPanel');

if (searchBtn && searchPanel) {
    searchBtn.addEventListener('click', () => {
        searchPanel.classList.toggle('active');
        if (searchPanel.classList.contains('active')) {
            const input = searchPanel.querySelector('input');
            if (input) setTimeout(() => input.focus(), 100);
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && searchPanel.classList.contains('active')) {
            searchPanel.classList.remove('active');
        }
    });
}


/* ---------- Safety ---------- */

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}