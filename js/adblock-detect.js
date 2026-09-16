/* =====================================================
   STORYNEST — AD BLOCK DETECTION  (v3 — bulletproof)
   Detects uBlock / AdBlock / Brave Shields / AdGuard DNS
   via DOM bait. Runs safely after DOM is ready.
   ===================================================== */

(function () {
    'use strict';

    // ---------- CONFIG ----------
    var CHECK_DELAY      = 1500;    // ms after load to measure bait
    var MESSAGE_DURATION = 15000;   // ms banner stays visible
    var SESSION_HIDE_KEY = 'storynest_adblock_hidden_session';
    var DEBUG            = false;   // set true to see logs

    function log() {
        if (DEBUG && window.console) {
            console.log.apply(console, ['[adblock-detect]'].concat([].slice.call(arguments)));
        }
    }

    // ---------- BAIL OUT IF ALREADY DISMISSED ----------
    if (sessionStorage.getItem(SESSION_HIDE_KEY) === '1') {
        log('already dismissed this session');
        return;
    }

    // ---------- RUN AFTER DOM IS READY ----------
    function init() {
        log('init, body exists:', !!document.body);

        // ---------- CREATE THE BAIT ----------
        var bait = document.createElement('div');
        bait.id = 'storynest-ad-bait';
        // Multiple ad-like class names so most blockers catch it
        bait.className = 'adsbox ad-banner advertisement sponsored-ad text-ad ad-placement banner-ads';
        bait.setAttribute('data-ad-slot', 'storynest');
        bait.style.cssText = [
            'position:absolute',
            'left:-9999px',
            'top:-9999px',
            'width:12px',
            'height:12px',
            'pointer-events:none'
        ].join(';');
        bait.innerHTML = '&nbsp;';
        document.body.appendChild(bait);

        log('bait inserted');

        // ---------- CHECK AFTER DELAY ----------
        setTimeout(function () {
            var blocked = false;
            var details = {};

            try {
                var style  = window.getComputedStyle(bait);
                var h      = bait.offsetHeight;
                var w      = bait.offsetWidth;

                details = {
                    offsetHeight: h,
                    offsetWidth:  w,
                    display:      style.display,
                    visibility:   style.visibility,
                    opacity:      style.opacity
                };

                blocked =
                    h === 0 ||
                    w === 0 ||
                    style.display    === 'none' ||
                    style.visibility === 'hidden' ||
                    parseFloat(style.opacity) === 0;
            } catch (e) {
                log('measurement error (treat as not blocked):', e);
                blocked = false;
            }

            log('bait measurement:', details, '→ blocked:', blocked);

            if (bait.parentNode) bait.parentNode.removeChild(bait);

            if (blocked) {
                showAdBlockMessage();
            }
        }, CHECK_DELAY);
    }

    // ---------- ENTRY POINT ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ---------- THE MESSAGE ----------
    function showAdBlockMessage() {
        log('showing banner');
        if (document.getElementById('storynest-adblock-banner')) return;

        var banner = document.createElement('div');
        banner.id = 'storynest-adblock-banner';
        banner.className = 'storynest-adblock-banner';

        banner.innerHTML = [
            '<div class="storynest-adblock-icon">🛡️</div>',
            '<div class="storynest-adblock-body">',
            '    <strong>Ads help keep StoryNest free</strong>',
            '    <p>',
            '        We noticed you have an ad blocker enabled.',
            '        StoryNest is 100% free thanks to the ads we show.',
            '        If you enjoy reading here, please consider',
            '        <a href="#" id="storynest-adblock-how">whitelisting us</a>',
            '        or disabling your blocker for this site.',
            '    </p>',
            '</div>',
            '<button class="storynest-adblock-close" aria-label="Close">✕</button>'
        ].join('');

        document.body.appendChild(banner);

        requestAnimationFrame(function () {
            banner.classList.add('visible');
        });

        banner.querySelector('.storynest-adblock-close').addEventListener('click', function () {
            banner.classList.remove('visible');
            sessionStorage.setItem(SESSION_HIDE_KEY, '1');
            setTimeout(function () {
                if (banner.parentNode) banner.parentNode.removeChild(banner);
            }, 400);
        });

        banner.querySelector('#storynest-adblock-how').addEventListener('click', function (e) {
            e.preventDefault();
            showHowToWhitelist();
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

    // ---------- HOW-TO MODAL ----------
    function showHowToWhitelist() {
        var modal = document.createElement('div');
        modal.className = 'storynest-adblock-modal';
        modal.innerHTML = [
            '<div class="storynest-adblock-modal-box">',
            '    <button class="storynest-adblock-modal-close" aria-label="Close">✕</button>',
            '    <h3>How to whitelist StoryNest</h3>',
            '    <p>Choose your blocker below and add <strong>storynest</strong> to the allow list:</p>',
            '    <ul>',
            '        <li><strong>AdGuard DNS</strong> — Open AdGuard app → DNS Protection → turn off, or switch to "Default" DNS.</li>',
            '        <li><strong>uBlock Origin</strong> — Click the icon → click the big power button so it turns grey.</li>',
            '        <li><strong>AdBlock / AdBlock Plus</strong> — Click the icon → "Don\'t run on this site".</li>',
            '        <li><strong>Brave Browser</strong> — Click the Brave shield icon → set Shields to "Down".</li>',
            '        <li><strong>iPhone / Android</strong> — If using a private DNS profile, switch back to automatic DNS in your device settings.</li>',
            '    </ul>',
            '    <p class="storynest-adblock-modal-thanks">Thank you for supporting StoryNest 💜</p>',
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

        modal.querySelector('.storynest-adblock-modal-close').addEventListener('click', close);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) close();
        });
    }

})();