/* =====================================================
   STORYNEST — SCROLLING READER
   ===================================================== */

const params = new URLSearchParams(window.location.search);
const novelId = params.get("id");
let chapterNumber = Number(params.get("chapter")) || 1;

let novel = null;
let chapters = [];


/* =====================================================
   ELEMENTS
   ===================================================== */

const readerNovelTitle = document.getElementById("readerNovelTitle");
const chapterHeader = document.getElementById("chapterHeader");
const readerPageContent = document.getElementById("readerPageContent");
const progressBar = document.getElementById("readingProgress");


/* =====================================================
   UNLOCK PAGE SCROLLING
   ===================================================== */

function unlockScrolling() {
    document.documentElement.classList.add("reader-scroll-fix");
    document.body.classList.add("reader-scroll-fix");

    document.documentElement.style.overflow = "visible";
    document.documentElement.style.overflowX = "hidden";
    document.documentElement.style.overflowY = "auto";

    document.body.style.overflow = "visible";
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";

    document.documentElement.style.transform = "none";
    document.documentElement.style.filter = "none";
    document.documentElement.style.perspective = "none";
    document.body.style.transform = "none";
    document.body.style.filter = "none";
    document.body.style.perspective = "none";

    document.documentElement.style.touchAction = "auto";
    document.body.style.touchAction = "auto";

    if (readerPageContent) {
        readerPageContent.style.overflow = "visible";
        readerPageContent.style.overflowY = "visible";
        readerPageContent.style.touchAction = "auto";
        readerPageContent.style.transform = "none";
        readerPageContent.style.filter = "none";
    }
}

unlockScrolling();


/* =====================================================
   START
   ===================================================== */

if (!novelId) {
    showError("No novel was selected.");
} else {
    loadNovel();
}


/* =====================================================
   LOAD NOVEL
   ===================================================== */

async function loadNovel() {
    try {

        const { data: novelData, error: novelError } =
            await supabaseClient
                .from("novels")
                .select("*")
                .eq("id", novelId)
                .eq("status", "published")
                .single();

        if (novelError || !novelData) {
            console.error("Novel error:", novelError);
            showError("This novel could not be found.");
            return;
        }

        novel = novelData;


        const { data: chapterData, error: chapterError } =
            await supabaseClient
                .from("chapters")
                .select("*")
                .eq("novel_id", novelId)
                .order("chapter_number", { ascending: true });

        if (chapterError) {
            console.error("Chapter error:", chapterError);
            showError("Could not load the chapters.");
            return;
        }

        chapters = chapterData || [];

        if (chapters.length === 0) {
            showError("This novel does not have any chapters yet.");
            return;
        }


        if (chapterNumber < 1 || chapterNumber > chapters.length) {
            chapterNumber = 1;
        }


        readerNovelTitle.textContent = novel.title;

        displayChapter();

    } catch (error) {

        console.error("Load error:", error);
        showError("Something went wrong loading this story.");

    }
}


/* =====================================================
   DISPLAY CHAPTER
   ===================================================== */

function displayChapter() {

    const chapter = chapters[chapterNumber - 1];

    if (!chapter) return;


    chapterHeader.textContent =
        `Chapter ${chapter.chapter_number}`;

    document.title =
        `${chapter.title || "Chapter " + chapter.chapter_number} — ${novel.title}`;


    unlockScrolling();

    renderChapter(chapter);

    // Track impression for revenue attribution
    if (novel && novel.id && novel.author_id && chapter.id) {
        trackChapterImpression(novel.id, chapter.id, novel.author_id);
    }

    updateURL();

    restorePosition();
}


/* =====================================================
   RENDER CHAPTER
   ===================================================== */

