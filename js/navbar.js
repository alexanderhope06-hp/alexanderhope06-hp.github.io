/* =====================================================
   STORYNEST — ROLE-AWARE NAVBAR
   Injects: search button (already in HTML), notifications
   bell, and account dropdown with logout.
   Single source of truth for the top-right actions.
   ===================================================== */

(function () {
    'use strict';

    let notifChannel = null;
    let currentUser   = null;
    let unreadCount   = 0;
    let panelLoaded   = false;
    const MAX_PREVIEW = 8;

    /* ============================================================
       BOOTSTRAP
       ============================================================ */
    async function updateNavbar() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        // Resolve session (localStorage first, then Supabase)
        let session = null;
        try {
            const stored = localStorage.getItem(AUTH_STORAGE_KEY);
            if (stored) session = JSON.parse(stored);
        } catch (_) {}

        if (!session?.user) {
            const { data } = await supabaseClient.auth.getSession();
            session = data?.session || null;
        }

        // -------- Guest --------
        if (!session?.user) {
            teardownNotif();
            injectSignupButton(navActions);
            return;
        }

        // -------- Signed in --------
        currentUser = session.user;
        const role = currentUser.user_metadata?.role;
        const displayName =
            currentUser.user_metadata?.display_name ||
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split('@')[0] ||
            'Account';

        navActions.querySelectorAll('.login-btn, .signup-nav-btn')
            .forEach(el => { el.style.display = 'none'; });

        // Notifications bell (before the account dropdown)
        if (!navActions.querySelector('.nav-notif')) {
            navActions.appendChild(buildNotifBell());
            await refreshUnreadCount();
            subscribeToNotifications();
        }

        // Account dropdown
        if (!navActions.querySelector('.nav-account')) {
            navActions.appendChild(buildAccountMenu(displayName, role));
        }

        injectStyles();
    }

    /* ============================================================
       ACCOUNT DROPDOWN  (contains the ONLY logout in the app)
       ============================================================ */
    function buildAccountMenu(displayName, role) {
        const account = document.createElement('div');
        account.className = 'nav-account';
        account.style.cssText = 'position:relative;';

        account.innerHTML = `
            <button class="nav-account-btn" type="button" aria-haspopup="true" aria-expanded="false">
                <span class="nav-account-avatar">${displayName.charAt(0).toUpperCase()}</span>
                <span class="nav-account-name">${escapeHTML(displayName)}</span>
            </button>
            <div class="nav-account-menu" hidden>
                ${role === 'author'
                    ? '<a href="author.html">✍️ Author Studio</a>'
                    : '<a href="author.html">✍️ Become an Author</a>'}
                <a href="profile.html">👤 My Profile</a>
                <a href="my-library.html">📚 My Library</a>
                <div class="nav-account-sep"></div>
                <button type="button" class="nav-account-logout">🚪 Logout</button>
            </div>
        `;

        const btn  = account.querySelector('.nav-account-btn');
        const menu = account.querySelector('.nav-account-menu');

        btn.addEventListener('click', e => {
            e.stopPropagation();
            // Close notif panel if open
            closeNotifPanel();
            const open = menu.hidden;
            menu.hidden = !open;
            btn.setAttribute('aria-expanded', String(open));
        });

        document.addEventListener('click', e => {
            if (!account.contains(e.target)) {
                menu.hidden = true;
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                menu.hidden = true;
                btn.setAttribute('aria-expanded', 'false');
                closeNotifPanel();
            }
        });

        account.querySelector('.nav-account-logout')
            .addEventListener('click', async () => {
                if (!confirm('Log out of StoryNest?')) return;
                try {
                    await supabaseClient.auth.signOut();
                } catch (_) {}
                localStorage.removeItem(AUTH_STORAGE_KEY);
                teardownNotif();
                window.location.replace('index.html');
            });

        return account;
    }

    /* ============================================================
       NOTIFICATION BELL
       ============================================================ */
    function buildNotifBell() {
        const wrap = document.createElement('div');
        wrap.className = 'nav-notif';

        wrap.innerHTML = `
            <button class="nav-notif-btn" type="button"
                    aria-label="Notifications"
                    aria-haspopup="true" aria-expanded="false">
                🔔
                <span class="nav-notif-badge" hidden></span>
            </button>
            <div class="nav-notif-panel" hidden>
                <div class="nav-notif-header">
                    <strong>Notifications</strong>
                    <button type="button" class="nav-notif-markall">Mark all read</button>
                </div>
                <div class="nav-notif-list">
                    <div class="nav-notif-empty">Loading…</div>
                </div>
                <a href="notifications.html" class="nav-notif-footer">View all →</a>
            </div>
        `;

        const btn   = wrap.querySelector('.nav-notif-btn');
        const panel = wrap.querySelector('.nav-notif-panel');
        const list  = wrap.querySelector('.nav-notif-list');

        btn.addEventListener('click', async e => {
            e.stopPropagation();

            // Close account menu if open
            document.querySelectorAll('.nav-account-menu')
                .forEach(m => { m.hidden = true; });

            const opening = panel.hidden;
            panel.hidden = !opening;
            btn.setAttribute('aria-expanded', String(opening));

            if (opening && !panelLoaded) {
                list.innerHTML = '<div class="nav-notif-empty">Loading…</div>';
                await loadPreview(list);
                panelLoaded = true;
            }
        });

        wrap.querySelector('.nav-notif-markall')
            .addEventListener('click', async e => {
                e.stopPropagation();
                await markAllAsRead();
                list.querySelectorAll('.nav-notif-item.unread')
                    .forEach(el => el.classList.remove('unread'));
            });

        document.addEventListener('click', e => {
            if (!panel.hidden && !wrap.contains(e.target)) {
                panel.hidden = true;
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        return wrap;
    }

    function closeNotifPanel() {
        const panel = document.querySelector('.nav-notif-panel');
        const btn   = document.querySelector('.nav-notif-btn');
        if (panel) panel.hidden = true;
        if (btn)   btn.setAttribute('aria-expanded', 'false');
    }

    /* ============================================================
       UNREAD COUNT + LIST
       ============================================================ */
    async function refreshUnreadCount() {
        if (!currentUser) return;

        const { count, error } = await supabaseClient
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);

        if (error) {
            console.warn('Unread count failed:', error);
            return;
        }
        setBadge(count || 0);
    }

    function setBadge(count) {
        unreadCount = count;
        const badge = document.querySelector('.nav-notif-badge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.hidden = false;
        } else {
            badge.hidden = true;
        }
    }

    async function loadPreview(list) {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(MAX_PREVIEW);

        if (error) {
            list.innerHTML = '<div class="nav-notif-empty">Could not load notifications.</div>';
            return;
        }

        if (!data || data.length === 0) {
            list.innerHTML = '<div class="nav-notif-empty">🔔<br>You\'re all caught up.</div>';
            return;
        }

        list.innerHTML = data.map(renderNotifItem).join('');
        bindNotifItems(list);
    }

    function renderNotifItem(n) {
        const unread = n.is_read ? '' : ' unread';
        return `
            <button type="button" class="nav-notif-item${unread}"
                    data-id="${n.id}"
                    data-link="${escapeAttr(n.link || '')}">
                <div class="nav-notif-icon">${iconForType(n.type)}</div>
                <div class="nav-notif-content">
                    <strong>${escapeHTML(n.title)}</strong>
                    ${n.body ? `<p>${escapeHTML(n.body)}</p>` : ''}
                    <div class="nav-notif-time">${timeAgo(n.created_at)}</div>
                </div>
            </button>
        `;
    }

    function bindNotifItems(root) {
        root.querySelectorAll('.nav-notif-item').forEach(el => {
            el.addEventListener('click', async () => {
                const id   = el.dataset.id;
                const link = el.dataset.link;

                if (el.classList.contains('unread')) {
                    el.classList.remove('unread');
                    setBadge(Math.max(0, unreadCount - 1));
                    await supabaseClient
                        .from('notifications')
                        .update({ is_read: true })
                        .eq('id', id)
                        .eq('user_id', currentUser.id);
                }

                if (link) window.location.href = link;
            });
        });
    }

    async function markAllAsRead() {
        if (!currentUser) return;

        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);

        if (error) {
            console.warn('Mark all failed:', error);
            return;
        }
        setBadge(0);
    }

    /* ============================================================
       REALTIME
       ============================================================ */
    function subscribeToNotifications() {
        if (notifChannel || !currentUser) return;

        notifChannel = supabaseClient
            .channel('nav-notif-' + currentUser.id)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${currentUser.id}`
                },
                payload => {
                    setBadge(unreadCount + 1);
                    panelLoaded = false; // force refresh next open

                    const list = document.querySelector('.nav-notif-list');
                    const panel = document.querySelector('.nav-notif-panel');
                    if (list && panel && !panel.hidden) {
                        list.insertAdjacentHTML('afterbegin', renderNotifItem(payload.new));
                        bindNotifItems(list);
                    }
                }
            )
            .subscribe();
    }

    function teardownNotif() {
        if (notifChannel) {
            supabaseClient.removeChannel(notifChannel);
            notifChannel = null;
        }
        document.querySelector('.nav-notif')?.remove();
        document.querySelector('.nav-account')?.remove();
        currentUser = null;
        unreadCount = 0;
        panelLoaded = false;
    }

    /* ============================================================
       GUEST — SIGNUP BUTTON
       ============================================================ */
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
            signup.style.background  = 'rgba(155,92,255,0.1)';
        });
        signup.addEventListener('mouseleave', () => {
            signup.style.borderColor = '#3a3a44';
            signup.style.background  = 'transparent';
        });

        const loginBtn = navActions.querySelector('.login-btn');
        if (loginBtn) navActions.insertBefore(signup, loginBtn);
        else navActions.appendChild(signup);
    }

    /* ============================================================
       INJECTED STYLES  (account dropdown only;
       notification styles live in components.css)
       ============================================================ */
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
            .nav-account-sep {
                height: 1px; background: #23232c; margin: 6px 4px;
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

    /* ============================================================
       HELPERS
       ============================================================ */
    function iconForType(type) {
        switch (type) {
            case 'new_rating':      return '⭐';
            case 'new_comment':     return '💬';
            case 'new_follower':    return '👤';
            case 'novel_published': return '📚';
            case 'system':          return '🔔';
            default:                return '🔔';
        }
    }

    function timeAgo(iso) {
        const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 60)     return 'just now';
        if (s < 3600)   return Math.floor(s / 60) + 'm ago';
        if (s < 86400)  return Math.floor(s / 3600) + 'h ago';
        if (s < 604800) return Math.floor(s / 86400) + 'd ago';
        return new Date(iso).toLocaleDateString();
    }

    function escapeHTML(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    function escapeAttr(value) {
        return String(value ?? '').replace(/"/g, '&quot;');
    }

    /* ============================================================
       REACT TO AUTH CHANGES (login / logout in another tab)
       ============================================================ */
    if (typeof supabaseClient !== 'undefined') {
        supabaseClient.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                teardownNotif();
                updateNavbar();
            } else if (event === 'SIGNED_IN') {
                // Re-run after the DOM settles
                setTimeout(updateNavbar, 50);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateNavbar);
    } else {
        updateNavbar();
    }
})();