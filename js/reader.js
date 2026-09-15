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
       MID-CHAPTER AD DECISION (character-based)

       Rules:
         - Skip ad if chapter is shorter than MIN_CHARS_FOR_AD
         - Otherwise inject ONE ad after the paragraph that
           crosses the 50% character mark
    ================================================= */

    const MIN_CHARS_FOR_AD = 2000;

    // Total characters in the chapter (excluding title)
    const totalChars = paragraphs.reduce(
        (sum, p) => sum + p.length,
        0
    );

    // Decide whether to inject at all
    const shouldInjectAd =
        paragraphs.length >= 3 &&
        totalChars >= MIN_CHARS_FOR_AD;

    // Find the paragraph index to insert after
    let insertAfterIndex = -1;

    if (shouldInjectAd) {

        const halfway = totalChars / 2;
        let running = 0;

        for (let i = 0; i < paragraphs.length; i++) {

            running += paragraphs[i].length;

            if (running >= halfway) {
                insertAfterIndex = i;
                break;
            }
        }

        // Safety: never insert before paragraph 1 or
        // after the last paragraph
        if (insertAfterIndex < 1) {
            insertAfterIndex = 1;
        }

        if (insertAfterIndex >= paragraphs.length - 1) {
            insertAfterIndex = paragraphs.length - 2;
        }
    }

    let adInjected = false;


    /* =================================================
       BUILD PARAGRAPHS + INJECT AD
    ================================================= */

    paragraphs.forEach((p, index) => {

        const formattedParagraph =
            escapeHTML(p).replace(/\n/g, "<br>");

        html += `<p>${formattedParagraph}</p>`;


        if (
            shouldInjectAd &&
            !adInjected &&
            index === insertAfterIndex
        ) {

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
    const savedSize =
        localStorage.getItem("readerFontSize");

    const fontSize =
        savedSize ? parseInt(savedSize) : 18;

    applyFontSizeToContent(fontSize);
}


/* =====================================================
   INJECT AD SCRIPTS (needed because innerHTML
   does not execute <script> tags)
   ===================================================== */

function injectAdScripts(container) {

    if (!container) return;

	if (typeof isAdFree === 'function' && isAdFree()) return;

    container
        .querySelectorAll(".storynest-in-content-ad script")
        .forEach(oldScript => {

            const newScript =
                document.createElement("script");

            if (oldScript.src) {
                newScript.src = oldScript.src;
                newScript.async = true;
            } else {
                newScript.textContent = oldScript.textContent;
            }

            oldScript.parentNode.replaceChild(newScript, oldScript);
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


window.addEventListener(
    "scroll",
    updateProgress,
    { passive: true }
);

window.addEventListener(
    "resize",
    updateProgress,
    { passive: true }
);


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


    if (
        event.key === "ArrowUp" ||
        event.key === "PageUp"
    ) {

        event.preventDefault();

        window.scrollBy({
            top: -window.innerHeight * 0.85,
            behavior: "smooth"
        });

        return;
    }


    if (event.key === "Home") {

        event.preventDefault();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

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

        if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) {
            return;
        }

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

window.addEventListener(
    "popstate",
    function () {

        const currentParams =
            new URLSearchParams(window.location.search);

        const newChapter =
            Number(currentParams.get("chapter")) || 1;


        if (
            newChapter !== chapterNumber &&
            newChapter >= 1 &&
            newChapter <= chapters.length
        ) {

            chapterNumber = newChapter;

            displayChapter();

        }

    }
);


/* =====================================================
   RESTORE SCROLL POSITION
   ===================================================== */

function restorePosition() {

    const saved =
        localStorage.getItem(
            `storynest-scroll-${novelId}-${chapterNumber}`
        );


    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            unlockScrolling();


            if (saved !== null) {

                const pos =
                    parseInt(saved, 10) || 0;

                window.scrollTo({
                    top: pos,
                    left: 0,
                    behavior: "instant"
                });

            } else {

                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: "instant"
                });

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


/* =====================================================
   FONT SIZE EVENT
   ===================================================== */

window.addEventListener(
    "readerFontSizeChanged",
    function (e) {

        applyFontSizeToContent(e.detail.size);

        setTimeout(updateProgress, 100);

    }
);


/* =====================================================
   ERROR
   ===================================================== */

function showError(message) {

    if (readerNovelTitle) {
        readerNovelTitle.textContent = "StoryNest";
    }


    if (readerPageContent) {

        readerPageContent.innerHTML = `

            <div style="
                text-align:center;
                padding:80px 20px;
            ">

                <div style="
                    font-size:4rem;
                    margin-bottom:20px;
                ">
                    📖
                </div>

                <h3 style="
                    font-size:1.5rem;
                    margin-bottom:12px;
                    color:#222;
                ">
                    Something went wrong
                </h3>

                <p style="
                    color:#888;
                    margin-bottom:16px;
                ">
                    ${escapeHTML(message)}
                </p>

                <a
                    href="index.html"
                    class="primary-btn"
                    style="display:inline-block;"
                >
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