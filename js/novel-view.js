/* =====================================================
   STORYNEST — ALL PUBLISHED NOVELS
   ===================================================== */


const novelsContainer = document.getElementById("allNovels");
const novelCount = document.getElementById("novelCount");
const emptyState = document.getElementById("emptyState");

const genreButtons =
    document.querySelectorAll(".genre-btn");
const searchBtn =
    document.getElementById("searchBtn");

const searchPanel =
    document.getElementById("searchPanel");

const searchInput =
    document.getElementById("searchInput");


let allNovels = [];


// =====================================================
// START
// =====================================================

loadNovels();


// =====================================================
// LOAD ALL PUBLISHED NOVELS
// =====================================================

async function loadNovels() {
    if (!novelsContainer) return;

    novelsContainer.innerHTML = `
        <div class="loading-message">Loading published novels...</div>
    `;

    try {
        const { data: novelData, error: novelError } = await supabaseClient
            .from('novels')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (novelError) {
            console.error('StoryNest Novel Error:', novelError);
            novelsContainer.innerHTML = `
                <div class="loading-message">
                    <p>Unable to load novels.</p>
                    <small>${escapeHTML(novelError.message || 'Unknown Supabase error')}</small>
                </div>
            `;
            if (novelCount) novelCount.textContent = 'Unable to load novels';
            return;
        }

        allNovels = novelData || [];

        // ---- Enrich with ratings + readers ----
        if (allNovels.length > 0) {
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

            // ---- Sort: rating desc, then readers desc ----
            allNovels.sort((a, b) => {
                if (b.average_rating !== a.average_rating) {
                    return b.average_rating - a.average_rating;
                }
                return b.reader_count - a.reader_count;
            });
        }

        displayNovels(allNovels);

    } catch (error) {
        console.error('StoryNest: Unexpected error:', error);
        novelsContainer.innerHTML = `
            <div class="loading-message">
                <p>Something went wrong.</p>
                <small>${escapeHTML(error.message || 'Unknown error')}</small>
            </div>
        `;
        if (novelCount) novelCount.textContent = 'Unable to load novels';
    }
}


// =====================================================
// DISPLAY NOVELS
// =====================================================

function displayNovels(novels) {

    novelsContainer.innerHTML = "";

    if (novelCount) {
        novelCount.textContent =
            `${novels.length} ${
                novels.length === 1 ? "novel" : "novels"
            } available`;
    }

    // =================================================
    // NO NOVELS
    // =================================================

    if (novels.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    // =================================================
    // CREATE NOVEL CARDS
    // =================================================

    novels.forEach(novel => {

        const card = document.createElement("a");
        card.className = "novel-card";
        card.href = `novel.html?id=${encodeURIComponent(novel.id)}`;

        const cover = novel.cover_url || "image/default-cover.png";

        card.innerHTML = `
            <div class="novel-cover">
                <img
                    src="${escapeHTML(cover)}"
                    alt="${escapeHTML(novel.title || "StoryNest Novel")}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='image/default-cover.png';"
                >
            </div>

            <div class="novel-info">
                <h3>${escapeHTML(novel.title || "Untitled Novel")}</h3>
                <p class="novel-author">
                    ${escapeHTML(novel.author_name || "StoryNest Author")}
                </p>
                <span class="novel-genre">
                    ${escapeHTML(novel.genre || "General")}

                    ${novel.rating_count > 0
                        ? `<p class="novel-rating-compact">
                                <span class="stars">${renderStars(novel.average_rating)}</span>
                                <span>${novel.average_rating.toFixed(1)}</span>
                               <span class="count">(${novel.rating_count})</span>
                           </p>`
                        : `<p class="novel-rating-compact"><span class="count">No ratings yet</span></p>`}
                                   </span>
                               </div>
                            `;

        novelsContainer.appendChild(card);
    });
}

// =====================================================
// GENRE FILTER
// =====================================================

genreButtons.forEach(button => {

    button.addEventListener(
        "click",
        function () {

            // Remove active from all buttons

            genreButtons.forEach(btn => {

                btn.classList.remove("active");

            });


            // Activate selected button

            this.classList.add("active");


            const selectedGenre =
                this.dataset.genre;


            // ALL

            if (selectedGenre === "all") {

                displayNovels(allNovels);

                return;
            }


            // FILTER

            const filteredNovels =
                allNovels.filter(novel => {

                    return (
                        novel.genre ===
                        selectedGenre
                    );

                });


            displayNovels(filteredNovels);

        }
    );

});


// =====================================================
// SEARCH BUTTON
// =====================================================

if (searchBtn && searchPanel) {

    searchBtn.addEventListener(
        "click",
        function () {

            searchPanel.classList.toggle(
                "active"
            );


            if (
                searchPanel.classList.contains(
                    "active"
                )
            ) {

                if (searchInput) {
                    searchInput.focus();
                }

            }

        }
    );

}


// =====================================================
// SEARCH
// =====================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            const searchTerm =
                this.value
                    .toLowerCase()
                    .trim();


            // Empty search

            if (!searchTerm) {

                displayNovels(allNovels);

                return;
            }


            // Search title, genre and description

            const results =
                allNovels.filter(novel => {

                    const title =
                        (
                            novel.title ||
                            ""
                        ).toLowerCase();


                    const genre =
                        (
                            novel.genre ||
                            ""
                        ).toLowerCase();


                    const description =
                        (
                            novel.description ||
                            ""
                        ).toLowerCase();


                    return (

                        title.includes(
                            searchTerm
                        )

                        ||

                        genre.includes(
                            searchTerm
                        )

                        ||

                        description.includes(
                            searchTerm
                        )

                    );

                });


            displayNovels(results);

        }
    );

}


// =====================================================
// HTML SAFETY
// =====================================================

function escapeHTML(value) {

    const div =
        document.createElement("div");


    div.textContent =
        value ?? "";


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