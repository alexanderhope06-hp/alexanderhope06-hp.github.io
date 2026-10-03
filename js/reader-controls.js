/* =====================================================
   STORYNEST — READER CONTROLS
   Menu, font size, theme, scrolling, ad-free countdown.
   ===================================================== */

(function () {
    'use strict';

    /* =================================================
       READER MENU
    ================================================= */

    window.toggleReaderMenu = function (event) {
        if (event) event.stopPropagation();
        const dropdown = document.getElementById('readerDropdown');
        if (dropdown) dropdown.classList.toggle('active');
    };

    document.addEventListener('click', function (e) {
        const dropdown = document.getElementById('readerDropdown');
        const menuBtn = document.getElementById('readerMenuBtn');
        if (dropdown && menuBtn && !dropdown.contains(e.target) && e.target !== menuBtn) {
            dropdown.classList.remove('active');
        }
    });


    /* =================================================
       NAVIGATION
    ================================================= */

    window.goToNovelDetails = function () {
        const id = new URLSearchParams(window.location.search).get('id');
        if (id) window.location.href = 'novel.html?id=' + id;
    };

    window.goHome = function () {
        window.location.href = 'index.html';
    };


    /* =================================================
       FONT SIZE
    ================================================= */

    const SIZES = [16, 18, 20, 22, 24, 26];
    let currentFontSize = parseInt(localStorage.getItem('readerFontSize'), 10) || 18;

    function applyFontSize(size) {
        const content = document.querySelector('.reader-page-content');
        const story = document.querySelector('.story');
        const paragraphs = document.querySelectorAll('.reader-page-content p, .story p');

        if (content) content.style.fontSize = size + 'px';
        if (story) story.style.fontSize = size + 'px';
        paragraphs.forEach(p => { p.style.fontSize = size + 'px'; });
    }

    window.toggleFontSize = function () {
        let index = SIZES.indexOf(currentFontSize);
        if (index === -1 || index === SIZES.length - 1) {
            currentFontSize = SIZES[0];
        } else {
            currentFontSize = SIZES[index + 1];
        }

        applyFontSize(currentFontSize);
        localStorage.setItem('readerFontSize', currentFontSize);

        const btn = document.getElementById('fontSizeBtn');
        if (btn) btn.textContent = '🔤 ' + currentFontSize + 'px';

        window.dispatchEvent(new CustomEvent('readerFontSizeChanged', {
            detail: { size: currentFontSize }
        }));
    };


    /* =================================================
       THEME
    ================================================= */

    let currentTheme = localStorage.getItem('readerTheme') || 'light';

    function applyTheme(theme) {
        const body = document.body;
        const btn = document.getElementById('themeBtn');

        if (theme === 'dark') {
            body.classList.add('dark-theme');
            if (btn) btn.textContent = '☀️ Light Mode';
        } else {
            body.classList.remove('dark-theme');
            if (btn) btn.textContent = '🌙 Dark Mode';
        }
        currentTheme = theme;
    }

    window.toggleTheme = function () {
        const next = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem('readerTheme', next);
    };


    /* =================================================
       RESTORE PREFERENCES
    ================================================= */

    document.addEventListener('DOMContentLoaded', function () {
        const savedSize = localStorage.getItem('readerFontSize');
        if (savedSize) {
            currentFontSize = parseInt(savedSize, 10);
            applyFontSize(currentFontSize);
            const btn = document.getElementById('fontSizeBtn');
            if (btn) btn.textContent = '🔤 ' + currentFontSize + 'px';
        }

        const savedTheme = localStorage.getItem('readerTheme');
        if (savedTheme) applyTheme(savedTheme);
    });


    /* =================================================
       FORCE NORMAL PAGE SCROLL
    ================================================= */

    window.addEventListener('load', function () {
        document.documentElement.style.height = 'auto';
        document.body.style.height = 'auto';
        document.documentElement.style.overflowY = 'auto';
        document.body.style.overflowY = 'auto';
        document.body.style.overflowX = 'hidden';
    });

    console.log('📖 StoryNest reader loaded.');
})();