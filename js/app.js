/* =====================================================
   STORYNEST — HOME PAGE
   Loads trending + new releases. Search is handled by
   home-search.js (the pill above Trending).
   ===================================================== */

const trendingContainer = document.getElementById("trendingNovels");
const newContainer      = document.getElementById("newNovels");
const exploreBtn        = document.getElementById("exploreBtn");


/* =====================================================
   LOAD PUBLISHED NOVELS
   ===================================================== */

async function loadPublishedNovels() {

    const { data: novels, error } = await supabaseClient
        .from("novels")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Could not load novels:", error);
        showErrorMessage(trendingContainer, "Could not load novels.");
        showErrorMessage(newContainer, "Could not load novels.");
        return;
    }

    if (!novels || novels.length === 0) {
        showEmptyMessage(trendingContainer, "No published novels yet. Check back soon!");
        showEmptyMessage(newContainer, "No new releases yet.");
        return;
    }

    displayTrending(novels.slice(0, 4));
    displayNewReleases(novels.slice(0, 6));
}


/* =====================================================
   TRENDING
   ===================================================== */

function displayTrending(novels) {
    if (!trendingContainer) return;
    trendingContainer.innerHTML = "";

    novels.forEach(novel => {
        const card = document.createElement("article");
        card.className = "novel-card";
        card.innerHTML = `
            <a href="novel.html?id=${encodeURIComponent(novel.id)}">
                <div class="novel-cover">
                    <h3>${escapeHTML(novel.title)}</h3>
                </div>
                <div class="novel-info">
                    <h3>${escapeHTML(novel.title)}</h3>
                    <p class="author">${escapeHTML(novel.author_name || 'Author')}</p>
                    <p class="rating">📚 ${escapeHTML(novel.genre || 'Story')}</p>
                </div>
            </a>
        `;
        trendingContainer.appendChild(card);
    });
}


/* =====================================================
   NEW RELEASES
   ===================================================== */

function displayNewReleases(novels) {
    if (!newContainer) return;
    newContainer.innerHTML = "";

    novels.forEach(novel => {
        const item = document.createElement("article");
        item.className = "new-novel";
        item.innerHTML = `
            <div class="new-cover">${escapeHTML(novel.title)}</div>
            <div class="new-info">
                <h3>${escapeHTML(novel.title)}</h3>
                <p>${escapeHTML(novel.author_name || 'Author')}</p>
                <p>${escapeHTML(novel.genre || 'Story')}</p>
            </div>
            <button class="read-btn" data-novel-id="${novel.id}">View Novel</button>
        `;

        item.querySelector(".read-btn").addEventListener("click", function () {
            window.location.href = `novel.html?id=${encodeURIComponent(novel.id)}`;
        });

        newContainer.appendChild(item);
    });
}


/* =====================================================
   EXPLORE BUTTON
   ===================================================== */

if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
        document.getElementById("trending").scrollIntoView({ behavior: "smooth" });
    });
}


/* =====================================================
   HELPERS
   ===================================================== */

function showErrorMessage(container, message) {
    if (!container) return;
    container.innerHTML = `<p style="color:#e74c3c;">${escapeHTML(message)}</p>`;
}

function showEmptyMessage(container, message) {
    if (!container) return;
    container.innerHTML = `<p style="color:var(--text-secondary);">${escapeHTML(message)}</p>`;
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}


/* =====================================================
   START
   ===================================================== */

loadPublishedNovels();