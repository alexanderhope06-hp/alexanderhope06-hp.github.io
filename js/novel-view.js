/* =====================================================
   STORYNEST — ALL PUBLISHED NOVELS
   Single source of truth: search + genre filtering
   Filtering happens in place on #allNovels.
   ===================================================== */


const novelsContainer = document.getElementById("allNovels");
const novelCount      = document.getElementById("novelCount");
const emptyState      = document.getElementById("emptyState");

const genreButtons = document.querySelectorAll(".novel-filters .genre-btn");
const pageHeading  = document.querySelector(".novels-page .section-heading h1");

// Library search pill
const libForm  = document.getElementById("librarySearchForm");
const libInput = document.getElementById("librarySearchInput");
const libMic   = document.getElementById("librarySearchMic");
const libClear = document.getElementById("librarySearchClear");


let allNovels = [];


/* =====================================================
   FILTER STATE
   ===================================================== */

const urlParams = new URLSearchParams(window.location.search);

let currentSearch = (urlParams.get("search") || "").trim();
let currentGenre  = "all";


/* =====================================================
   START
   ===================================================== */

loadNovels();


/* =====================================================
   LOAD NOVELS
   ===================================================== */

async function loadNovels() {

    console.log("StoryNest: Loading published novels...");

    if (!novelsContainer) {
        console.error("StoryNest: #allNovels was not found.");
        return;
    }

    novelsContainer.innerHTML = `
        <div class="loading-message">Loading published novels...</div>
    `;

    try {
        const { data, error } = await supabaseClient
            .from("novels")
            .select("*")
            .eq("status", "published")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("StoryNest Novel Error:", error);
            novelsContainer.innerHTML = `
                <div class="loading-message">
                    <p>Unable to load novels.</p>
                    <small>${escapeHTML(error.message || "Unknown error")}</small>
                </div>
            `;
            if (novelCount) novelCount.textContent = "Unable to load novels";
            return;
        }

        allNovels = data || [];
        console.log("StoryNest: Published novels:", allNovels);

        // Prefill pill input from URL
        if (currentSearch && libInput) {
            libInput.value = currentSearch;
            if (libClear) libClear.hidden = false;
        }

        applyFilters();

    } catch (err) {
        console.error("StoryNest: Unexpected error:", err);
        novelsContainer.innerHTML = `
            <div class="loading-message">
                <p>Something went wrong.</p>
                <small>${escapeHTML(err.message || "Unknown error")}</small>
            </div>
        `;
        if (novelCount) novelCount.textContent = "Unable to load novels";
    }
}


/* =====================================================
   APPLY FILTERS
   ===================================================== */

function applyFilters() {
    let results = allNovels.slice();

    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        results = results.filter(novel => {
            const title       = (novel.title || "").toLowerCase();
            const genre       = (novel.genre || "").toLowerCase();
            const description = (novel.description || "").toLowerCase();
            const author      = (novel.author_name || "").toLowerCase();
            return (
                title.includes(q) ||
                genre.includes(q) ||
                description.includes(q) ||
                author.includes(q)
            );
        });
    }

    if (currentGenre !== "all") {
        results = results.filter(novel =>
            (novel.genre || "").toLowerCase() === currentGenre.toLowerCase()
        );
    }

    updateHeading();
    displayNovels(results);
}


/* =====================================================
   HEADING
   ===================================================== */

function updateHeading() {
    if (!pageHeading) return;

    if (currentSearch) {
        pageHeading.textContent = `Results for "${currentSearch}"`;
        return;
    }

    if (currentGenre !== "all") {
        pageHeading.textContent = `${currentGenre} Novels`;
        return;
    }

    pageHeading.textContent = "All Novels";
}


/* =====================================================
   RENDER
   ===================================================== */

