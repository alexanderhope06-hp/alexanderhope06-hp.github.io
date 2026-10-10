/* =====================================================
   STORYNEST — HOME PAGE
   Loads Trending + New Releases, and filters
   New Releases by genre.
   ===================================================== */

(function () {
    'use strict';

    const trendingContainer = document.getElementById('trendingNovels');
    const newContainer      = document.getElementById('newNovels');
    const exploreBtn        = document.getElementById('exploreBtn');
    const genreButtons      = document.querySelectorAll('.genre-btn');

    // Full list of published novels (kept in memory)
    let allNovels = [];

    // Current genre filter ('all' or a genre name)
    let activeGenre = 'all';


    /* =================================================
       LOAD PUBLISHED NOVELS
    ================================================= */

async function loadPublishedNovels() {
    const { data: novels, error } = await supabaseClient
        .from('novels')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Could not load novels:', error);
        showErrorMessage(trendingContainer, 'Could not load novels.');
        showErrorMessage(newContainer, 'Could not load novels.');
        return;
    }

    allNovels = novels || [];

    // Fetch rating summaries for the loaded novels
    if (allNovels.length > 0) {
        const ids = allNovels.map(n => n.id);
        const { data: summaries } = await supabaseClient
            .from('novel_ratings_summary')
            .select('*')
            .in('novel_id', ids);

        const map = {};
        (summaries || []).forEach(s => { map[s.novel_id] = s; });

        allNovels.forEach(n => {
            const s = map[n.id];
            n.average_rating = s?.average_rating ? parseFloat(s.average_rating) : 0;
            n.rating_count = s?.rating_count || 0;
        });
    }

    if (allNovels.length === 0) {
        showEmptyMessage(trendingContainer, 'No published novels yet. Check back soon!');
        showEmptyMessage(newContainer, 'No new releases yet.');
        return;
    }

    displayTrending(allNovels.slice(0, 4));
    renderNewReleases();
}


    /* =================================================
       TRENDING
       (unchanged, always top 4)
    ================================================= */

    function displayTrending(novels) {
        if (!trendingContainer) return;
        trendingContainer.innerHTML = '';

        novels.forEach(novel => {
            const card = document.createElement('article');
            card.className = 'novel-card';

            const cover = novel.cover_url || 'image/default-cover.png';

            card.innerHTML = `
                <a href="novel.html?id=${encodeURIComponent(novel.id)}">
                    <div class="novel-cover">
                        <img
                            src="${escapeHTML(cover)}"
                            alt="${escapeHTML(novel.title)}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='image/default-cover.png';"
                        >
                    </div>
                    <div class="novel-info">
                        <h3>${escapeHTML(novel.title)}</h3>
                        <p class="author">${escapeHTML(novel.author_name || 'Author')}</p>
<p class="novel-rating-compact">
    ${novel.rating_count > 0
        ? `<span class="stars">${renderStars(novel.average_rating)}</span>
           <span>${novel.average_rating.toFixed(1)}</span>
           <span class="count">(${novel.rating_count})</span>`
        : '<span class="count">No ratings yet</span>'}
</p>
                    </div>
                </a>
            `;
            trendingContainer.appendChild(card);
        });
    }


    /* =================================================
       NEW RELEASES — respects the active genre filter
    ================================================= */

    function renderNewReleases() {
        if (!newContainer) return;

        // 1. Filter by genre if needed
        let list = allNovels;

        if (activeGenre !== 'all') {
            list = allNovels.filter(
                n => (n.genre || '').trim() === activeGenre
            );
        }

        // 2. Cap at 6
        list = list.slice(0, 6);

        // 3. Empty state
        if (list.length === 0) {
            newContainer.innerHTML = `
                <p style="color:var(--text-secondary); padding:24px 0;">
                    No ${escapeHTML(activeGenre)} novels yet.
                </p>
            `;
            return;
        }

        // 4. Render
        newContainer.innerHTML = '';

        list.forEach(novel => {
            const item = document.createElement('article');
            item.className = 'new-novel';

            const cover = novel.cover_url || 'image/default-cover.png';

            item.innerHTML = `
                <div class="new-cover">
                    <img
                        src="${escapeHTML(cover)}"
                        alt="${escapeHTML(novel.title)}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='image/default-cover.png';"
                    >
                </div>
                <div class="new-info">
                    <h3>${escapeHTML(novel.title)}</h3>
                    <p>${escapeHTML(novel.author_name || 'Author')}</p>
                    <p>${escapeHTML(novel.genre || 'Story')}</p>
                </div>
                <button class="read-btn" data-novel-id="${novel.id}">View Novel</button>
            `;

            item.querySelector('.read-btn').addEventListener('click', function () {
                window.location.href =
                    `novel.html?id=${encodeURIComponent(novel.id)}`;
            });

            newContainer.appendChild(item);
        });
    }


    /* =================================================
       GENRE BUTTONS — filter New Releases only
    ================================================= */

    function wireGenreButtons() {
        if (!genreButtons.length) return;

        genreButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                // Update active state
                genreButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Update filter and re-render New Releases
                activeGenre = this.dataset.genre || 'all';
                renderNewReleases();

                // Optional: smooth-scroll down so the user sees the change
                const newSection = document.getElementById('new');
                if (newSection) {
                    newSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }


    /* =================================================
       EXPLORE BUTTON
    ================================================= */

    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            document.getElementById('trending')
                .scrollIntoView({ behavior: 'smooth' });
        });
    }


    /* =================================================
       HELPERS
    ================================================= */

    function showErrorMessage(container, message) {
        if (!container) return;
        container.innerHTML =
            `<p style="color:#e74c3c;">${escapeHTML(message)}</p>`;
    }

    function showEmptyMessage(container, message) {
        if (!container) return;
        container.innerHTML =
            `<p style="color:var(--text-secondary);">${escapeHTML(message)}</p>`;
    }

    function escapeHTML(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }


    /* =================================================
       START
    ================================================= */

    wireGenreButtons();
    loadPublishedNovels();

})();

function renderStars(average, max = 5) {
    const rounded = Math.round(average * 2) / 2;
    let stars = '';
    for (let i = 1; i <= max; i++) stars += (i <= rounded) ? '★' : '☆';
    return stars;
}