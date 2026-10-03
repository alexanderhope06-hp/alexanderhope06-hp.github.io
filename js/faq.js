/* =====================================================
   STORYNEST — FAQ ACCORDION
   ===================================================== */

(function () {
    'use strict';

    window.toggleFaq = function (element) {
        const parent = element.parentElement;
        const answer = parent.querySelector('.faq-answer');
        const toggle = element.querySelector('.faq-toggle');

        if (!answer || !toggle) return;

        parent.classList.toggle('active');

        if (parent.classList.contains('active')) {
            answer.style.maxHeight = answer.scrollHeight + 'px';
            toggle.textContent = '−';
        } else {
            answer.style.maxHeight = '0';
            toggle.textContent = '+';
        }

        // Close siblings
        const siblings = parent.parentElement.querySelectorAll('.faq-item');
        siblings.forEach(sibling => {
            if (sibling !== parent && sibling.classList.contains('active')) {
                sibling.classList.remove('active');
                const siblingAnswer = sibling.querySelector('.faq-answer');
                const siblingToggle = sibling.querySelector('.faq-toggle');
                if (siblingAnswer) siblingAnswer.style.maxHeight = '0';
                if (siblingToggle) siblingToggle.textContent = '+';
            }
        });
    };

    // Open the first item on load
    document.addEventListener('DOMContentLoaded', function () {
        const firstFaq = document.querySelector('.faq-item');
        if (firstFaq) {
            const button = firstFaq.querySelector('.faq-question');
            if (button) window.toggleFaq(button);
        }
    });
})();