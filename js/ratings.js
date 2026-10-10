/* =====================================================
   STORYNEST — RATINGS & READER COUNTS
   ===================================================== */

/* ---------- Session ID for anonymous reader tracking ---------- */

function getSessionId() {
    let sessionId = localStorage.getItem('storynest_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('storynest_session_id', sessionId);
    }
    return sessionId;
}


/* ---------- Fetch rating summary for one novel ---------- */

async function fetchNovelRating(novelId) {
    try {
        const { data, error } = await supabaseClient
            .from('novel_ratings_summary')
            .select('*')
            .eq('novel_id', novelId)
            .maybeSingle();

        if (error) {
            console.warn('Rating summary error:', error);
            return { average_rating: 0, rating_count: 0 };
        }

        return data || { average_rating: 0, rating_count: 0 };
    } catch (err) {
        console.warn('Rating fetch failed:', err);
        return { average_rating: 0, rating_count: 0 };
    }
}


/* ---------- Fetch reader count for one novel ---------- */

async function fetchNovelReaders(novelId) {
    try {
        const { data, error } = await supabaseClient
            .from('novel_readers_summary')
            .select('reader_count')
            .eq('novel_id', novelId)
            .maybeSingle();

        if (error) return 0;
        return data?.reader_count || 0;
    } catch (err) {
        return 0;
    }
}


/* ---------- Record a read (called from reader.js) ---------- */

async function recordNovelRead(novelId) {
    try {
        const sessionId = getSessionId();
        const user = (await supabaseClient.auth.getUser()).data?.user;

        let query = supabaseClient
            .from('reading_history')
            .select('id')
            .eq('novel_id', novelId);

        if (user) {
            query = query.eq('user_id', user.id);
        } else {
            query = query.eq('session_id', sessionId).is('user_id', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            await supabaseClient
                .from('reading_history')
                .update({ last_read_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabaseClient
                .from('reading_history')
                .insert({
                    novel_id: novelId,
                    user_id: user?.id || null,
                    session_id: user ? null : sessionId,
                });
        }
    } catch (err) {
        console.warn('Failed to record read:', err);
    }
}


/* ---------- Fetch the logged-in user's rating ---------- */

async function fetchUserRating(novelId) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabaseClient
            .from('ratings')
            .select('rating')
            .eq('novel_id', novelId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) return null;
        return data?.rating || null;
    } catch (err) {
        return null;
    }
}


/* ---------- Submit or update a rating ---------- */

async function submitRating(novelId, ratingValue) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        return { success: false, error: 'AUTH_REQUIRED' };
    }

    try {
        const { error } = await supabaseClient
            .from('ratings')
            .upsert(
                {
                    novel_id: novelId,
                    user_id: user.id,
                    rating: ratingValue,
                },
                { onConflict: 'novel_id,user_id' }
            );

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Rating submit error:', err);
        return { success: false, error: err.message };
    }
}


/* ---------- Convert an average to star characters ---------- */

function renderStars(average, max = 5) {
    const rounded = Math.round(average * 2) / 2;
    let stars = '';
    for (let i = 1; i <= max; i++) {
        stars += (i <= rounded) ? '★' : '☆';
    }
    return stars;
}


/* ---------- Highlight the star picker ---------- */

function highlightStars(starButtons, upTo, isHover = false) {
    starButtons.forEach(btn => {
        const val = parseInt(btn.dataset.value);
        btn.classList.remove('selected', 'hover');

        if (val <= upTo) {
            btn.classList.add(isHover ? 'hover' : 'selected');
        }
    });
}


/* =====================================================
   Rating widget (novel details page)
   ===================================================== */

async function initRatingWidget(novelId) {
    const starsEl = document.getElementById('ratingStars');
    const ratingTextEl = document.getElementById('novelRating');
    const readersEl = document.getElementById('novelReaders');
    const starPicker = document.getElementById('starPicker');
    const userRatingLabel = document.getElementById('userRatingLabel');
    const userRatingHint = document.getElementById('userRatingHint');

    if (!starsEl || !ratingTextEl) return;

    const [ratingSummary, readerCount] = await Promise.all([
        fetchNovelRating(novelId),
        fetchNovelReaders(novelId),
    ]);

    const avg = ratingSummary.average_rating
        ? parseFloat(ratingSummary.average_rating)
        : 0;
    const count = ratingSummary.rating_count || 0;

    starsEl.textContent = renderStars(avg);
    ratingTextEl.textContent = count > 0
        ? `${avg.toFixed(1)} / 5 (${count} rating${count !== 1 ? 's' : ''})`
        : 'No rating yet';

    if (readersEl) {
        readersEl.textContent = readerCount > 0
            ? `• ${readerCount.toLocaleString()} reader${readerCount !== 1 ? 's' : ''}`
            : '';
    }

    if (!starPicker) return;

    const starButtons = starPicker.querySelectorAll('.star-btn');
    const { data: { user } } = await supabaseClient.auth.getUser();

    let userRating = user ? await fetchUserRating(novelId) : null;

    if (userRating) {
        highlightStars(starButtons, userRating);
        if (userRatingLabel) {
            userRatingLabel.textContent =
                `Your rating: ${userRating} star${userRating !== 1 ? 's' : ''}`;
        }
    }

    starButtons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            const val = parseInt(btn.dataset.value);
            highlightStars(starButtons, val, true);
        });
    });

    starPicker.addEventListener('mouseleave', () => {
        highlightStars(starButtons, userRating || 0);
    });

    starButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const val = parseInt(btn.dataset.value);

            if (!user) {
                if (userRatingHint) {
                    const redirect = encodeURIComponent(
                        window.location.pathname + window.location.search
                    );
                    userRatingHint.innerHTML =
                        `Want to rate this novel? ` +
                        `<a href="login.html?redirect=${redirect}" ` +
                        `style="color:#c39aff; font-weight:600; text-decoration:underline;">Log in</a>` +
                        ` or ` +
                        `<a href="signup.html" ` +
                        `style="color:#c39aff; font-weight:600; text-decoration:underline;">sign up free</a>.`;
                    userRatingHint.className = 'user-rating-hint';
                }
                return;
            }

            highlightStars(starButtons, val);

            if (userRatingHint) {
                userRatingHint.textContent = 'Saving...';
                userRatingHint.className = 'user-rating-hint';
            }

            const result = await submitRating(novelId, val);

            if (result.success) {
                userRating = val;

                if (userRatingLabel) {
                    userRatingLabel.textContent =
                        `Your rating: ${val} star${val !== 1 ? 's' : ''}`;
                }
                if (userRatingHint) {
                    userRatingHint.textContent = 'Saved. Thanks for rating!';
                    userRatingHint.className = 'user-rating-hint success';
                }

                const updated = await fetchNovelRating(novelId);
                const newAvg = updated.average_rating
                    ? parseFloat(updated.average_rating)
                    : 0;
                const newCount = updated.rating_count || 0;

                starsEl.textContent = renderStars(newAvg);
                ratingTextEl.textContent =
                    `${newAvg.toFixed(1)} / 5 (${newCount} rating${newCount !== 1 ? 's' : ''})`;

                setTimeout(() => {
                    if (userRatingHint) {
                        userRatingHint.textContent =
                            'You can change your rating anytime.';
                        userRatingHint.className = 'user-rating-hint';
                    }
                }, 2500);
            } else {
                if (userRatingHint) {
                    userRatingHint.textContent =
                        'Could not save. Please try again.';
                    userRatingHint.className = 'user-rating-hint error';
                }
                highlightStars(starButtons, userRating || 0);
            }
        });
    });
}