/* =====================================================
   STORYNEST — HOME SEARCH (inline, no redirect)
   Loads published novels once, filters them live,
   renders results into #homeSearchResults.
   ===================================================== */

(function () {
    'use strict';

    const form     = document.getElementById('homeSearchForm');
    const input    = document.getElementById('homeSearchInput');
    const mic      = document.getElementById('homeSearchMic');
    const clearBtn = document.getElementById('homeSearchClear');
    const hint     = document.getElementById('homeSearchHint');

    const resultsSection = document.getElementById('homeSearchResults');
    const resultsHeading = document.getElementById('homeSearchResultsHeading');
    const resultsGrid    = document.getElementById('homeSearchResultsGrid');
    const emptyState     = document.getElementById('homeSearchEmptyState');
    const clearAllBtn    = document.getElementById('homeSearchClearAll');

    if (!form || !input || !resultsSection) return;

    let novels = [];
    let debounceTimer = null;
    const DEBOUNCE_MS = 180;


    /* ---------- LOAD NOVELS ONCE ---------- */

    (async function loadNovels() {
        try {
            const { data, error } = await supabaseClient
                .from('novels')
                .select('*')
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (error) throw error;
            novels = data || [];
            console.log('StoryNest: home search loaded', novels.length, 'novels');
        } catch (err) {
            console.error('StoryNest: home search load failed', err);
            novels = [];
        }
    })();


    /* ---------- SEARCH ---------- */

    function runSearch(term) {
        term = (term || '').trim().toLowerCase();

        if (!term) {
            hideResults();
            updateURL('');
            return;
        }

        const matches = novels.filter(n => {
            const title       = (n.title || '').toLowerCase();
            const genre       = (n.genre || '').toLowerCase();
            const description = (n.description || '').toLowerCase();
            const author      = (n.author_name || '').toLowerCase();
            return (
                title.includes(term) ||
                genre.includes(term) ||
                description.includes(term) ||
                author.includes(term)
            );
        });

        showResults(term, matches);
        updateURL(term);
    }

    function showResults(term, matches) {
        resultsSection.hidden = false;

        resultsHeading.textContent =
            `${matches.length} ${matches.length === 1 ? 'result' : 'results'} for "${term}"`;

        resultsGrid.innerHTML = '';

        if (matches.length === 0) {
            emptyState.hidden = false;
            return;
        }

        emptyState.hidden = true;

        matches.forEach(novel => {
            const card = document.createElement('a');
            card.className = 'novel-card';
            card.href = `novel.html?id=${encodeURIComponent(novel.id)}`;

            const cover = novel.cover_url || 'image/fav.png';

            card.innerHTML = `
                <div class="novel-cover">
                    <img src="${escapeHTML(cover)}"
                         alt="${escapeHTML(novel.title || 'Novel')}"
                         loading="lazy">
                </div>
                <div class="novel-info">
                    <h3>${escapeHTML(novel.title || 'Untitled Novel')}</h3>
                    <p class="novel-author">${escapeHTML(novel.author_name || 'StoryNest Author')}</p>
                    <span class="novel-genre">${escapeHTML(novel.genre || 'General')}</span>
                </div>
            `;
            resultsGrid.appendChild(card);
        });

        if (!resultsSection.dataset.shown) {
            resultsSection.dataset.shown = '1';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function hideResults() {
        resultsSection.hidden = true;
        delete resultsSection.dataset.shown;
        resultsGrid.innerHTML = '';
        emptyState.hidden = true;
    }


    /* ---------- URL SYNC ---------- */

    function updateURL(term) {
        const params = new URLSearchParams(window.location.search);
        if (term) params.set('search', term);
        else params.delete('search');

        const q = params.toString();
        const url = window.location.pathname + (q ? `?${q}` : '');
        window.history.replaceState({}, '', url);
    }


    /* ---------- EVENTS ---------- */

    input.addEventListener('input', function () {
        clearBtn.hidden = !this.value.trim();

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => runSearch(input.value), DEBOUNCE_MS);
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        runSearch(input.value);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            input.value = '';
            clearBtn.hidden = true;
            runSearch('');
            input.focus();
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function () {
            input.value = '';
            if (clearBtn) clearBtn.hidden = true;
            runSearch('');
            input.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    input.addEventListener('focus', () => hint && hint.classList.add('hidden'));
    input.addEventListener('blur', () => {
        if (hint && !input.value.trim()) hint.classList.remove('hidden');
    });


    /* ---------- PREFILL FROM URL ---------- */

    const params = new URLSearchParams(window.location.search);
    const initial = params.get('search');
    if (initial) {
        input.value = initial;
        if (clearBtn) clearBtn.hidden = false;
        const wait = setInterval(() => {
            if (novels.length > 0) {
                clearInterval(wait);
                runSearch(initial);
            }
        }, 100);
        setTimeout(() => clearInterval(wait), 3000);
    }


    /* ---------- VOICE SEARCH ---------- */

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || !mic) {
        if (mic) mic.style.display = 'none';
    } else {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        let listening = false;

        mic.addEventListener('click', function () {
            if (listening) { recognition.stop(); return; }
            try { recognition.start(); }
            catch (err) { console.warn('Speech start failed:', err); }
        });

        recognition.addEventListener('start', function () {
            listening = true;
            mic.classList.add('listening');
            input.placeholder = 'Listening...';
        });

        recognition.addEventListener('end', function () {
            listening = false;
            mic.classList.remove('listening');
            input.placeholder = 'Search stories, authors, genres...';
        });

        recognition.addEventListener('result', function (event) {
            const transcript = event.results[0][0].transcript.trim();
            input.value = transcript;
            if (clearBtn) clearBtn.hidden = false;
            input.focus();
            setTimeout(() => runSearch(transcript), 500);
        });

        recognition.addEventListener('error', function (event) {
            console.warn('Speech recognition error:', event.error);
        });
    }


    /* ---------- HELPERS ---------- */

    function escapeHTML(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }
})();