function renderChapter(chapter) {

    const content = chapter.content || "";
    const title = chapter.title || "";


    // Split into paragraphs (blank-line separated)
    const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);


    let html =
        `<h1 class="page-chapter-title">${escapeHTML(title)}</h1>`;


    /* =================================================
       MID-CHAPTER AD DECISION (word-count based)
       - < 800 words    → 0 ads
       - 800–2500       → 1 ad at ~50%
       - 2500–5000      → 2 ads at ~33%, ~66%
       - 5000+          → 3 ads at ~25%, ~50%, ~75% (cap)
    ================================================= */

    let adInsertIndexes = [];

    if (paragraphs.length >= 3) {

        const wordCounts = paragraphs.map(p =>
            p.trim().split(/\s+/).filter(Boolean).length
        );
        const totalWords = wordCounts.reduce((a, b) => a + b, 0);

        let targets = [];

	if (totalWords < 400) {
    	    targets = [];
	} else if (totalWords < 1200) {
    	    targets = [0.55];
	} else if (totalWords < 3000) {
    	    targets = [0.35, 0.70];
	} else {
    	    targets = [0.25, 0.50, 0.75];
	}

        targets.forEach(pct => {
            const targetWords = Math.floor(totalWords * pct);
            let running = 0;
            for (let i = 0; i < paragraphs.length; i++) {
                running += wordCounts[i];
                if (running >= targetWords) {
                    // Never first or last paragraph
                    const idx = Math.min(
                        Math.max(i, 1),
                        paragraphs.length - 2
                    );
                    adInsertIndexes.push(idx);
                    break;
                }
            }
        });

        adInsertIndexes = [...new Set(adInsertIndexes)].sort((a, b) => a - b);
    }

    let adInjected = false;


    /* =================================================
       BUILD PARAGRAPHS + INJECT ADS
    ================================================= */

    paragraphs.forEach((p, index) => {

        const formattedParagraph =
            escapeHTML(p).replace(/\n/g, "<br>");

        html += `<p>${formattedParagraph}</p>`;


        if (adInsertIndexes.includes(index)) {

            html += `
                <div class="storynest-in-content-ad">
                    <script type="text/javascript">
                        atOptions = {
                            'key' : '665e254e1c5fe98bcbd641aa25f400df',
                            'format' : 'iframe',
                            'height' : 250,
                            'width' : 300,
                            'params' : {}
                        };
                    <\/script>
                    <script type="text/javascript" src="https://unprofessionalginger.com/665e254e1c5fe98bcbd641aa25f400df/invoke.js"><\/script>
                </div>
            `;

            adInjected = true;
        }

    });


    readerPageContent.innerHTML = html;


    // innerHTML does NOT execute <script> tags — re-create them manually
    if (adInjected) {
        injectAdScripts(readerPageContent);
    }


    readerPageContent.style.overflow = "visible";
    readerPageContent.style.overflowY = "visible";


    // Apply saved font size
    const savedSize = localStorage.getItem("readerFontSize");
    const fontSize = savedSize ? parseInt(savedSize) : 18;
    applyFontSizeToContent(fontSize);
}


/* =====================================================
   INJECT AD SCRIPTS — iframe srcdoc (Adsterra-safe)
   Each slot gets its own isolated iframe so multiple
   instances of the same ad unit can coexist.
   ===================================================== */

