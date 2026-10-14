/* =====================================================
   STORYNEST — FOLLOW HELPERS
   ===================================================== */

async function getFollowState(authorId) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    // follower count
    const { count: followerCount } = await supabaseClient
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', authorId);

    let isFollowing = false;
    if (user && user.id !== authorId) {
        const { data } = await supabaseClient
            .from('follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('author_id', authorId)
            .maybeSingle();
        isFollowing = !!data;
    }

    return {
        user,
        isFollowing,
        isSelf: user?.id === authorId,
        followerCount: followerCount || 0
    };
}

async function toggleFollow(authorId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        showToast('Please login to follow authors.', 'error');
        setTimeout(() => window.location.replace('login.html'), 1200);
        return null;
    }
    if (user.id === authorId) return null;

    const { data: existing } = await supabaseClient
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('author_id', authorId)
        .maybeSingle();

    if (existing) {
        await supabaseClient.from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('author_id', authorId);
        return false;
    } else {
        await supabaseClient.from('follows')
            .insert({ follower_id: user.id, author_id: authorId });
        return true;
    }
}

/**
 * Wire up a follow button.
 * @param {HTMLButtonElement} btn
 * @param {string} authorId
 * @param {string} authorName
 */
async function initFollowButton(btn, authorId, authorName) {
    if (!btn || !authorId) return;

    const state = await getFollowState(authorId);

    if (state.isSelf) {
        btn.textContent = 'EDIT PROFILE';
        btn.classList.add('secondary-btn');
        btn.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
        return;
    }

    const render = (following) => {
        btn.innerHTML = following
            ? `<span class="follow-icon">✓</span><span class="follow-label">FOLLOWING</span>`
            : `<span class="follow-icon">+</span><span class="follow-label">FOLLOW</span>`;
        btn.classList.toggle('following', following);
    };

    render(state.isFollowing);

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        const prevHTML = btn.innerHTML;
        btn.innerHTML = `<span class="follow-label">…</span>`;

        const nowFollowing = await toggleFollow(authorId);

        if (nowFollowing === null) {
            btn.innerHTML = prevHTML;
            btn.disabled = false;
            return;
        }

        render(nowFollowing);
        btn.disabled = false;
        showToast(nowFollowing
            ? `Following ${authorName || 'author'}`
            : `Unfollowed ${authorName || 'author'}`);
    });
}