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
        .sort((a, b) => (b.reader_count || 0) - (a.reader_count || 0));

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