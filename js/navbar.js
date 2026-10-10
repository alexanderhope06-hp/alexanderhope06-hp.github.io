/* =====================================================
   STORYNEST — ROLE-AWARE NAVBAR
   Reads the current session and updates the top-right
   navigation on every page. Safe to include everywhere.
   ===================================================== */

(function () {
    'use strict';

    async function updateNavbar() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        // Try localStorage first, fall back to Supabase
        let session = null;
        try {
            const stored = localStorage.getItem(AUTH_STORAGE_KEY);
            if (stored) session = JSON.parse(stored);
        } catch (_) {}

        if (!session?.user) {
            const { data } = await supabaseClient.auth.getSession();
            session = data?.session || null;
        }

        // ------ Signed out ------
        if (!session?.user) {
            injectSignupButton(navActions);
            return;
        }

        // ------ Signed in ------
        const user = session.user;
        const role = user.user_metadata?.role;
        const displayName =
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'Account';

        // Hide existing login / signup buttons
        navActions.querySelectorAll('.login-btn, .signup-nav-btn')
            .forEach(el => { el.style.display = 'none'; });

        if (navActions.querySelector('.nav-account')) return;

        const account = document.createElement('div');
        account.className = 'nav-account';
        account.style.cssText = 'position:relative;';

        account.innerHTML = `
            <button class="nav-account-btn" type="button">
                <span class="nav-account-avatar">
                    ${displayName.charAt(0).toUpperCase()}
                </span>
                <span class="nav-account-name">${escapeHTML(displayName)}</span>
            </button>
            <div class="nav-account-menu" hidden>
                ${role === 'author'
                    ? '<a href="author.html">✍️ Author Studio</a>'
                    : '<a href="author.html">✍️ Become an Author</a>'}
                <a href="profile.html">👤 My Profile</a>
                <a href="my-library.html">📚 My Library</a>
                <button type="button" class="nav-account-logout">🚪 Logout</button>
            </div>
        `;

        navActions.appendChild(account);

        const btn = account.querySelector('.nav-account-btn');
        const menu = account.querySelector('.nav-account-menu');

        btn.addEventListener('click', e => {
            e.stopPropagation();
            menu.hidden = !menu.hidden;
        });

        document.addEventListener('click', e => {
            if (!account.contains(e.target)) menu.hidden = true;
        });

        account.querySelector('.nav-account-logout')
            .addEventListener('click', async () => {
                if (!confirm('Log out of StoryNest?')) return;
                await supabaseClient.auth.signOut();
                localStorage.removeItem(AUTH_STORAGE_KEY);
                window.location.replace('index.html');
            });

        injectStyles();
    }


    function injectSignupButton(navActions) {
        if (navActions.querySelector('.signup-nav-btn')) return;

        const signup = document.createElement('a');
        signup.href = 'signup.html';
        signup.className = 'signup-nav-btn';
        signup.textContent = 'Sign Up';
        signup.style.cssText = `
            padding: 8px 16px;
            border-radius: 8px;
            border: 1px solid #3a3a44;
            color: #fff;
            font-weight: 600;
            font-size: 13px;
            text-decoration: none;
            transition: all 0.2s ease;
        `;

        signup.addEventListener('mouseenter', () => {
            signup.style.borderColor = 'var(--accent)';
            signup.style.background = 'rgba(155, 92, 255, 0.1)';
        });
        signup.addEventListener('mouseleave', () => {
            signup.style.borderColor = '#3a3a44';
            signup.style.background = 'transparent';
        });

        const loginBtn = navActions.querySelector('.login-btn');
        if (loginBtn) navActions.insertBefore(signup, loginBtn);
        else navActions.appendChild(signup);
    }


    function injectStyles() {
        if (document.getElementById('navAccountStyles')) return;

        const style = document.createElement('style');
        style.id = 'navAccountStyles';
        style.textContent = `
            .nav-account-btn {
                display: flex; align-items: center; gap: 8px;
                background: rgba(255,255,255,0.04);
                border: 1px solid #2a2a34;
                color: #fff; padding: 6px 12px 6px 6px;
                border-radius: 999px; cursor: pointer;
                font: inherit; font-size: 13px; font-weight: 600;
                transition: all 0.2s ease;
            }
            .nav-account-btn:hover {
                border-color: var(--accent);
                background: rgba(155,92,255,0.1);
            }
            .nav-account-avatar {
                width: 28px; height: 28px; border-radius: 50%;
                background: linear-gradient(135deg, var(--accent), #5e32a8);
                display: flex; align-items: center; justify-content: center;
                font-size: 13px; font-weight: 800;
            }
            .nav-account-menu {
                position: absolute; right: 0; top: calc(100% + 8px);
                min-width: 210px; background: #17171f;
                border: 1px solid #2a2a34; border-radius: 12px;
                padding: 6px; box-shadow: 0 12px 40px rgba(0,0,0,0.5);
                z-index: 500;
            }
            .nav-account-menu a,
            .nav-account-logout {
                display: block; width: 100%; text-align: left;
                padding: 10px 14px; border-radius: 8px;
                color: #d0d0d8; font-size: 14px; font-weight: 500;
                text-decoration: none; cursor: pointer;
                background: transparent; border: 0; font-family: inherit;
                transition: background 0.2s ease;
            }
            .nav-account-menu a:hover,
            .nav-account-logout:hover {
                background: rgba(155,92,255,0.12); color: #fff;
            }
            .nav-account-name {
                max-width: 100px;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            @media (max-width: 640px) {
                .nav-account-name { display: none; }
            }
        `;
        document.head.appendChild(style);
    }


    function escapeHTML(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateNavbar);
    } else {
        updateNavbar();
    }
})();