/* =====================================================
   STORYNEST — SHARED AUTH HELPERS
   Requires supabase.js to load before this file.
   ===================================================== */

(function () {
    'use strict';

    async function getCurrentSession() {
        const client = window.supabaseClient;
        if (!client || !client.auth) {
            console.error('[Auth] Supabase client is not available.');
            return null;
        }

        try {
            const { data, error } = await client.auth.getSession();
            if (error) {
                console.warn('[Auth] getSession error:', error.message);
                return null;
            }
            return (data && data.session) || null;
        } catch (error) {
            console.warn('[Auth] Could not read session:', error);
            return null;
        }
    }

    function redirectToLogin(destination) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const redirect = destination || currentPage;
        window.location.assign('login.html?redirect=' + encodeURIComponent(redirect));
    }

    function redirectAfterAuth(destination) {
        window.location.assign(destination || 'index.html');
    }

    function getUserRole(user) {
        if (!user) return null;
        return (user.user_metadata && user.user_metadata.role) || null;
    }

    async function requireAuthor(options) {
        options = options || {};

        const session = await getCurrentSession();
        if (!session || !session.user) {
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const redirect = options.redirect || currentPage;
            window.location.assign('login.html?redirect=' + encodeURIComponent(redirect));
            return null;
        }

        const user = session.user;
        if (getUserRole(user) === 'author') return user;

        const shouldUpgrade = window.confirm(
            options.message ||
            'This area is for authors.\n\n' +
            'Become an author to write, publish and manage your stories.\n\n' +
            'Continue?'
        );

        if (!shouldUpgrade) {
            window.location.assign('index.html');
            return null;
        }

        const client = window.supabaseClient;
        try {
            const { error } = await client.auth.updateUser({
                data: Object.assign({}, user.user_metadata || {}, { role: 'author' })
            });
            if (error) throw error;

            const refreshed = await client.auth.getSession();
            if (refreshed.error) throw refreshed.error;

            // Do not reload forever if metadata has not propagated.
            if (refreshed.data && refreshed.data.session &&
                getUserRole(refreshed.data.session.user) === 'author') {
                window.location.reload();
                return null;
            }

            window.alert('Your account was updated. Refresh this page to continue.');
            return null;
        } catch (error) {
            console.error('[Auth] Role upgrade failed:', error);
            window.alert('Could not upgrade your account. ' + (error.message || 'Please try again.'));
            window.location.assign('index.html');
            return null;
        }
    }

    function showToast(message, type) {
        type = type || 'success';
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;

        const text = document.createElement('span');
        text.textContent = message;

        const close = document.createElement('button');
        close.className = 'toast-close';
        close.type = 'button';
        close.setAttribute('aria-label', 'Close notification');
        close.textContent = '×';
        close.addEventListener('click', function () { toast.remove(); });

        toast.append(text, close);
        container.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add('toast-fade-out');
            window.setTimeout(function () { toast.remove(); }, 300);
        }, 4000);
    }

    function initPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(function (button) {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                const input = document.getElementById(button.dataset.target);
                if (!input) return;

                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                button.textContent = show ? '🙈' : '👁️';
                button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');

                const position = input.value.length;
                input.focus();
                try { input.setSelectionRange(position, position); } catch (_) {}
            });
        });
    }

    // Publish helpers on window so they work from classic scripts and modules.
    window.getCurrentSession = getCurrentSession;
    window.redirectToLogin = redirectToLogin;
    window.redirectAfterAuth = redirectAfterAuth;
    window.getUserRole = getUserRole;
    window.requireAuthor = requireAuthor;
    window.showToast = showToast;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPasswordToggles);
    } else {
        initPasswordToggles();
    }
})();