function injectAdScripts(container) {

    if (!container) return;
    if (typeof isAdFree === 'function' && isAdFree()) return;

    const adSlots = container.querySelectorAll(".storynest-in-content-ad");

    adSlots.forEach((slot, index) => {

        setTimeout(() => {

            if (typeof isAdFree === 'function' && isAdFree()) {
                slot.style.display = 'none';
                return;
            }

            // Build the isolated HTML for the iframe
            const adHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        html, body {
                            margin: 0;
                            padding: 0;
                            width: 300px;
                            height: 250px;
                            overflow: hidden;
                            background: transparent;
                        }
                    </style>
                </head>
                <body>
                    <script type="text/javascript">
                        atOptions = {
                            'key' : '665e254e1c5fe98bcbd641aa25f400df',
                            'format' : 'iframe',
                            'height' : 250,
                            'width' : 300,
                            'params' : {}
                        };
                    <\/script>
                    <script type="text/javascript"
                            src="https://unprofessionalginger.com/665e254e1c5fe98bcbd641aa25f400df/invoke.js"><\/script>
                </body>
                </html>
            `;

            // Create the iframe
            const iframe = document.createElement('iframe');
            iframe.style.width = '300px';
            iframe.style.height = '250px';
            iframe.style.border = '0';
            iframe.style.display = 'block';
            iframe.setAttribute('scrolling', 'no');
            iframe.setAttribute('frameborder', '0');
            iframe.srcdoc = adHTML;

            // Clear the slot and inject the iframe
            slot.innerHTML = '';
            slot.appendChild(iframe);

        }, index * 300);   // stagger 300ms apart
    });
}


/* =====================================================
   SCROLL PROGRESS
   ===================================================== */

function updateProgress() {

    if (!progressBar) return;

    const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        0;

    const scrollHeight =
        document.documentElement.scrollHeight -
        window.innerHeight;

    const progress =
        scrollHeight > 0
            ? (scrollTop / scrollHeight) * 100
            : 0;

    progressBar.style.width =
        `${Math.min(100, Math.max(0, progress))}%`;

    if (novelId) {
        localStorage.setItem(
            `storynest-scroll-${novelId}-${chapterNumber}`,
            scrollTop
        );
    }
}


window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress, { passive: true });


/* =====================================================
   CHAPTER NAVIGATION
   ===================================================== */

function nextChapter() {
    if (chapterNumber < chapters.length) {
        chapterNumber++;
        displayChapter();
    } else {
        window.location.href =
            `novel.html?id=${encodeURIComponent(novelId)}`;
    }
}

function previousChapter() {
    if (chapterNumber > 1) {
        chapterNumber--;
        displayChapter();
    }
}


/* =====================================================
   KEYBOARD CONTROLS
   ===================================================== */

document.addEventListener("keydown", function (event) {

    if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.isContentEditable
    ) {
        return;
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        nextChapter();
        return;
    }

    if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousChapter();
        return;
    }

    if (
        event.key === "ArrowDown" ||
        event.key === " " ||
        event.key === "PageDown"
    ) {
        event.preventDefault();
        window.scrollBy({
            top: window.innerHeight * 0.85,
            behavior: "smooth"
        });
        return;
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        window.scrollBy({
            top: -window.innerHeight * 0.85,
            behavior: "smooth"
        });
        return;
    }

    if (event.key === "Home") {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    if (event.key === "End") {
        event.preventDefault();
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth"
        });
        return;
    }

});


/* =====================================================
   MOBILE SWIPE (chapter change only)
   ===================================================== */

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

document.addEventListener(
    "touchstart",
    function (event) {
        if (!event.touches.length) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchStartTime = Date.now();
    },
    { passive: true }
);

document.addEventListener(
    "touchend",
    function (event) {
        if (!event.changedTouches.length) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const duration = Date.now() - touchStartTime;

        if (Math.abs(deltaX) < 80) return;
        if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
        if (duration > 600) return;

        if (deltaX < 0) {
            nextChapter();
        } else {
            previousChapter();
        }
    },
    { passive: true }
);


/* =====================================================
   URL
   ===================================================== */

function updateURL() {
    const newURL =
        `reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapterNumber}`;
    window.history.replaceState({}, "", newURL);
}


/* =====================================================
   BROWSER BACK / FORWARD
   ===================================================== */

window.addEventListener("popstate", function () {
    const currentParams = new URLSearchParams(window.location.search);
    const newChapter = Number(currentParams.get("chapter")) || 1;

    if (
        newChapter !== chapterNumber &&
        newChapter >= 1 &&
        newChapter <= chapters.length
    ) {
        chapterNumber = newChapter;
        displayChapter();
    }
});


/* =====================================================
   RESTORE SCROLL POSITION
   ===================================================== */

function restorePosition() {
    const saved = localStorage.getItem(
        `storynest-scroll-${novelId}-${chapterNumber}`
    );

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            unlockScrolling();

            if (saved !== null) {
                const pos = parseInt(saved, 10) || 0;
                window.scrollTo({ top: pos, left: 0, behavior: "instant" });
            } else {
                window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            }

            updateProgress();
        });
    });
}


/* =====================================================
   FONT SIZE
   ===================================================== */

function applyFontSizeToContent(size) {
    if (!readerPageContent) return;

    readerPageContent.style.fontSize = size + "px";

    readerPageContent
        .querySelectorAll("p")
        .forEach(p => {
            p.style.fontSize = size + "px";
        });
}

window.addEventListener("readerFontSizeChanged", function (e) {
    applyFontSizeToContent(e.detail.size);
    setTimeout(updateProgress, 100);
});


/* =====================================================
   ERROR
   ===================================================== */

function showError(message) {

    if (readerNovelTitle) {
        readerNovelTitle.textContent = "StoryNest";
    }

    if (readerPageContent) {
        readerPageContent.innerHTML = `
            <div style="text-align:center; padding:80px 20px;">
                <div style="font-size:4rem; margin-bottom:20px;">📖</div>
                <h3 style="font-size:1.5rem; margin-bottom:12px; color:#222;">
                    Something went wrong
                </h3>
                <p style="color:#888; margin-bottom:16px;">
                    ${escapeHTML(message)}
                </p>
                <a href="index.html" class="primary-btn" style="display:inline-block;">
                    Return Home
                </a>
            </div>
        `;
    }
}


/* =====================================================
   HTML SAFETY
   ===================================================== */

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}


/* =====================================================
   AD-FREE REWARD SYSTEM — localStorage (survives tabs)
   ===================================================== */

const AD_FREE_DURATION_MS = 15 * 60 * 1000;   // 15 minutes
const AD_FREE_KEY = 'storynestAdFreeUntil';

// ⚠️ Replace with your actual Smartlink URL from Adsterra
const SMARTPLINK_URL = 'https://unprofessionalginger.com/kpmqpcbd?key=337164613e9e4f3099a975553e256fa2';

let adFreeInterval = null;

// --- Is ad-free active right now? ---
function isAdFree() {
    const until = parseInt(localStorage.getItem(AD_FREE_KEY) || '0', 10);
    return Date.now() < until;
}

// --- Grant 15 minutes ---
function grantAdFree() {
    const until = Date.now() + AD_FREE_DURATION_MS;
    localStorage.setItem(AD_FREE_KEY, until);
    applyAdFreeState();
}

// --- Clear the reward ---
function clearAdFree() {
    localStorage.removeItem(AD_FREE_KEY);
    applyAdFreeState();
}

// --- Apply visual state (hides ALL ads) ---
function applyAdFreeState() {
    const active = isAdFree();

    document.body.classList.toggle('ad-free-active', active);

    // Hide / show every ad container on the page
    document.querySelectorAll(
        '.storynest-top-ad, .storynest-bottom-ad, .storynest-in-content-ad'
    ).forEach(el => {
        el.style.display = active ? 'none' : '';
    });

    const badge = document.getElementById('adFreeBadge');
    if (badge) {
        badge.style.display = active ? 'inline-flex' : 'none';
        if (active) updateAdFreeBadge();
    }

    const btn = document.getElementById('adFreeBtn');
    if (btn) {
        btn.textContent = active
            ? '⏱ Ad-Free Active'
            : '🎁 Get Ad-Free (15 min)';
    }

    if (active && !adFreeInterval) {
        adFreeInterval = setInterval(updateAdFreeBadge, 1000);
    } else if (!active && adFreeInterval) {
        clearInterval(adFreeInterval);
        adFreeInterval = null;
    }
}

// --- Update countdown text ---
function updateAdFreeBadge() {
    const badge = document.getElementById('adFreeBadge');
    if (!badge) return;

    const until = parseInt(localStorage.getItem(AD_FREE_KEY) || '0', 10);
    const remaining = until - Date.now();

    if (remaining <= 0) {
        clearAdFree();
        return;
    }

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    badge.textContent = `Ad-Free ${mins}:${secs.toString().padStart(2, '0')}`;
}

// --- User clicked "Get Ad-Free" ---
function unlockAdFree() {
    if (isAdFree()) {
        alert('You already have ad-free time active! Enjoy 🎉');
        return;
    }

    const win = window.open(SMARTPLINK_URL, '_blank');

    if (!win) {
        alert('Please allow pop-ups for this site to unlock ad-free reading.');
        return;
    }

    let rewarded = false;

    const triggerReward = () => {
        if (rewarded) return;
        rewarded = true;
        clearInterval(check);
        clearTimeout(safetyNet);
        grantAdFree();
        alert('🎉 Ad-free unlocked for 15 minutes!');
    };

    const check = setInterval(() => {
        if (win.closed) triggerReward();
    }, 800);

    const safetyNet = setTimeout(triggerReward, 45000);
}

// --- Auto-expire check every 30s ---
setInterval(() => {
    if (!isAdFree() && localStorage.getItem(AD_FREE_KEY)) {
        clearAdFree();
    }
}, 30000);

// --- Run on page load ---
document.addEventListener('DOMContentLoaded', applyAdFreeState);
window.addEventListener('focus', applyAdFreeState);


/* =====================================================
   TRACK IMPRESSION FOR REVENUE ATTRIBUTION
   ===================================================== */

async function trackChapterImpression(novelId, chapterId, authorId) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        await supabaseClient
            .from('novel_impressions')
            .insert({
                novel_id: novelId,
                author_id: authorId,
                chapter_id: chapterId || null,
                page: 'reader',
                user_id: session?.user?.id || null
            });
    } catch (err) {
        console.warn('Impression tracking failed:', err);
    }
}