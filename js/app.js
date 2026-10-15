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

    let allNovels = [];
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

        if (allNovels.length === 0) {
            showEmptyMessage(trendingContainer, 'No published novels yet. Check back soon!');
            showEmptyMessage(newContainer, 'No new releases yet.');
            return;
        }

        // ---- Enrich with ratings + readers ----
        const ids = allNovels.map(n => n.id);

        const [ratingsRes, readersRes] = await Promise.all([
            supabaseClient
                .from('novel_ratings_summary')
                .select('*')
                .in('novel_id', ids),
            supabaseClient
                .from('novel_readers_summary')
                .select('*')
                .in('novel_id', ids),
        ]);

        const ratingMap = {};
        (ratingsRes.data || []).forEach(r => { ratingMap[r.novel_id] = r; });

        const readerMap = {};
        (readersRes.data || []).forEach(r => { readerMap[r.novel_id] = r; });

        allNovels.forEach(n => {
            const rating = ratingMap[n.id];
            const readers = readerMap[n.id];

            n.average_rating = rating?.average_rating
                ? parseFloat(rating.average_rating)
                : 0;
            n.rating_count = rating?.rating_count || 0;
            n.reader_count = readers?.reader_count || 0;
        });

        // ---- Trending: stars first, then readers ----
        const trending = [...allNovels].sort((a, b) => {
            if (b.average_rating !== a.average_rating) {
                return b.average_rating - a.average_rating;
            }
            return b.reader_count - a.reader_count;
        });

        displayTrending(trending.slice(0, 4));

        // ---- New Releases: keep respecting the genre filter ----
        renderNewReleases();
    }


    /* =================================================
       TRENDING
    ================================================= */

    function displayTrending(novels) {
        if (!trendingContainer) return;
        trendingContainer.innerHTML = '';

        novels.forEach(novel => {
            const card = document.createElement('article');
            card.className = 'novel-card';

            const cover = novel.cover_url || 'image/default-cover.png';

            const ratingHTML = novel.rating_count > 0
                ? `<p class="novel-rating-compact">
                       <span class="stars">${renderStars(novel.average_rating)}</span>
                       <span>${novel.average_rating.toFixed(1)}</span>
                       <span class="count">(${novel.rating_count})</span>
                   </p>`
                : `<p class="novel-rating-compact"><span class="count">No ratings yet</span></p>`;

            const readersHTML = novel.reader_count > 0
                ? `<p class="readers-count">👥 ${novel.reader_count.toLocaleString()} readers</p>`
                : '';

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
                        ${ratingHTML}
                        ${readersHTML}
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

        let list = allNovels;

        if (activeGenre !== 'all') {
            list = allNovels.filter(
                n => (n.genre || '').trim() === activeGenre
            );
        }

        list = list.slice(0, 6);

        if (list.length === 0) {
            newContainer.innerHTML = `
                <p style="color:var(--text-secondary); padding:24px 0;">
                    No ${escapeHTML(activeGenre)} novels yet.
                </p>
            `;
            return;
        }

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
                genreButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                activeGenre = this.dataset.genre || 'all';
                renderNewReleases();

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

    function renderStars(average, max = 5) {
        const rounded = Math.round(average * 2) / 2;
        let stars = '';
        for (let i = 1; i <= max; i++) {
            stars += (i <= rounded) ? '★' : '☆';
        }
        return stars;
    }


    /* =================================================
       START
    ================================================= */

    wireGenreButtons();
    loadPublishedNovels();

})();