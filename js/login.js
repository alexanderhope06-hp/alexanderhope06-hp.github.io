/* =====================================================
   STORYNEST — LOGIN
   Requires supabase.js to load before this file.
   ===================================================== */

(function () {
    'use strict';

    function initLogin() {
        const rolePicker = document.getElementById('rolePicker');
        const loginForm = document.getElementById('loginForm');
        const roleSelected = document.getElementById('roleSelected');

        if (!loginForm) return;

        let selectedRole = null;
        let isSubmitting = false;

        if (rolePicker) {
            rolePicker.querySelectorAll('.role-card').forEach(function (card) {
                card.addEventListener('click', function () {
                    const role = card.dataset.role;
                    if (role !== 'reader' && role !== 'author') {
                        showMessage('Please choose Reader or Author.', true);
                        return;
                    }
                    selectedRole = role;
                    showForm(role);
                });
            });
        }

        function showForm(role) {
            if (rolePicker) rolePicker.hidden = true;
            loginForm.hidden = false;
            renderRolePill(role);

            const emailField = document.getElementById('loginEmail');
            if (emailField) window.setTimeout(function () { emailField.focus(); }, 50);
        }

        function showPicker() {
            loginForm.hidden = true;
            if (rolePicker) rolePicker.hidden = false;
            selectedRole = null;
            showMessage('');
        }

        function renderRolePill(role) {
            if (!roleSelected) return;

            const isAuthor = role === 'author';
            roleSelected.replaceChildren();

            const icon = document.createElement('span');
            icon.className = 'role-selected-icon';
            icon.textContent = isAuthor ? '✍️' : '📖';

            const label = document.createElement('span');
            label.className = 'role-selected-label';
            label.append('Continuing as ');
            const strong = document.createElement('strong');
            strong.textContent = isAuthor ? 'Author' : 'Reader';
            label.appendChild(strong);

            const change = document.createElement('button');
            change.type = 'button';
            change.className = 'role-change-btn';
            change.textContent = 'Change';
            change.addEventListener('click', showPicker);

            roleSelected.append(icon, label, change);
        }

        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (isSubmitting) return;

            const client = window.supabaseClient;
            if (!client || !client.auth) {
                showMessage(
                    window.storyNestSupabaseError ||
                    'Login service is not ready. Refresh the page and try again.',
                    true
                );
                return;
            }

            if (!selectedRole) {
                showMessage('Please choose Reader or Author first.', true);
                return;
            }

            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email || !password) {
                showMessage('Please enter your email and password.', true);
                return;
            }

            isSubmitting = true;
            setButton(submitBtn, true, 'Logging in...');
            showMessage('Logging in...');

            try {
                const result = await client.auth.signInWithPassword({ email, password });

                if (result.error) {
                    throw result.error;
                }

                // Confirm that the current browser can read the authenticated session.
                const sessionResult = await client.auth.getSession();
                if (sessionResult.error) throw sessionResult.error;

                if (!sessionResult.data || !sessionResult.data.session) {
                    throw new Error(
                        'Login was accepted, but this browser could not read the saved session. Enable site storage and try again.'
                    );
                }

                const user = sessionResult.data.session.user || result.data.user;

                // Role metadata is helpful for the app UI, but a role-update failure
                // should not turn a successful password login into a failed login.
                if (user && user.user_metadata && user.user_metadata.role !== selectedRole) {
                    const updateResult = await client.auth.updateUser({
                        data: Object.assign({}, user.user_metadata, { role: selectedRole })
                    });

                    if (updateResult.error) {
                        console.warn('[StoryNest] Login succeeded, but role metadata was not updated:', updateResult.error.message);
                    }
                }

                const params = new URLSearchParams(window.location.search);
                const requestedRedirect = params.get('redirect');
                const safeRedirect = isSafeLocalRedirect(requestedRedirect);

                let destination;
                if (safeRedirect) {
                    destination = requestedRedirect;
                } else {
                    destination = selectedRole === 'author' ? 'author.html' : 'index.html';
                }

                showMessage('Login successful. Redirecting...');
                window.setTimeout(function () {
                    window.location.assign(destination);
                }, 150);
            } catch (error) {
                console.error('[StoryNest] Login failed:', error);
                showMessage(readableAuthError(error), true);
                isSubmitting = false;
                setButton(submitBtn, false, 'Login');
            }
        });

        function isSafeLocalRedirect(value) {
            if (!value || value.startsWith('//') || value.includes('\\')) return false;
            try {
                const url = new URL(value, window.location.href);
                return url.origin === window.location.origin &&
                    !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
            } catch (_) {
                return false;
            }
        }

        function setButton(button, disabled, text) {
            if (!button) return;
            button.disabled = disabled;
            button.textContent = text;
        }

        function showMessage(message, isError) {
            const el = document.getElementById('authMessage');
            if (!el) return;
            el.textContent = message || '';
            el.style.color = isError ? '#ff6b6b' : '#58d68d';
            el.setAttribute('role', isError ? 'alert' : 'status');
        }

        function readableAuthError(error) {
            const message = error && error.message ? error.message : '';
            if (/invalid login credentials/i.test(message)) {
                return 'Email or password is incorrect. Check both and try again.';
            }
            if (/email not confirmed/i.test(message)) {
                return 'Please confirm your email address before logging in.';
            }
            if (/fetch|network|failed to fetch/i.test(message)) {
                return 'Could not reach the login service. Check your internet connection, then try again.';
            }
            if (/localStorage|storage|persist session/i.test(message)) {
                return 'This browser could not save your login session. Enable site storage, then try again.';
            }
            return message || 'Login failed. Please try again.';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLogin);
    } else {
        initLogin();
    }
})();
