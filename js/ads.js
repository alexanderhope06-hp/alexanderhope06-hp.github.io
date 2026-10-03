/* =====================================================
   STORYNEST — BOTTOM AD BAR
   Remembers dismissal for the browser session.
   ===================================================== */

(function () {
    var adBar = document.getElementById('storynestBottomAd');
    var closeBtn = document.getElementById('closeBottomAd');

    if (!adBar || !closeBtn) return;

    // Already dismissed this session?
    if (sessionStorage.getItem('storynest_ad_closed') === '1') {
        adBar.classList.add('hidden');
        document.body.classList.add('bottom-ad-hidden');
        return;
    }

    closeBtn.addEventListener('click', function () {
        adBar.classList.add('hidden');
        document.body.classList.add('bottom-ad-hidden');
        sessionStorage.setItem('storynest_ad_closed', '1');
    });
})();