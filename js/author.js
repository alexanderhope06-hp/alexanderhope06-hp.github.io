/* =====================================================
   STORYNEST - AUTHOR DASHBOARD
   ===================================================== */

let currentUser = null;
let authorNovels = [];
let novelFilter = 'all';

/* =====================================================
   START AUTHOR STUDIO
   ===================================================== */

document.addEventListener('DOMContentLoaded', function() {
    initializeAuthorStudio();
});

/* =====================================================
   INITIALIZE
   ===================================================== */

async function initializeAuthorStudio() {
    console.log('AUTHOR STUDIO: Initializing...');
    
    try {
        const session = await getCurrentSession();
        
        if (!session || !session.user) {
            console.warn('AUTHOR STUDIO: No active session found.');
            redirectToLogin('author.html');
            return;
        }
        
        currentUser = session.user;
        console.log('AUTHOR STUDIO: Authenticated as:', currentUser.email);
        
        await loadAuthorData();
	await loadAuthorEarnings();
	await loadTopEarningNovels();
	await loadAuthorStatistics();
        setupLogout();
        setupNovelFilters();
        
    } catch (error) {
        console.error('Unexpected error in initialization:', error);
        redirectToLogin('author.html');
    }
}

async function loadAuthorData() {
    displayAuthor(currentUser);
    await loadAuthorNovels();
}

/* =====================================================
   REDIRECT TO LOGIN
   ===================================================== */

function redirectToLogin(destination) {
    const currentPage = 'author.html';
    window.location.replace(`login.html?redirect=${encodeURIComponent(currentPage)}`);
}

/* =====================================================
   LOGOUT
   ===================================================== */

function setupLogout() {
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            const confirmed = confirm('Are you sure you want to logout?');
            if (!confirmed) return;
            
            try {
                await supabaseClient.auth.signOut();
                localStorage.removeItem(AUTH_STORAGE_KEY);
                window.location.replace('index.html');
            } catch (error) {
                console.error('Logout error:', error);
                showToast('Failed to logout. Please try again.', 'error');
            }
        });
    }
}

/* =====================================================
   NOVEL FILTERS
   ===================================================== */

function setupNovelFilters() {
    const filterButtons = document.querySelectorAll('.novel-filter');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            novelFilter = this.dataset.filter;
            displayNovels();
        });
    });
}

/* =====================================================
   DISPLAY AUTHOR
   ===================================================== */

function displayAuthor(user) {
    const displayName = user.user_metadata?.display_name || 
                       user.user_metadata?.full_name || 
                       user.user_metadata?.name || 
                       user.email?.split('@')[0] || 
                       'Author';
    
    const bio = user.user_metadata?.bio || 'Tell readers about yourself and your stories.';
    
    const welcome = document.getElementById('welcomeMessage');
    if (welcome) welcome.textContent = `Welcome, ${displayName} 👋`;
    
    const authorName = document.getElementById('authorName');
    if (authorName) authorName.textContent = displayName;
    
    const authorBio = document.getElementById('authorBio');
    if (authorBio) authorBio.textContent = bio;
    
    const authorAvatar = document.getElementById('authorAvatar');
    if (authorAvatar) authorAvatar.textContent = displayName.charAt(0).toUpperCase();
    
    const profileButton = document.getElementById('profileButton');
    if (profileButton) profileButton.textContent = displayName;
    
    document.title = `${displayName} — Author Studio | StoryNest`;
}

/* =====================================================
   LOAD AUTHOR NOVELS
   ===================================================== */

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
        displayNovels();
        displayTopNovels();
        updateDashboardStatistics();
        
    } catch (error) {
        console.error('Error loading novels:', error);
        showToast('Failed to load novels.', 'error');
    }
}

/* =====================================================
   LOAD CHAPTER STATISTICS
   ===================================================== */

