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

async function loadProfile() {
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('display_name, bio')
        .eq('id', authorId)
        .maybeSingle();

    const name = profile?.display_name || 'StoryNest Author';
    document.title = `${name} — StoryNest`;
    nameEl.textContent = name;
    bioEl.textContent = profile?.bio || '';
    if (profile?.bio) bioEl.style.display = '';
    else bioEl.style.display = 'none';

    avatarEl.textContent = name.charAt(0).toUpperCase() || '👤';

    const { followerCount } = await getFollowState(authorId);
    const { count: novelCount } = await supabaseClient
        .from('novels')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', authorId)
        .eq('status', 'published');

    statsEl.textContent =
        `${followerCount} follower${followerCount === 1 ? '' : 's'} · ` +
        `${novelCount || 0} novel${novelCount === 1 ? '' : 's'}`;

    if (followBtn) {
        initFollowButton(followBtn, authorId, name);
    }
}

async function loadNovels() {
    const { data, error } = await supabaseClient
        .from('novels')
        .select('id, title, genre, cover_url, description')
        .eq('author_id', authorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) {
        gridEl.innerHTML = '<p>Could not load novels.</p>';
        return;
    }

    allNovels = data || [];
    buildGenreFilter();
    renderNovels();
}

function buildGenreFilter() {
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
    const filter = genreFilter.value;
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

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}