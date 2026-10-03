/* =====================================================
   STORYNEST — WISDOM CATEGORY FILTER
   ===================================================== */

(function () {
    'use strict';

    const filters = document.querySelectorAll('.wisdom-filter');
    const posts = document.querySelectorAll('.wisdom-post');
    const emptyMessage = document.getElementById('wisdomEmpty');

    if (!filters.length || !posts.length) return;

    function filterPosts(category) {
        let visible = 0;

        posts.forEach(post => {
            const match = category === 'all' || post.dataset.category === category;
            post.style.display = match ? '' : 'none';
            if (match) visible++;
        });

        if (emptyMessage) {
            emptyMessage.style.display = visible === 0 ? 'block' : 'none';
        }
    }

    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            filters.forEach(btn => btn.classList.remove('active'));
            filter.classList.add('active');
            filterPosts(filter.dataset.category);
        });
    });

    // Honour ?category=... in the URL
    const params = new URLSearchParams(window.location.search);
    const selected = params.get('category');

    if (selected) {
        const match = document.querySelector(`.wisdom-filter[data-category="${selected}"]`);
        if (match) {
            filters.forEach(btn => btn.classList.remove('active'));
            match.classList.add('active');
            filterPosts(selected);
        }
    }
})();