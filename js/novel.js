/* =====================================================
   STORYNEST — NOVEL DETAILS
   ===================================================== */

const params = new URLSearchParams(window.location.search);
const novelId = params.get('id');

let novel = null;

/* ---------- Elements ---------- */

const novelTitle = document.getElementById('novelTitle');
const coverTitle = document.getElementById('coverTitle');
const novelGenre = document.getElementById('novelGenre');
const novelAuthor = document.getElementById('novelAuthor');
const storyAbout = document.getElementById('storyAbout');
const novelStatus = document.getElementById('novelStatus');
const chapterCount = document.getElementById('chapterCount');
const chapterList = document.getElementById('chapterList');
const characterList = document.getElementById('characterList');
const startReading = document.getElementById('startReading');


/* ---------- Start ---------- */

if (!novelId) {
    showError('No novel was selected.');
} else {
    loadNovel();
}


/* ---------- Load the novel ---------- */

async function loadNovel() {
    let { data, error } = await supabaseClient
        .from('novels')
        .select('*')
        .eq('id', novelId)
        .eq('status', 'published')
        .maybeSingle();

    // If not found, allow the author to preview their own draft
    if (!data) {
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (user) {
            const { data: ownDraft } = await supabaseClient
                .from('novels')
                .select('*')
                .eq('id', novelId)
                .eq('author_id', user.id)
                .maybeSingle();

            if (ownDraft) {
                data = ownDraft;
                error = null;
                showDraftBadge();
            }
        }
    }

    if (error || !data) {
        console.error('Novel error:', error);
        showError('This novel could not be found.');
        return;
    }

    novel = data;
    displayNovel();
    loadChapters();
    loadCharacters();
}


function showDraftBadge() {
    const badge = document.createElement('div');
    badge.textContent = 'Draft preview — not visible to readers';
    badge.style.cssText = `
        background: rgba(231, 173, 79, 0.15);
        color: #e7ad4f;
        border: 1px solid rgba(231, 173, 79, 0.35);
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        margin: 0 auto 20px;
        max-width: 400px;
        text-align: center;
    `;
    const main = document.querySelector('main');
    if (main) main.insertBefore(badge, main.firstChild);
}


/* ---------- Render the novel header ---------- */

function displayNovel() {
    document.title = `${novel.title} — StoryNest`;

    if (novelTitle) novelTitle.textContent = novel.title;
    if (novelGenre) novelGenre.textContent = novel.genre || 'STORY';
    if (storyAbout) storyAbout.textContent = novel.description || 'No description available.';
    if (novelStatus) novelStatus.textContent = novel.status || 'Published';
    if (novelAuthor) novelAuthor.textContent = novel.author_name || 'StoryNest Author';

    renderCover();

    if (typeof initRatingWidget === 'function') {
        initRatingWidget(novelId);
    }

    if (startReading) {
        startReading.addEventListener('click', () => {
            window.location.href =
                `reader.html?id=${encodeURIComponent(novelId)}&chapter=1`;
        });
    }
}


function renderCover() {
    const container = document.getElementById('novelCover');
    if (!container) return;

    if (novel.cover_url) {
        const img = document.createElement('img');
        img.src = novel.cover_url;
        img.alt = novel.title || 'Novel cover';
        img.className = 'large-cover-img';
        img.onerror = () => {
            container.innerHTML = '';
            const wrap = document.createElement('div');
            const icon = document.createElement('span');
            icon.textContent = '📖';
            const h = document.createElement('h1');
            h.textContent = novel.title || 'Novel';
            wrap.append(icon, h);
            container.appendChild(wrap);
        };
        container.innerHTML = '';
        container.appendChild(img);
    } else {
        const coverTitleEl = document.getElementById('coverTitle');
        if (coverTitleEl) coverTitleEl.textContent = novel.title;
    }
}


/* ---------- Chapters ---------- */

async function loadChapters() {
    const { data: chapters, error } = await supabaseClient
        .from('chapters')
        .select('*')
        .eq('novel_id', novelId)
        .order('chapter_number', { ascending: true });

    if (error) {
        console.error('Chapter error:', error);
        if (chapterList) chapterList.innerHTML = '<p>Could not load chapters.</p>';
        return;
    }

    if (chapterCount) chapterCount.textContent = chapters ? chapters.length : 0;

    if (!chapters || chapters.length === 0) {
        if (chapterList) chapterList.innerHTML = '<p>No chapters available yet.</p>';
        return;
    }

    chapterList.innerHTML = '';

    chapters.forEach(chapter => {
        const link = document.createElement('a');
        link.className = 'chapter';
        link.href =
            `reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapter.chapter_number}`;

        link.innerHTML = `
            <div>
                <span>Chapter ${chapter.chapter_number}</span>
                <small>${escapeHTML(chapter.title)}</small>
            </div>
            <span>→</span>
        `;

        chapterList.appendChild(link);
    });
}


/* ---------- Characters ---------- */

async function loadCharacters() {
    const { data: characters, error } = await supabaseClient
        .from('characters')
        .select('*')
        .eq('novel_id', novelId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Character error:', error);
        if (characterList) characterList.innerHTML = '<p>Could not load characters.</p>';
        return;
    }

    if (!characters || characters.length === 0) {
        if (characterList) characterList.innerHTML = '<p>No characters added yet.</p>';
        return;
    }

    characterList.innerHTML = '';

    characters.forEach(character => {
        const card = document.createElement('div');
        card.className = 'character-card';

        card.innerHTML = `
            <p><strong>Name:</strong> ${escapeHTML(character.name)}</p>
            <p><strong>Role:</strong> ${escapeHTML(character.role || 'Character')}</p>
            <p><strong>Description:</strong></p>
            <p class="character-description">
                ${escapeHTML(character.description || 'No description available.')}
            </p>
        `;

        characterList.appendChild(card);
    });
}


/* ---------- Error state ---------- */

function showError(message) {
    if (novelTitle) novelTitle.textContent = 'Novel unavailable';
    if (coverTitle) coverTitle.textContent = 'Unavailable';
    if (novelGenre) novelGenre.textContent = '';
    if (novelAuthor) novelAuthor.textContent = '';
    if (storyAbout) storyAbout.textContent = message;
    if (chapterList) chapterList.innerHTML = '';
    if (characterList) characterList.innerHTML = '';
    if (startReading) startReading.disabled = true;
}


/* ---------- Safety ---------- */

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}