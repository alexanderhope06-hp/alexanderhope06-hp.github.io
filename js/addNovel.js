/* =====================================================
   STORYNEST - ADD NOVEL (WITH COVER UPLOAD)
   ===================================================== */

const novelForm = document.getElementById("novelForm");

/* ---------- CONFIG ---------- */
const MAX_UPLOAD_BYTES = 100 * 1024;    // hard limit (must match Supabase)
const TARGET_BYTES     = 70 * 1024;     // aim under this after compression
const MAX_DIMENSION    = 900;           // longest side in px

/* =====================================================
   IMAGE COMPRESSION
   ===================================================== */
async function compressImage(file) {
    // Guard: must be an image
    if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file.");
    }

    // Read file into an Image element
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Invalid or corrupt image."));
        image.src = dataUrl;
    });

    // Calculate new dimensions (preserve aspect ratio)
    let { width, height } = img;
    if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
    } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
    }

    // Draw to canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    // Try decreasing quality until we're under TARGET_BYTES
    let quality = 0.8;
    let blob = await canvasToBlob(canvas, "image/webp", quality);

    while (blob.size > TARGET_BYTES && quality > 0.4) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, "image/webp", quality);
    }

    // If still too big at min quality, shrink further & retry once
    if (blob.size > MAX_UPLOAD_BYTES) {
        const scale = Math.sqrt(MAX_UPLOAD_BYTES / blob.size) * 0.9;
        canvas.width  = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        blob = await canvasToBlob(canvas, "image/webp", 0.7);
    }

    if (blob.size > MAX_UPLOAD_BYTES) {
        throw new Error(
            "Image is too large even after compression. Try a simpler image."
        );
    }

    return new File([blob], `cover-${Date.now()}.webp`, { type: "image/webp" });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed."))),
            type,
            quality
        );
    });
}

/* =====================================================
   UPLOAD TO SUPABASE STORAGE
   ===================================================== */
async function uploadCover(userId, file) {
    const path = `${userId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabaseClient
        .storage
        .from("novel-covers")
        .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (uploadError) throw new Error("Cover upload failed: " + uploadError.message);

    const { data } = supabaseClient.storage.from("novel-covers").getPublicUrl(path);
    return data.publicUrl;
}

/* ---------- Live preview ---------- */
const coverInput   = document.getElementById("novelCover");
const coverPreview = document.getElementById("coverPreview");

if (coverInput && coverPreview) {
    coverInput.addEventListener("change", async () => {
        const file = coverInput.files?.[0];
        if (!file) {
            coverPreview.style.display = "none";
            return;
        }
        try {
            const compressed = await compressImage(file);
            coverPreview.src = URL.createObjectURL(compressed);
            coverPreview.style.display = "block";
            console.log(
                `Preview ready — ${(compressed.size / 1024).toFixed(1)} KB`
            );
        } catch (err) {
            alert(err.message);
            coverInput.value = "";
            coverPreview.style.display = "none";
        }
    });
}

/* =====================================================
   MAIN: CREATE NOVEL
   ===================================================== */
async function createNovel(event) {
    event.preventDefault();

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
        alert("Please login before creating a novel.");
        window.location.href = "login.html";
        return;
    }

    const title       = document.getElementById("novelTitle").value.trim();
    const description = document.getElementById("novelDescription").value.trim();
    const genre       = document.getElementById("novelGenre").value;
    const coverInput  = document.getElementById("novelCover");
    const coverFile   = coverInput?.files?.[0] || null;

    if (!title || !description || !genre) {
        alert("Please complete all required fields.");
        return;
    }

    const authorName = user.user_metadata?.display_name ||
                       user.user_metadata?.full_name ||
                       user.user_metadata?.name ||
                       user.email?.split("@")[0] ||
                       "Author";

    const submitButton = novelForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Creating...";

    try {
        /* 1. Compress + upload the cover (if provided) */
        let coverUrl = null;
        if (coverFile) {
            submitButton.textContent = "Compressing cover...";
            const compressed = await compressImage(coverFile);

            submitButton.textContent = "Uploading cover...";
            coverUrl = await uploadCover(user.id, compressed);
        }

        /* 2. Insert the novel row */
        submitButton.textContent = "Saving novel...";
        const { data: novel, error } = await supabaseClient
            .from("novels")
            .insert({
                author_id:   user.id,
                author_name: authorName,
                title,
                description,
                genre,
                cover_url:   coverUrl,
                status:      "draft"
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        alert(`"${novel.title}" has been created!`);
        localStorage.setItem("editingNovelId", novel.id);
        window.location.href = "characters.html?id=" + encodeURIComponent(novel.id);

    } catch (err) {
        console.error("Create novel error:", err);
        alert(err.message || "Something went wrong.");
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

/* =====================================================
   SAVE DRAFT (same flow, no redirect to characters)
   ===================================================== */
async function saveDraft() {
    const title       = document.getElementById("novelTitle").value.trim();
    const description = document.getElementById("novelDescription").value.trim();
    const genre       = document.getElementById("novelGenre").value;
    const coverFile   = document.getElementById("novelCover")?.files?.[0] || null;

    if (!title || !description || !genre) {
        alert("Please complete all required fields before saving.");
        return;
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    const authorName = user.user_metadata?.display_name ||
                       user.user_metadata?.full_name ||
                       user.user_metadata?.name ||
                       user.email?.split("@")[0] ||
                       "Author";

    const btn = document.querySelector('.secondary-btn[type="button"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        let coverUrl = null;
        if (coverFile) {
            btn.textContent = "Compressing cover...";
            const compressed = await compressImage(coverFile);
            btn.textContent = "Uploading cover...";
            coverUrl = await uploadCover(user.id, compressed);
        }

        btn.textContent = "Saving draft...";
        const { data: novel, error } = await supabaseClient
            .from("novels")
            .insert({
                author_id:   user.id,
                author_name: authorName,
                title,
                description,
                genre,
                cover_url:   coverUrl,
                status:      "draft"
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        alert(`"${novel.title}" has been saved as a draft!`);
        localStorage.setItem("editingNovelId", novel.id);
        window.location.href = "author.html";

    } catch (err) {
        console.error("Save draft error:", err);
        alert(err.message || "Something went wrong.");
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

/* =====================================================
   WIRE UP
   ===================================================== */
if (novelForm) novelForm.addEventListener("submit", createNovel);

const saveDraftBtn = document.querySelector('.secondary-btn[type="button"]');
if (saveDraftBtn) saveDraftBtn.addEventListener("click", saveDraft);