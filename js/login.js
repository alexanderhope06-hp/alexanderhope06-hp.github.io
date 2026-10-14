/* =====================================================
   STORYNEST — LOGIN
   ===================================================== */

(function () {
    'use strict';

    const rolePicker = document.getElementById('rolePicker');
    const loginForm = document.getElementById('loginForm');
    const roleSelected = document.getElementById('roleSelected');

    if (!loginForm) return;

    let selectedRole = null;


    /* ---------- Role pick ---------- */

    if (rolePicker) {
        rolePicker.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => {
                selectedRole = card.dataset.role;
                showForm(selectedRole);
            });
        });
    }


    function showForm(role) {
        rolePicker.hidden = true;
        loginForm.hidden = false;

        renderRolePill(role);

        const emailField = document.getElementById('loginEmail');
        if (emailField) setTimeout(() => emailField.focus(), 50);
    }


    function showPicker() {
        loginForm.hidden = true;
        rolePicker.hidden = false;
        selectedRole = null;
    }


    function renderRolePill(role) {
        if (!roleSelected) return;

        const icon = role === 'author' ? '✍️' : '📖';
        const label = role === 'author' ? 'Author' : 'Reader';

        roleSelected.innerHTML = `
            <span class="role-selected-icon">${icon}</span>
            <span class="role-selected-label">
                Continuing as <strong>${label}</strong>
            </span>
            <button type="button" class="role-change-btn" id="roleChangeBtn">
                Change
            </button>
        `;

        const changeBtn = roleSelected.querySelector('#roleChangeBtn');
        if (changeBtn) changeBtn.addEventListener('click', showPicker);
    }


    /* ---------- Submit ---------- */

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (!selectedRole) {
            showMessage('Please choose a role first.', true);
            return;
        }

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!email || !password) {
            showMessage('Please enter your email and password.', true);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        showMessage('Logging in...');

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                showMessage(error.message, true);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
                return;
            }

            // Confirm the SDK actually persisted the session before we leave
            const { data: sessionData } =
                await supabaseClient.auth.getSession();

            if (!sessionData?.session) {
                showMessage(
                    'Login succeeded but session was not saved. Please try again.',
                    true
                );
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
                return;
            }

            // Persist the chosen role into user metadata
            if (
                selectedRole &&
                data?.user?.user_metadata?.role !== selectedRole
            ) {
                await supabaseClient.auth.updateUser({
                    data: { ...data.user.user_metadata, role: selectedRole }
                });
            }

            // Tiny delay so localStorage is flushed on slower/desktop browsers
            await new Promise(r => setTimeout(r, 150));

            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');

            let destination;
            if (
                redirect &&
                !redirect.includes('://') &&
                !redirect.startsWith('//')
            ) {
                destination = redirect;
            } else if (selectedRole === 'author') {
                destination = 'author.html';
            } else {
                destination = 'index.html';
            }

            showMessage('Login successful. Redirecting...');
            setTimeout(() => window.location.replace(destination), 100);

        } catch (err) {
            console.error('Login error:', err);
            showMessage('Something went wrong. Please try again.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });


    function showMessage(message, isError = false) {
        const el = document.getElementById('authMessage');
        if (!el) return;
        el.textContent = message;
        el.style.color = isError ? '#ff6b6b' : '#58d68d';
    }

})();