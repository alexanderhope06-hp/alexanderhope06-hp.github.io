/* =====================================================
   STORYNEST - PROFILE EDITOR
   ===================================================== */

document.addEventListener('DOMContentLoaded', async function() {
    const form = document.getElementById('profileForm');
    const displayNameInput = document.getElementById('profileDisplayName');
    const bioInput = document.getElementById('profileBio');
    const emailInput = document.getElementById('profileEmail');
    const saveBtn = document.getElementById('saveProfile');

    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) {
        showToast('Please login first.', 'error');
        setTimeout(() => window.location.replace('login.html'), 1500);
        return;
    }

    // Load existing profile row (fallback to metadata)
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('display_name, bio')
        .eq('id', user.id)
        .maybeSingle();

    emailInput.value = user.email || '';
    displayNameInput.value =
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] || '';
    bioInput.value = profile?.bio || user.user_metadata?.bio || '';

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const displayName = displayNameInput.value.trim();
        const bio = bioInput.value.trim();

        if (!displayName) {
            showToast('Please enter a display name.', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // 1) Upsert into public.profiles
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
                id: user.id,
                display_name: displayName,
                bio: bio,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        // 2) Also keep auth metadata in sync (used elsewhere)
        const { error: metaError } = await supabaseClient.auth.updateUser({
            data: { display_name: displayName, bio: bio }
        });

        if (profileError || metaError) {
            showToast('Failed to update profile: ' +
                (profileError?.message || metaError?.message), 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Profile';
            return;
        }

        showToast('Profile updated successfully!');
        setTimeout(() => window.location.replace('author.html'), 1000);
    });
});