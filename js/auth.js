/* =====================================================
   STORYNEST — AUTH HELPERS
   Shared utilities. Form handling lives in login.js / signup.js
   ===================================================== */

// Must match your Supabase project ref
const AUTH_STORAGE_KEY = 'sb-smvkexbzgobzpvndmdgh-auth-token';


/* =====================================================
   SESSION HELPERS
   ===================================================== */

async function getCurrentSession() {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
        try {
            const session = JSON.parse(stored);
            if (session && session.user) return session;
        } catch (_) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }

    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.session));
        return data.session;
    }
    return null;
}


function redirectToLogin(destination) {
    const currentPage =
        window.location.pathname.split('/').pop() || 'index.html';
    const redirect = destination || currentPage;

    window.location.replace(
        `login.html?redirect=${encodeURIComponent(redirect)}`
    );
}


function redirectAfterAuth(destination) {
    window.location.replace(destination || 'index.html');
}


/**
 * Returns 'reader', 'author', or null.
 */
function getUserRole(user) {
    if (!user) return null;
    return user.user_metadata?.role || null;
}


/* =====================================================
   ROLE GUARD — use on author-only pages
   Returns the user if they're allowed, or null after
   redirecting / upgrading. Call at the top of any
   author-only script.
   ===================================================== */

async function requireAuthor(options = {}) {
    const session = await getCurrentSession();

    // No session — send to login
    if (!session?.user) {
        const redirect =
            options.redirect ||
            window.location.pathname.split('/').pop() ||
            'index.html';

        window.location.replace(
            `login.html?redirect=${encodeURIComponent(redirect)}`
        );
        return null;
    }

    const user = session.user;
    const role = user.user_metadata?.role;

    // Already an author — let them through
    if (role === 'author') return user;

    // Reader — offer to upgrade
    const upgrade = confirm(
        options.message ||
        'This area is for authors.\n\n' +
        'Become an author to write, publish and earn from your stories.\n\n' +
        'Continue?'
    );

    if (upgrade) {
        try {
            await supabaseClient.auth.updateUser({
                data: { ...user.user_metadata, role: 'author' }
            });

            const { data } = await supabaseClient.auth.refreshSession();

            if (data?.session) {
                localStorage.setItem(
                    AUTH_STORAGE_KEY,
                    JSON.stringify(data.session)
                );
            }

            window.location.reload();
        } catch (err) {
            console.error('Role upgrade failed:', err);
            alert('Could not upgrade your account. Please try again.');
            window.location.replace('index.html');
        }
        return null;
    }

    // Declined — send home
    window.location.replace('index.html');
    return null;
}


/* =====================================================
   TOASTS
   ===================================================== */

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    toast.querySelector('.toast-close')
        .addEventListener('click', () => toast.remove());

    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


/* =====================================================
   PASSWORD VISIBILITY TOGGLE
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', function (event) {
            event.preventDefault();

            const input = document.getElementById(this.dataset.target);
            if (!input) return;

            const hidden = input.type === 'password';
            input.type = hidden ? 'text' : 'password';

            this.textContent = hidden ? '🙈' : '👁️';
            this.setAttribute(
                'aria-label',
                hidden ? 'Hide password' : 'Show password'
            );

            const pos = input.value.length;
            input.focus();
            try { input.setSelectionRange(pos, pos); } catch (_) {}
        });
    });
});