async function loadChapterStatistics() {
    if (!authorNovels || authorNovels.length === 0) {
        updateChapterCounters(0);
        return;
    }
    
    const novelIds = authorNovels.map(novel => novel.id);
    
    try {
        const { data: chapters, error } = await supabaseClient
            .from('chapters')
            .select('id, novel_id')
            .in('novel_id', novelIds);
        
        if (error) {
            console.error('Could not load chapter statistics:', error);
            authorNovels.forEach(novel => novel.chapterCount = 0);
            updateChapterCounters(0);
            return;
        }
        
        const totalChapters = chapters?.length || 0;
        authorNovels.forEach(novel => {
            novel.chapterCount = chapters.filter(ch => ch.novel_id === novel.id).length;
        });
        updateChapterCounters(totalChapters);
        
    } catch (error) {
        console.error('Error loading chapter statistics:', error);
        updateChapterCounters(0);
    }
}

/* =====================================================
   UPDATE CHAPTER COUNTERS
   ===================================================== */

function updateChapterCounters(total) {
    const chapterCount = document.getElementById('chapterCount');
    const activityChapterCount = document.getElementById('activityChapterCount');
    
    if (chapterCount) chapterCount.textContent = total;
    if (activityChapterCount) activityChapterCount.textContent = total;
}

/* =====================================================
   DASHBOARD STATISTICS
   ===================================================== */

function updateDashboardStatistics() {
    const publishedNovels = authorNovels.filter(novel => novel.status === 'published');
    const draftNovels = authorNovels.filter(novel => novel.status !== 'published');
    
    const publishedNovelCount = document.getElementById('publishedNovelCount');
    const activityPublishedCount = document.getElementById('activityPublishedCount');
    const activityDraftCount = document.getElementById('activityDraftCount');
    
    if (publishedNovelCount) publishedNovelCount.textContent = publishedNovels.length;
    if (activityPublishedCount) activityPublishedCount.textContent = publishedNovels.length;
    if (activityDraftCount) activityDraftCount.textContent = draftNovels.length;
}

/* =====================================================
   STATISTICS
   ===================================================== */

let statsRangeDays = 30;
let readsChartInstance = null;
let genreChartInstance = null;

/* Called from initializeAuthorStudio after novels load */
async function loadAuthorStatistics() {
    if (!currentUser) return;

    try {
        const since = statsRangeDays === 'all'
            ? null
            : new Date(Date.now() - statsRangeDays * 86400000).toISOString();

        // 1. Impressions in range
        let impressionsQuery = supabaseClient
            .from('novel_impressions')
            .select('novel_id, created_at')
            .eq('author_id', currentUser.id);

        if (since) impressionsQuery = impressionsQuery.gte('created_at', since);

        const { data: impressions, error: impErr } = await impressionsQuery;
        if (impErr) throw impErr;

        const rows = impressions || [];

        // 2. Total reads (all-time, separate small query)
        const { count: totalReadsAllTime } = await supabaseClient
            .from('novel_impressions')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', currentUser.id);

        // 3. Chapters created in range
        const novelIds = authorNovels.map(n => n.id);
        let chaptersInRange = [];
        if (novelIds.length) {
            let chapQuery = supabaseClient
                .from('chapters')
                .select('id, novel_id, created_at')
                .in('novel_id', novelIds);
            if (since) chapQuery = chapQuery.gte('created_at', since);
            const { data: chaps } = await chapQuery;
            chaptersInRange = chaps || [];
        }

        // 4. Lifetime author cut
        const { data: earnings } = await supabaseClient
            .from('author_earnings')
            .select('author_cut')
            .eq('author_id', currentUser.id)
            .maybeSingle();
        const lifetimeEarned = parseFloat(earnings?.author_cut || 0);

        // ---- KPI ROW ----
        setText('statTotalReads', (totalReadsAllTime || 0).toLocaleString());
        setText('statTotalReadsDelta',
            rows.length
                ? `+${rows.length.toLocaleString()} in period`
                : 'No reads in period'
        );

        const publishedCount = authorNovels.filter(n => n.status === 'published').length;
        const draftCount = authorNovels.length - publishedCount;
        setText('statNovelCount', authorNovels.length);
        setText('statNovelBreakdown',
            `${publishedCount} published • ${draftCount} draft${draftCount === 1 ? '' : 's'}`
        );

        const totalChapters = authorNovels.reduce((sum, n) => sum + (n.chapterCount || 0), 0);
        setText('statChapterCount', totalChapters);
        setText('statChapterDelta',
            chaptersInRange.length
                ? `+${chaptersInRange.length} in period`
                : 'No new chapters in period'
        );

        setText('statEarned', formatCurrency(lifetimeEarned));

        // ---- READS OVER TIME ----
        renderReadsChart(rows);

        // ---- GENRE DISTRIBUTION ----
        renderGenreChart();

        // ---- TOP NOVELS BY READS ----
        renderTopNovelsByReads(rows);

        // ---- TABLE ----
        renderStatsTable(rows);

    } catch (err) {
        console.error('Statistics load error:', err);
        showToast('Could not load statistics.', 'error');
    }
}

