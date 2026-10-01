/* =====================================================
   STORYNEST — REUSABLE HAMBURGER MENU
   Auto-wires any page that includes:
     <button class="hamburger-btn" id="hamburgerBtn">…</button>
   ===================================================== */

(function () {
    function initHamburger() {
        var btn      = document.getElementById('hamburgerBtn');
        var nav      = document.getElementById('mobileNav');
        var backdrop = document.getElementById('mobileNavBackdrop');

        if (!btn || !nav || !backdrop) return;

        function open() {
            btn.classList.add('open');
            nav.classList.add('open');
            backdrop.classList.add('open');
            document.body.classList.add('mobile-nav-open');
            btn.setAttribute('aria-expanded', 'true');
        }

        function close() {
            btn.classList.remove('open');
            nav.classList.remove('open');
            backdrop.classList.remove('open');
            document.body.classList.remove('mobile-nav-open');
            btn.setAttribute('aria-expanded', 'false');
        }

        function toggle() {
            if (nav.classList.contains('open')) close();
            else open();
        }

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggle();
        });

        backdrop.addEventListener('click', close);

        // Close when a link is tapped (so navigation feels instant)
        nav.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                close();
            });
        });

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') close();
        });

        // Close if the viewport grows back to desktop
        window.addEventListener('resize', function () {
            if (window.innerWidth > 800) close();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHamburger);
    } else {
        initHamburger();
    }
})();