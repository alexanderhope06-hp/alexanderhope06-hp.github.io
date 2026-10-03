/* =====================================================
   STORYNEST — GENRE DROPDOWN MENU
   ===================================================== */

(function () {
    'use strict';

    const menuBtn = document.getElementById('novelMenuBtn');
    const dropdown = document.getElementById('novelDropdown');

    if (!menuBtn || !dropdown) return;

    menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target) && e.target !== menuBtn) {
            dropdown.classList.remove('active');
        }
    });

    dropdown.querySelectorAll('.genre-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setTimeout(function () {
                dropdown.classList.remove('active');
            }, 60);
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') dropdown.classList.remove('active');
    });
})();