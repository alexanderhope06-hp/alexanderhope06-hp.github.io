/* =====================================================
   STORYNEST — PUBLIC AUTHOR PROFILE
   ===================================================== */

const params = new URLSearchParams(window.location.search);
const authorId = params.get('id');

const nameEl = document.getElementById('authorName');
const bioEl = document.getElementById('authorBio');
const statsEl = document.getElementById('authorStats');
const avatarEl = document.getElementById('authorAvatar');
const followBtn = document.getElementById('followAuthorBtn');
const gridEl = document.getElementById('authorNovels');
const genreFilter = document.getElementById('genreFilter');

let allNovels = [];

if (!authorId) {
    if (nameEl) nameEl.textContent = 'Author not found';
} else {
    init();
}

async function init() {
    await loadProfile();
    await loadNovels();
}

/* ---------- Load profile (works for logged-out viewers) ---------- */

async function loadProfile() {
    // 1) Try the public profiles row
    const { data: profile, error: profileErr } = await supabaseClient
        .from('profiles')
        .select('display_name, bio, avatar_url')
        .eq('id', authorId)
        .maybeSingle();

    if (profileErr) {
        console.warn('[AuthorProfile] profile fetch failed:', profileErr.message);
    }

    // 2) Fallback: read author_name from any of their novels
    let fallbackName = null;
    if (!profile?.display_name) {
        const { data: sampleNovel } = await supabaseClient
            .from('novels')
            .select('author_name')
            .eq('author_id', authorId)
            .not('author_name', 'is', null)
            .limit(1)
            .maybeSingle();
        fallbackName = sampleNovel?.author_name || null;
    }

    const name =
        profile?.display_name ||
        fallbackName ||
        'StoryNest Author';

    document.title = `${name} — StoryNest`;
    if (nameEl) nameEl.textContent = name;

    // Bio
    if (bioEl) {
        bioEl.textContent = profile?.bio || '';
        bioEl.style.display = profile?.bio ? '' : 'none';
    }

    // Avatar (image or fallback initial)
    if (avatarEl) {
        avatarEl.innerHTML = '';
        if (profile?.avatar_url) {
            const img = document.createElement('img');
            img.src = profile.avatar_url;
            img.alt = name;
            img.onerror = () => {
                avatarEl.innerHTML = '';
                avatarEl.textContent = name.charAt(0).toUpperCase();
            };
            avatarEl.appendChild(img);
        } else {
            avatarEl.textContent = name.charAt(0).toUpperCase() || '👤';
        }
    }

    // Stats: followers + novel count
    const { followerCount } = await getFollowState(authorId);
    const { count: novelCount } = await supabaseClient
        .from('novels')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', authorId)
        .eq('status', 'published');

    if (statsEl) {
        statsEl.textContent =
            `${followerCount} follower${followerCount === 1 ? '' : 's'} · ` +
            `${novelCount || 0} novel${novelCount === 1 ? '' : 's'}`;
    }

    // Follow button
    if (followBtn && typeof initFollowButton === 'function') {
        initFollowButton(followBtn, authorId, name);
    }
}

/* ---------- Novels list ---------- */

async function loadNovels() {
    const { data, error } = await supabaseClient
        .from('novels')
        .select('id, title, genre, cover_url, description')
        .eq('author_id', authorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[AuthorProfile] novels fetch failed:', error.message);
        if (gridEl) gridEl.innerHTML = '<p>Could not load novels.</p>';
        return;
    }

    allNovels = data || [];
    buildGenreFilter();
    renderNovels();
}

function buildGenreFilter() {
    if (!genreFilter) return;
    const genres = [...new Set(allNovels.map(n => n.genre).filter(Boolean))].sort();
    genres.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        genreFilter.appendChild(opt);
    });
    genreFilter.addEventListener('change', renderNovels);
}

function renderNovels() {
    if (!gridEl) return;
    const filter = genreFilter?.value || '';
    const list = filter ? allNovels.filter(n => n.genre === filter) : allNovels;

    if (list.length === 0) {
        gridEl.innerHTML = '<p>No published novels yet.</p>';
        return;
    }

    gridEl.innerHTML = '';
    list.forEach(n => {
        const card = document.createElement('article');
        card.className = 'novel-card';
        card.innerHTML = `
            <a href="novel.html?id=${encodeURIComponent(n.id)}">
                <div class="novel-cover">
                    ${n.cover_url
                        ? `<img src="${escapeHTML(n.cover_url)}" alt="${escapeHTML(n.title)}" loading="lazy">`
                        : `<h3>${escapeHTML(n.title)}</h3>`}
                </div>
                <div class="novel-info">
                    <h3>${escapeHTML(n.title)}</h3>
                    ${n.genre ? `<span class="novel-genre">${escapeHTML(n.genre)}</span>` : ''}
                </div>
            </a>
        `;
        gridEl.appendChild(card);
    });
}

/* ---------- Safety ---------- */

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}