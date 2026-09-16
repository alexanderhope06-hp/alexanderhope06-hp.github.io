/* =====================================================
   STORYNEST — AD BLOCK DETECTION
   Detects AdGuard DNS / uBlock / AdBlock / Brave Shields
   and shows a polite fallback message.
   ===================================================== */

(function () {
    'use strict';

    // ---------- CONFIG ----------
    var CHECK_DELAY = 1500;                  // ms to wait for ad script to load
    var MESSAGE_DURATION = 15000;            // ms the banner stays on screen
    var STORAGE_KEY = 'storynest_adblock_dismissed';
    var SESSION_HIDE_KEY = 'storynest_adblock_hidden_session';

    // ---------- BAIL OUT IF USER ALREADY DISMISSED ----------
    if (sessionStorage.getItem(SESSION_HIDE_KEY) === '1') return;

    // ---------- CREATE A BAIT ELEMENT ----------
    // AdGuard DNS / uBlock / AdBlock all hide elements with class names
    // that look like ads. If the bait element has no size after the delay,
    // ads are being blocked.
    var bait = document.createElement('div');
    bait.className = 'adsbox ad-banner advertisement sponsored-ad';
    bait.id = 'storynest-ad-bait';
    bait.style.cssText = [
        'position:absolute',
        'left:-9999px',
        'top:-9999px',
        'width:1px',
        'height:1px',
        'pointer-events:none',
        'opacity:0'
    ].join(';');
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);

    // ---------- SECOND CHECK: try to load a real ad domain ----------
    var dnsBlocked = false;
    var imgTest = new Image();
    imgTest.onerror = function () { dnsBlocked = true; };
    imgTest.src = 'https://unprofessionalginger.com/favicon.ico?' + Date.now();

    // ---------- AFTER DELAY, DECIDE ----------
    setTimeout(function () {
        var baitHidden = false;
        try {
            var style = window.getComputedStyle(bait);
            baitHidden =
                bait.offsetHeight === 0 ||
                bait.offsetWidth === 0 ||
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                parseFloat(style.opacity) === 0;
        } catch (e) {
            baitHidden = true;
        }

        // Clean up the bait
        if (bait.parentNode) bait.parentNode.removeChild(bait);

        if (baitHidden || dnsBlocked) {
            showAdBlockMessage();
        }
    }, CHECK_DELAY);

    // ---------- THE MESSAGE ----------
    function showAdBlockMessage() {
        // Don't show twice on the same page
        if (document.getElementById('storynest-adblock-banner')) return;

        // Create the banner
        var banner = document.createElement('div');
        banner.id = 'storynest-adblock-banner';
        banner.className = 'storynest-adblock-banner';

        banner.innerHTML = [
            '<div class="storynest-adblock-icon">🛡️</div>',
            '<div class="storynest-adblock-body">',
            '    <strong>Ads help keep StoryNest free</strong>',
            '    <p>',
            '        If you have an ad blocker enabled.',
            '        StoryNest is 100% free thanks to the ads we show.',
            '        If you enjoy reading here, please consider',
            '        <a href="#" id="storynest-adblock-how">whitelisting us</a>',
            '        or disabling your blocker for this site.',
            '    </p>',
            '</div>',
            '<button class="storynest-adblock-close" aria-label="Close">✕</button>'
        ].join('');

        document.body.appendChild(banner);

        // Animate in
        requestAnimationFrame(function () {
            banner.classList.add('visible');
        });

        // Close button
        banner.querySelector('.storynest-adblock-close').addEventListener('click', function () {
            banner.classList.remove('visible');
            sessionStorage.setItem(SESSION_HIDE_KEY, '1');
            setTimeout(function () {
                if (banner.parentNode) banner.parentNode.removeChild(banner);
            }, 400);
        });

        // "whitelisting us" link → show help modal
        banner.querySelector('#storynest-adblock-how').addEventListener('click', function (e) {
            e.preventDefault();
            showHowToWhitelist();
        });

        // Auto-hide after a while (but keep in session so it doesn't spam)
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