/* ---------------------------------------------
   Reads over time — bucketed by day
--------------------------------------------- */
function renderReadsChart(rows) {
    const canvas = document.getElementById('readsChart');
    const empty  = document.getElementById('readsChartEmpty');
    if (!canvas || !empty) return;

    const buckets = {};
    rows.forEach(r => {
        const day = (r.created_at || '').slice(0, 10);
        if (!day) return;
        buckets[day] = (buckets[day] || 0) + 1;
    });

    const labels = Object.keys(buckets).sort();
    const values = labels.map(d => buckets[d]);

    if (labels.length === 0) {
        canvas.hidden = true;
        empty.hidden = false;
        setText('readsChartPeriod', periodLabelForRange());
        return;
    }

    canvas.hidden = false;
    empty.hidden = true;
    setText('readsChartPeriod', periodLabelForRange());

    if (readsChartInstance) readsChartInstance.destroy();

    readsChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Reads',
                data: values,
                borderColor: '#7c5cff',
                backgroundColor: 'rgba(124,92,255,0.15)',
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: '#9a9ab0', maxTicksLimit: 8 },
                    grid:  { color: 'rgba(255,255,255,0.04)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9a9ab0', precision: 0 },
                    grid:  { color: 'rgba(255,255,255,0.04)' }
                }
            }
        }
    });
}

/* ---------------------------------------------
   Genre donut
--------------------------------------------- */
function renderGenreChart() {
    const canvas = document.getElementById('genreChart');
    const empty  = document.getElementById('genreChartEmpty');
    if (!canvas || !empty) return;

    const counts = {};
    authorNovels.forEach(n => {
        const g = (n.genre || 'Uncategorized').trim() || 'Uncategorized';
        counts[g] = (counts[g] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = labels.map(l => counts[l]);

    if (labels.length === 0) {
        canvas.hidden = true;
        empty.hidden = false;
        return;
    }

    canvas.hidden = false;
    empty.hidden = true;

    if (genreChartInstance) genreChartInstance.destroy();

    const palette = ['#7c5cff', '#f5a623', '#7ee0a0', '#ff6b9d', '#4dd0e1', '#ffb74d'];

    genreChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, i) => palette[i % palette.length]),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#e6e6ef', boxWidth: 12, padding: 12 }
                }
            }
        }
    });
}

/* ---------------------------------------------
   Top novels by reads (uses in-range rows)
--------------------------------------------- */
function renderTopNovelsByReads(rows) {
    const container = document.getElementById('statsTopNovels');
    if (!container) return;

    const counts = {};
    rows.forEach(r => {
        counts[r.novel_id] = (counts[r.novel_id] || 0) + 1;
    });

    const ranked = Object.entries(counts)
        .map(([id, reads]) => {
            const novel = authorNovels.find(n => n.id === id);
            return {
                title: novel?.title || 'Untitled',
                genre: novel?.genre || 'Story',
                reads
            };
        })
        .sort((a, b) => b.reads - a.reads)
        .slice(0, 5);

    if (ranked.length === 0) {
        container.innerHTML = `
            <div class="dashboard-empty">
                <div>📚</div>
                <p>No reads in this period.</p>
            </div>`;
        return;
    }

    container.innerHTML = ranked.map((n, i) => `
        <div class="stats-top-row">
            <div class="stats-top-rank">#${i + 1}</div>
            <div class="stats-top-info">
                <strong>${escapeHTML(n.title)}</strong>
                <span>${escapeHTML(n.genre)}</span>
            </div>
            <div class="stats-top-value">${n.reads.toLocaleString()}</div>
        </div>
    `).join('');
}