function displayNovels(novels) {
    novelsContainer.innerHTML = "";

    if (novelCount) {
        const isFiltered = currentSearch || currentGenre !== "all";
        novelCount.textContent =
            `${novels.length} ${novels.length === 1 ? "novel" : "novels"} ` +
            `${isFiltered ? "found" : "available"}`;
    }

    if (novels.length === 0) {
        if (emptyState) {
            emptyState.style.display = "block";

            const h = emptyState.querySelector("h2");
            const p = emptyState.querySelector("p");

            if (currentSearch) {
                if (h) h.textContent = `No results for "${currentSearch}"`;
                if (p) p.textContent = "Try a different search term or browse all novels.";
            } else if (currentGenre !== "all") {
                if (h) h.textContent = `No ${currentGenre} novels yet`;
                if (p) p.textContent = "Try another genre or browse all novels.";
            } else {
                if (h) h.textContent = "No novels found";
                if (p) p.textContent = "There are no published novels yet. Check back soon.";
            }
        }
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    novels.forEach(novel => {
        const card = document.createElement("a");
        card.className = "novel-card";
        card.href = `novel.html?id=${encodeURIComponent(novel.id)}`;

        const cover = novel.cover_url || "image/fav.png";

        card.innerHTML = `
            <div class="novel-cover">
                <img src="${escapeHTML(cover)}"
                     alt="${escapeHTML(novel.title || "Novel")}"
                     loading="lazy">
            </div>
            <div class="novel-info">
                <h3>${escapeHTML(novel.title || "Untitled Novel")}</h3>
                <p class="novel-author">${escapeHTML(novel.author_name || "StoryNest Author")}</p>
                <span class="novel-genre">${escapeHTML(novel.genre || "General")}</span>
            </div>
        `;
        novelsContainer.appendChild(card);
    });
}


/* =====================================================
   GENRE BUTTONS
   ===================================================== */

genreButtons.forEach(button => {
    button.addEventListener("click", function () {
        genreButtons.forEach(b => b.classList.remove("active"));
        this.classList.add("active");

        currentGenre = this.dataset.genre || "all";
        updateURL();
        applyFilters();
    });
});


/* =====================================================
   PILL SEARCH INPUT
   ===================================================== */

if (libForm && libInput) {

    let debounceTimer;
    libInput.addEventListener("input", function () {
        const val = this.value;

        if (libClear) libClear.hidden = !val.trim();

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearch = val.trim();
            updateURL();
            applyFilters();
        }, 180);
    });

    libForm.addEventListener("submit", function (e) {
        e.preventDefault();
        currentSearch = libInput.value.trim();
        updateURL();
        applyFilters();
    });
}

if (libClear) {
    libClear.addEventListener("click", function () {
        libInput.value = "";
        libClear.hidden = true;
        currentSearch = "";
        updateURL();
        applyFilters();
        libInput.focus();
    });
}


/* =====================================================
   VOICE SEARCH
   ===================================================== */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SR && libMic && libInput) {
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    let listening = false;

    libMic.addEventListener("click", function () {
        if (listening) { rec.stop(); return; }
        try { rec.start(); } catch (e) {}
    });

    rec.addEventListener("start", () => {
        listening = true;
        libMic.classList.add("listening");
        libInput.placeholder = "Listening...";
    });

    rec.addEventListener("end", () => {
        listening = false;
        libMic.classList.remove("listening");
        libInput.placeholder = "Search stories, authors, genres...";
    });

    rec.addEventListener("result", function (event) {
        const transcript = event.results[0][0].transcript.trim();
        libInput.value = transcript;
        if (libClear) libClear.hidden = false;
        currentSearch = transcript;
        updateURL();
        applyFilters();
    });

    rec.addEventListener("error", function (e) {
        console.warn("Speech error:", e.error);
    });
} else if (libMic) {
    libMic.style.display = "none";
}


/* =====================================================
   URL SYNC
   ===================================================== */

function updateURL() {
    const params = new URLSearchParams(window.location.search);

    if (currentSearch) params.set("search", currentSearch);
    else params.delete("search");

    const q = params.toString();
    const url = window.location.pathname + (q ? `?${q}` : "");
    window.history.replaceState({}, "", url);
}


/* =====================================================
   HELPERS
   ===================================================== */

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}