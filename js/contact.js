/* =====================================================
   STORYNEST — CONTACT FORM
   ===================================================== */

(function () {
    'use strict';

    const form = document.getElementById('contactForm');
    const success = document.getElementById('contactSuccess');

    if (!form || !success) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const subject = document.getElementById('contactSubject').value;
        const message = document.getElementById('contactMessage').value.trim();

        if (!name || !email || !subject || !message) {
            alert('Please fill in all fields.');
            return;
        }

        // In production: send to Supabase / email service
        form.style.display = 'none';
        success.style.display = 'block';
    });

    window.resetContactForm = function () {
        form.reset();
        form.style.display = 'block';
        success.style.display = 'none';
    };
})();