/* ---------------------------------------------
   Full per-novel table
--------------------------------------------- */
function renderStatsTable(rows) {
    const tbody = document.getElementById('statsTableBody');
    if (!tbody) return;

    const counts = {};
    rows.forEach(r => {
        counts[r.novel_id] = (counts[r.novel_id] || 0) + 1;
    });

    if (!authorNovels.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="stats-loading">No novels yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = authorNovels.map(n => {
        const reads = counts[n.id] || 0;
        const chapters = n.chapterCount || 0;
        const perChapter = chapters ? (reads / chapters).toFixed(1) : '—';
        const status = n.status === 'published' ? 'published' : 'draft';
        const statusLabel = n.status === 'published' ? 'Published' : 'Draft';

        return `
            <tr>
                <td>${escapeHTML(n.title)}</td>
                <td>${escapeHTML(n.genre || '—')}</td>
                <td><span class="stats-badge ${status}">${statusLabel}</span></td>
                <td>${chapters}</td>
                <td>${reads.toLocaleString()}</td>
                <td>${perChapter}</td>
            </tr>
        `;
    }).join('');
}

/* ---------------------------------------------
   Helpers
--------------------------------------------- */
function periodLabelForRange() {
    if (statsRangeDays === 'all') return 'All time';
    if (statsRangeDays === 7)   return 'Last 7 days';
    if (statsRangeDays === 30)  return 'Last 30 days';
    if (statsRangeDays === 90)  return 'Last 90 days';
    if (statsRangeDays === 365) return 'Last 12 months';
    return `Last ${statsRangeDays} days`;
}

function setupStatsRangeFilter() {
    const select = document.getElementById('statsRange');
    if (!select) return;
    select.addEventListener('change', function () {
        statsRangeDays = this.value === 'all' ? 'all' : parseInt(this.value, 10);
        loadAuthorStatistics();
    });
}



/* =====================================================
   DISPLAY NOVELS
   ===================================================== */

function displayNovels() {
    const novelList = document.getElementById('novelList');
    if (!novelList) return;
    
    // Filter novels
    let filteredNovels = authorNovels;
    if (novelFilter === 'published') {
        filteredNovels = authorNovels.filter(n => n.status === 'published');
    } else if (novelFilter === 'draft') {
        filteredNovels = authorNovels.filter(n => n.status !== 'published');
    }
    
    // No novels
    if (!filteredNovels || filteredNovels.length === 0) {
        const message = novelFilter === 'all' 
            ? 'You haven\'t created any novels yet.'
            : novelFilter === 'published' 
                ? 'You haven\'t published any novels yet.'
                : 'You don\'t have any drafts.';
        
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
    
    filteredNovels.forEach(novel => {
        const item = document.createElement('article');
        item.className = 'author-novel';
        
        const statusClass = novel.status === 'published' ? 'published' : 'draft';
        const statusText = novel.status === 'published' ? 'Published' : 'Draft';
        
        item.innerHTML = `
            <div class="author-cover">${escapeHTML(novel.title)}</div>
            <div class="author-novel-info">
                <span class="status ${statusClass}">● ${statusText}</span>
                <h2>${escapeHTML(novel.title)}</h2>
                <p>${escapeHTML(novel.genre || 'Story')} • ${novel.chapterCount || 0} Chapters</p>
                <p class="muted">${novel.status === 'published' ? 'Published story' : 'Story in progress'}</p>
            </div>
            <div class="author-actions">
                <button class="secondary-btn edit-novel" data-id="${novel.id}">Edit</button>
                <button class="secondary-btn manage-chapters" data-id="${novel.id}">Chapters</button>
                <button class="secondary-btn novel-statistics" data-id="${novel.id}">Statistics</button>
                <button class="danger-btn delete-novel" data-id="${novel.id}">Delete</button>
            </div>
        `;
        
        // Edit
        item.querySelector('.edit-novel').addEventListener('click', function() {
            window.location.href = `edit-novel.html?id=${encodeURIComponent(this.dataset.id)}`;
        });
        
        // Chapters
        item.querySelector('.manage-chapters').addEventListener('click', function() {
            window.location.href = `chapters.html?id=${encodeURIComponent(this.dataset.id)}`;
        });
        
        // Statistics
        item.querySelector('.novel-statistics').addEventListener('click', function() {
            window.location.href = `statistics.html?id=${encodeURIComponent(this.dataset.id)}`;
        });
        
        // Delete
        item.querySelector('.delete-novel').addEventListener('click', function() {
            deleteNovel(this.dataset.id);
        });
        
        novelList.appendChild(item);
    });
}

/* =====================================================
   DELETE NOVEL
   ===================================================== */

async function deleteNovel(novelId) {
    const novel = authorNovels.find(n => n.id === novelId);
    if (!novel) return;
    
    const confirmed = confirm(`Delete "${novel.title}"?\n\nThis will permanently delete the novel and all its chapters and characters.`);
    if (!confirmed) return;
    
    try {
        // Delete chapters
        await supabaseClient.from('chapters').delete().eq('novel_id', novelId);
        
        // Delete characters
        await supabaseClient.from('characters').delete().eq('novel_id', novelId);
        
        // Delete novel
        const { error } = await supabaseClient.from('novels').delete().eq('id', novelId);
        
        if (error) throw error;
        
        showToast(`"${novel.title}" has been deleted.`);
        await loadAuthorNovels();
	await loadAuthorStatistics();
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete novel: ' + error.message, 'error');
    }
}

/* =====================================================
   TOP NOVELS
   ===================================================== */

function displayTopNovels() {
    const topNovels = document.getElementById('topNovels');
    if (!topNovels) return;
    
    const publishedNovels = authorNovels.filter(novel => novel.status === 'published');
    
    if (publishedNovels.length === 0) {
        topNovels.innerHTML = `
            <div class="dashboard-empty">
                <div>📚</div>
                <p>Your published novels will appear here.</p>
            </div>
        `;
        return;
    }
    
    topNovels.innerHTML = '';
    publishedNovels.slice(0, 3).forEach((novel, index) => {
        const item = document.createElement('div');
        item.className = 'top-novel';
        item.innerHTML = `
            <div class="top-rank">#${index + 1}</div>
            <div class="top-novel-cover">📖</div>
            <div class="top-novel-info">
                <strong>${escapeHTML(novel.title)}</strong>
                <span>${escapeHTML(novel.genre || 'Story')} • ${novel.chapterCount || 0} Chapters</span>
            </div>
            <span class="analytics-pending">Reader analytics pending</span>
        `;
        topNovels.appendChild(item);
    });
}

/* =====================================================
   SEARCH
   ===================================================== */

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
    
    // Close search on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchPanel.classList.contains('active')) {
            searchPanel.classList.remove('active');
        }
    });
}

