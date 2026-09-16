/* =====================================================
   STORYNEST — LAYOUT DIAGNOSTICS MODULE (v4)
   ===================================================== */
(function () {
    'use strict';

    // ---------- CONFIG ----------
    var CHECK_DELAY      = 1200;    
    var MESSAGE_DURATION = 15000;   
    var SESSION_HIDE_KEY = 'sn_sys_notice_dismissed';
    var DEBUG            = false;   

    function log() {
        if (DEBUG && window.console) {
            console.log.apply(console, ['[sys-notice]'].concat([].slice.call(arguments)));
        }
    }

    if (sessionStorage.getItem(SESSION_HIDE_KEY) === '1') {
        return;
    }

    function init() {
        // Obfuscated bait element using generic classes to see if they get blocked
        var bait = document.createElement('div');
        bait.id = 'sn-layer-frame';
        // Generic looking but highly targeted layout classes
        bait.className = 'zone-wrapper area-container component-box placement-holder';
        bait.setAttribute('data-node-type', 'viewport');
        bait.style.cssText = [
            'position:absolute',
            'left:-9999px',
            'top:-9999px',
            'width:10px',
            'height:10px',
            'pointer-events:none'
        ].join(';');
        bait.innerHTML = '&nbsp;';
        document.body.appendChild(bait);

        setTimeout(function () {
            var isBroken = false;

            try {
                var style  = window.getComputedStyle(bait);
                var h      = bait.offsetHeight;
                var w      = bait.offsetWidth;

                // If an extension hides this specific hidden element, something is altering layout
                isBroken =
                    h === 0 ||
                    w === 0 ||
                    style.display    === 'none' ||
                    style.visibility === 'hidden' ||
                    parseFloat(style.opacity) === 0;
            } catch (e) {
                isBroken = false;
            }

            if (bait.parentNode) bait.parentNode.removeChild(bait);

            if (isBroken) {
                showSystemNotice();
            }
        }, CHECK_DELAY);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function showSystemNotice() {
        if (document.getElementById('storynest-sys-alert')) return;

        var banner = document.createElement('div');
        banner.id = 'storynest-sys-alert';
        banner.className = 'storynest-sys-alert';

        // Staggered text strings to prevent extension keyword scanners
        banner.innerHTML = [
            '<div class="storynest-sys-icon">🛡️</div>',
            '<div class="storynest-sys-body">',
            '    <strong>Ads help keep StoryNest free</strong>',
            '    <p>',
            '        We noticed you have a blocker enabled.',
            '        StoryNest is 100% free thanks to the ads we show.',
            '        If you enjoy reading here, please consider',
            '        <a href="#" id="storynest-sys-how">supporting us</a>',
            '        or disabling your blocker for this site.',
            '    </p>',
            '</div>',
            '<button class="storynest-sys-close" aria-label="Close">✕</button>'
        ].join('');

        document.body.appendChild(banner);

        requestAnimationFrame(function () {
            banner.classList.add('visible');
        });

        banner.querySelector('.storynest-sys-close').addEventListener('click', function () {
            banner.classList.remove('visible');
            sessionStorage.setItem(SESSION_HIDE_KEY, '1');
            setTimeout(function () {
                if (banner.parentNode) banner.parentNode.removeChild(banner);
            }, 400);
        });

        banner.querySelector('#storynest-sys-how').addEventListener('click', function (e) {
            e.preventDefault();
            showGuideModal();
        });

        setTimeout(function () {
            if (banner.parentNode) {
                banner.classList.remove('visible');
                setTimeout(function () {
                    if (banner.parentNode) banner.parentNode.removeChild(banner);
                }, 400);
            }
        }, MESSAGE_DURATION);
    }

    function showGuideModal() {
        var modal = document.createElement('div');
        modal.className = 'storynest-sys-modal';
        modal.innerHTML = [
            '<div class="storynest-sys-modal-box">',
            '    <button class="storynest-sys-modal-close" aria-label="Close">✕</button>',
            '    <h3>How to support StoryNest</h3>',
            '    <p>Choose your software below and add <strong>storynest</strong> to your allow list:</p>',
            '    <ul>',
            '        <li><strong>AdGuard DNS</strong> — Open AdGuard app → DNS Protection → turn off, or switch to "Default" DNS.</li>',
            '        <li><strong>uBlock Origin</strong> — Click the extension icon → click the big power button so it turns grey.</li>',
            '        <li><strong>AdBlock / Plus</strong> — Click the icon → "Don\'t run on this site".</li>',
            '        <li><strong>Brave Browser</strong> — Click the Brave shield icon next to URL → set Shields to "Down".</li>',
            '        <li><strong>iPhone / Android</strong> — If using a private DNS profile, switch back to automatic DNS in your settings.</li>',
            '    </ul>',
            '    <p class="storynest-sys-modal-thanks">Thank you for supporting StoryNest 💜</p>',
            '</div>'
        ].join('');

        document.body.appendChild(modal);
        requestAnimationFrame(function () {
            modal.classList.add('visible');
        });

        function close() {
            modal.classList.remove('visible');
            setTimeout(function () {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            }, 300);
        }

        modal.querySelector('.storynest-sys-modal-close').addEventListener('click', close);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) close();
        });
    }

})();
