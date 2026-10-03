/* =====================================================
   STORYNEST — EDIT NOVEL
   ===================================================== */

(function () {
    'use strict';

    const params  = new URLSearchParams(window.location.search);
    const novelId = params.get('id');

    const editForm          = document.getElementById('editNovelForm');
    const titleInput        = document.getElementById('novelTitle');
    const descriptionInput  = document.getElementById('novelDescription');
    const genreInput        = document.getElementById('novelGenre');
    const statusInput       = document.getElementById('novelStatus');
    const coverInput        = document.getElementById('novelCover');
    const coverPreview      = document.getElementById('coverPreview');
    const coverHint         = document.getElementById('coverHint');
    const saveButton        = document.getElementById('saveNovel');
    const manageChapters    = document.getElementById('manageChapters');
    const manageCharacters  = document.getElementById('manageCharacters');

    // Track state
    let currentUser     = null;
    let currentNovel    = null;
    let newCoverFile    = null;   // set when the user picks a new file
    let removeCover     = false;  // set when the user clicks "Remove cover"


    /* =================================================
       IMAGE COMPRESSION
       (same limits as addNovel.js)
    ================================================= */

    const MAX_UPLOAD_BYTES = 100 * 1024;
    const TARGET_BYTES     = 70 * 1024;
    const MAX_DIMENSION    = 900;

    async function compressImage(file) {
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select an image file.');
        }

        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read the file.'));
            reader.readAsDataURL(file);
        });

        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload  = () => resolve(image);
            image.onerror = () => reject(new Error('Invalid or corrupt image.'));
            image.src = dataUrl;
        });

        let { width, height } = img;
        if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width  = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
            width  = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let blob = await canvasToBlob(canvas, 'image/webp', quality);

        while (blob.size > TARGET_BYTES && quality > 0.4) {
            quality -= 0.1;
            blob = await canvasToBlob(canvas, 'image/webp', quality);
        }

        if (blob.size > MAX_UPLOAD_BYTES) {
            const scale = Math.sqrt(MAX_UPLOAD_BYTES / blob.size) * 0.9;
            canvas.width  = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            blob = await canvasToBlob(canvas, 'image/webp', 0.7);
        }

        if (blob.size > MAX_UPLOAD_BYTES) {
            throw new Error(
                'Image is too large even after compression. Try a simpler image.'
            );
        }

        return new File([blob], `cover-${Date.now()}.webp`, { type: 'image/webp' });
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed.'))),
                type,
                quality
            );
        });
    }


    /* =================================================
       UPLOAD / DELETE
    ================================================= */

    async function uploadCover(userId, file) {
        const path = `${userId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from('novel-covers')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            });

        if (uploadError) {
            throw new Error('Cover upload failed: ' + uploadError.message);
        }

        const { data } = supabaseClient
            .storage
            .from('novel-covers')
            .getPublicUrl(path);

        return data.publicUrl;
    }

    // Best-effort delete of an old cover file when it's replaced.
    // The path is derived from the public URL. Fails silently.
    async function deleteOldCover(publicUrl) {
        if (!publicUrl) return;
        try {
            const marker = '/storage/v1/object/public/novel-covers/';
            const idx = publicUrl.indexOf(marker);
            if (idx === -1) return;
            const path = decodeURIComponent(publicUrl.slice(idx + marker.length));

            await supabaseClient.storage.from('novel-covers').remove([path]);
        } catch (err) {
            console.warn('Could not delete old cover (non-fatal):', err);
        }
    }


    /* =================================================
       COVER INPUT PREVIEW
    ================================================= */

    function showCoverPreview(src) {
        if (!coverPreview) return;
        if (src) {
            coverPreview.src = src;
            coverPreview.style.display = 'block';
        } else {
            coverPreview.src = '';
            coverPreview.style.display = 'none';
        }
    }

    if (coverInput && coverPreview) {
        coverInput.addEventListener('change', async () => {
            const file = coverInput.files?.[0];

            if (!file) {
                // User cancelled — revert to existing cover
                newCoverFile = null;
                removeCover  = false;
                coverHint.style.display = 'none';
                showCoverPreview(currentNovel?.cover_url || null);
                return;
            }

            try {
                const compressed = await compressImage(file);
                newCoverFile = compressed;
                removeCover  = false;

                coverPreview.src = URL.createObjectURL(compressed);
                coverPreview.style.display = 'block';
                coverHint.textContent =
                    `New cover ready (${(compressed.size / 1024).toFixed(1)} KB) — click Save Changes to upload.`;
                coverHint.style.display = 'block';

            } catch (err) {
                alert(err.message);
                coverInput.value = '';
                newCoverFile = null;
                coverHint.style.display = 'none';
                showCoverPreview(currentNovel?.cover_url || null);
            }
        });
    }


    /* =================================================
       LOAD NOVEL
    ================================================= */

    if (!novelId) {
        showToast('No novel selected.', 'error');
        setTimeout(() => window.location.href = 'author.html', 1500);
        return;
    }

    loadNovel();

    async function loadNovel() {
        const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !user) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = user;

        const { data: novel, error } = await supabaseClient
            .from('novels')
            .select('*')
            .eq('id', novelId)
            .eq('author_id', user.id)
            .single();

        if (error || !novel) {
            console.error('Could not load novel:', error);
            showToast('Novel not found.', 'error');
            setTimeout(() => window.location.href = 'author.html', 1500);
            return;
        }

        currentNovel = novel;

        titleInput.value       = novel.title       || '';
        descriptionInput.value = novel.description || '';
        genreInput.value       = novel.genre       || '';
        statusInput.value      = novel.status      || 'draft';

        if (novel.cover_url) showCoverPreview(novel.cover_url);

        document.title = `Edit ${novel.title} — StoryNest`;
    }


    /* =================================================
       SAVE
    ================================================= */

    editForm.addEventListener('submit', saveNovelChanges);

    async function saveNovelChanges(event) {
        event.preventDefault();

        if (!currentUser || !currentNovel) return;

        const title       = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const genre       = genreInput.value;

        if (!title || !description || !genre) {
            showToast('Please complete all fields.', 'error');
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        try {
            // 1. Upload new cover if the user picked one
            let coverUrl = currentNovel.cover_url || null;

            if (newCoverFile) {
                saveButton.textContent = 'Uploading cover...';
                coverUrl = await uploadCover(currentUser.id, newCoverFile);

                // Best-effort cleanup of the previous file
                if (currentNovel.cover_url) {
                    deleteOldCover(currentNovel.cover_url);
                }
            } else if (removeCover) {
                if (currentNovel.cover_url) {
                    deleteOldCover(currentNovel.cover_url);
                }
                coverUrl = null;
            }

            // 2. Update the novel row
            saveButton.textContent = 'Saving...';
            const { data, error } = await supabaseClient
                .from('novels')
                .update({ title, description, genre, cover_url: coverUrl })
                .eq('id', novelId)
                .eq('author_id', currentUser.id)
                .select()
                .single();

            if (error) throw new Error(error.message);

            console.log('Novel updated:', data);
            showToast('Novel updated successfully!');
            setTimeout(() => window.location.href = 'author.html', 900);

        } catch (err) {
            console.error('Save error:', err);
            showToast('Could not save changes: ' + err.message, 'error');
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
    }


    /* =================================================
       NAVIGATION BUTTONS
    ================================================= */

    if (manageChapters) {
        manageChapters.addEventListener('click', () => {
            window.location.href =
                `chapters.html?id=${encodeURIComponent(novelId)}`;
        });
    }

    if (manageCharacters) {
        manageCharacters.addEventListener('click', () => {
            window.location.href =
                `characters.html?id=${encodeURIComponent(novelId)}`;
        });
    }

})();