/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

/* =====================================================
   EARNINGS — LOAD FROM SETTLED REVENUE VIEW
   ===================================================== */

async function loadAuthorEarnings() {
    if (!currentUser) return;

    try {
        // 1. Fetch this author's 50% cut
        const { data: earnings, error: earningsErr } = await supabaseClient
            .from('author_earnings')
            .select('*')
            .eq('author_id', currentUser.id)
            .maybeSingle();

        if (earningsErr) throw earningsErr;

        const authorCut = parseFloat(earnings?.author_cut || 0);
        const grossShare = parseFloat(earnings?.gross_share || 0);

        // 2. Fetch the most recent SETTLED period for "this month" logic
        const { data: settlements, error: stErr } = await supabaseClient
            .from('revenue_settlements')
            .select('*')
            .eq('status', 'settled')
            .order('period_end', { ascending: false })
            .limit(1);

        if (stErr) throw stErr;

        const latestPeriod = settlements?.[0];
        const periodLabel = latestPeriod
            ? `${formatDate(latestPeriod.period_start)} – ${formatDate(latestPeriod.period_end)}`
            : 'No settled period yet';

        // 3. Monthly figure = author's cut during the latest settled period only
        // (simple approximation: same ratio applied to that period's net)
        let monthlyCut = 0;
        if (latestPeriod && grossShare > 0) {
            monthlyCut = authorCut * 0.4; // proxy: ~40% of lifetime landed in last period
            // Replace this proxy with a proper per-period SQL view later.
        }

        // 4. Available balance = author's cut minus withdrawals (placeholder)
        const withdrawn = 0;
        const availableBalance = Math.max(0, authorCut - withdrawn);

        // 5. Push to UI
        setText('totalRevenue', formatCurrency(authorCut));
        setText('monthlyRevenue', formatCurrency(monthlyCut));
        setText('availableBalance', formatCurrency(availableBalance));

        // 6. Show status note
        const note = document.querySelector('#earnings .earnings-note');
        if (note) {
            if (!latestPeriod) {
                note.innerHTML = `
                    📊 Earnings appear once a revenue period has been
                    <strong>settled and approved</strong> by our ad network.
                    This typically happens 30–45 days after the month ends.
                `;
            } else {
                note.innerHTML = `
                    ✅ Latest settled period: <strong>${periodLabel}</strong><br>
                    <small>Author share: 50% • StoryNest share: 50%</small><br>
                    <small>Deductions applied for invalid traffic are already removed.</small>
                `;
            }
        }

    } catch (err) {
        console.error('Earnings load error:', err);
        setText('totalRevenue', '—');
        setText('monthlyRevenue', '—');
        setText('availableBalance', '—');
    }
}


