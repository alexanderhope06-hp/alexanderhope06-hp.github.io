/* =====================================================
   STORYNEST - ADD NOVEL
   Secure version for the new Supabase database
   ===================================================== */

const novelForm = document.getElementById("novelForm");


/* =====================================================
   CREATE NOVEL
   ===================================================== */

async function createNovel(event) {
    event.preventDefault();

    /*
     * Check logged-in user
     */
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        alert("Please login before creating a novel.");
        window.location.href = "login.html";
        return;
    }

    /*
     * Get form data
     */
    const title = document.getElementById("novelTitle").value.trim();
    const description = document.getElementById("novelDescription").value.trim();
    const genre = document.getElementById("novelGenre").value;

    if (!title || !description || !genre) {
        alert("Please complete all required fields.");
        return;
    }

    /*
     * Show loading state
     */
    const submitButton = novelForm.querySelector('button[type="submit"]');

    let originalText = "Create Novel";

    if (submitButton) {
        originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Creating...";
    }

    /*
     * Insert novel into Supabase
     *
     * author_id identifies the logged-in author.
     * We deliberately DO NOT send author_name.
     *
     * The database connects:
     *
     * auth.users.id
     *      ↓
     * profiles.id
     *      ↓
     * novels.author_id
     */
    const { data: novel, error } = await supabaseClient
        .from("novels")
        .insert({
            author_id: user.id,
            title: title,
            description: description,
            genre: genre,
            status: "draft"
        })
        .select()
        .single();

    /*
     * Handle error
     */
    if (error) {
        console.error("Create novel error:", error);

        alert(
            "Could not create the novel:\n\n" +
            error.message
        );

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }

        return;
    }

    /*
     * Success
     */
    console.log("Novel created successfully:", novel);

    alert(`"${novel.title}" has been created!`);

    /*
     * Save novel ID
     */
    localStorage.setItem("editingNovelId", novel.id);

    /*
     * Continue to the next step
     */
    window.location.href = "characters.html";
}


/* =====================================================
   FORM SUBMIT
   ===================================================== */

if (novelForm) {
    novelForm.addEventListener("submit", createNovel);
}


/* =====================================================
   SAVE DRAFT
   ===================================================== */

const saveDraftBtn = document.querySelector(
    '.secondary-btn[type="button"]'
);

if (saveDraftBtn) {

    saveDraftBtn.addEventListener("click", async function () {

        /*
         * Get form data
         */
        const title =
            document.getElementById("novelTitle").value.trim();

        const description =
            document.getElementById("novelDescription").value.trim();

        const genre =
            document.getElementById("novelGenre").value;

        if (!title || !description || !genre) {
            alert(
                "Please complete all required fields before saving."
            );
            return;
        }

        /*
         * Check logged-in user
         */
        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            alert("Please login first.");
            window.location.href = "login.html";
            return;
        }

        /*
         * Save as draft
         *
         * Again, no author_name is sent.
         */
        const { data: novel, error } = await supabaseClient
            .from("novels")
            .insert({
                author_id: user.id,
                title: title,
                description: description,
                genre: genre,
                status: "draft"
            })
            .select()
            .single();

        /*
         * Handle error
         */
        if (error) {
            console.error("Save draft error:", error);

            alert(
                "Could not save draft:\n\n" +
                error.message
            );

            return;
        }

        /*
         * Success
         */
        alert(
            `"${novel.title}" has been saved as a draft!`
        );

        localStorage.setItem(
            "editingNovelId",
            novel.id
        );

        window.location.href = "author.html";
    });
}