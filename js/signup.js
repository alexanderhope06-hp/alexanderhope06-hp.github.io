/* =====================================================
   STORYNEST — SIGNUP
   ===================================================== */

(function () {
    'use strict';

    const rolePicker = document.getElementById('rolePicker');
    const signupForm = document.getElementById('signupForm');
    const roleSelected = document.getElementById('roleSelected');

    if (!signupForm) return;

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
        signupForm.hidden = false;

        renderRolePill(role);

        const nameField = document.getElementById('displayName');
        if (nameField) setTimeout(() => nameField.focus(), 50);
    }


    function showPicker() {
        signupForm.hidden = true;
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
                Signing up as <strong>${label}</strong>
            </span>
            <button type="button" class="role-change-btn" id="roleChangeBtn">
                Change
            </button>
        `;

        const changeBtn = roleSelected.querySelector('#roleChangeBtn');
        if (changeBtn) changeBtn.addEventListener('click', showPicker);
    }


    /* ---------- Submit ---------- */

    signupForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (!selectedRole) {
            showMessage('Please choose a role first.', true);
            return;
        }

        const displayName = document.getElementById('displayName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const submitBtn = signupForm.querySelector('button[type="submit"]');

        if (!displayName || !email || !password) {
            showMessage('Please fill in all fields.', true);
            return;
        }

        if (password.length < 6) {
            showMessage('Password must be at least 6 characters.', true);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        showMessage('Creating account...');

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName,
                        role: selectedRole
                    }
                }
            });

            if (error) {
                showMessage(error.message, true);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
                return;
            }

            // Session available (email confirmation off)
            if (data?.session && data?.user) {
                localStorage.setItem(
                    AUTH_STORAGE_KEY,
                    JSON.stringify(data.session)
                );

                showMessage(
                    selectedRole === 'author'
                        ? 'Welcome. Opening your studio...'
                        : 'Welcome to StoryNest.'
                );

                setTimeout(() => {
                    window.location.replace(
                        selectedRole === 'author' ? 'author.html' : 'index.html'
                    );
                }, 500);
                return;
            }

            // Email confirmation required
            showMessage(
                'Account created. Check your email to confirm, then log in.'
            );
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';

        } catch (err) {
            console.error('Signup error:', err);
            showMessage('Something went wrong. Please try again.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    });


    function showMessage(message, isError = false) {
        const el = document.getElementById('authMessage');
        if (!el) return;
        el.textContent = message;
        el.style.color = isError ? '#ff6b6b' : '#58d68d';
    }

})();