/* =====================================================
   TOP 3 NOVELS BY EARNINGS
   ===================================================== */

async function loadTopEarningNovels() {
    if (!currentUser) return;

    const container = document.getElementById('topEarningNovels');
    if (!container) return;

    try {
        // Impressions per novel for this author
        const { data: rows, error } = await supabaseClient
            .from('novel_impressions')
            .select('novel_id')
            .eq('author_id', currentUser.id);

        if (error) throw error;

        // Tally
        const counts = {};
        (rows || []).forEach(r => {
            counts[r.novel_id] = (counts[r.novel_id] || 0) + 1;
        });

        // Get total lifetime author cut to allocate proportionally
        const { data: earnings } = await supabaseClient
            .from('author_earnings')
            .select('author_cut')
            .eq('author_id', currentUser.id)
            .maybeSingle();

        const totalAuthorCut = parseFloat(earnings?.author_cut || 0);
        const totalImpressions = Object.values(counts).reduce((a, b) => a + b, 0);

        if (totalImpressions === 0 || totalAuthorCut === 0) {
            container.innerHTML = `
                <div class="dashboard-empty">
                    <div>💰</div>
                    <p>Your top-earning novels will appear here once ad revenue is settled.</p>
                </div>
            `;
            return;
        }

        // Rank novels
        const ranked = Object.entries(counts)
            .map(([novelId, imp]) => {
                const novel = authorNovels.find(n => n.id === novelId);
                const share = imp / totalImpressions;
                const earned = totalAuthorCut * share;
                return {
                    novelId,
                    title: novel?.title || 'Untitled',
                    genre: novel?.genre || 'Story',
                    impressions: imp,
                    earned
                };
            })
            .sort((a, b) => b.earned - a.earned)
            .slice(0, 3);

        container.innerHTML = ranked.map((n, i) => `
            <div class="top-novel">
                <div class="top-rank">#${i + 1}</div>
                <div class="top-novel-cover">📖</div>
                <div class="top-novel-info">
                    <strong>${escapeHTML(n.title)}</strong>
                    <span>${escapeHTML(n.genre)} • ${n.impressions.toLocaleString()} reads</span>
                </div>
                <span class="top-earn">${formatCurrency(n.earned)}</span>
            </div>
        `).join('');

    } catch (err) {
        console.error('Top novels load error:', err);
        container.innerHTML = `
            <div class="dashboard-empty">
                <div>⚠️</div>
                <p>Could not load top novels right now.</p>
            </div>
        `;
    }
}


/* =====================================================
   HELPERS
   ===================================================== */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatCurrency(n) {
    return '$' + Number(n || 0).toFixed(2);
}

function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}