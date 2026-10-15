/* =====================================================
   STORYNEST — CHARACTERS
   ===================================================== */

(async function guard() {
    if (typeof requireAuthor !== 'function') {
        console.error('requireAuthor missing — check script order.');
        return;
    }
    const user = await requireAuthor({ redirect: 'characters.html' });
    if (!user) return;
    initCharacters(user);
})();

function initCharacters(currentUser) {
    const params = new URLSearchParams(window.location.search);
    const novelId = params.get('id');

    const nameInput        = document.getElementById('characterName');
    const roleInput        = document.getElementById('characterRole');
    const descInput        = document.getElementById('characterDescription');
    const saveBtn          = document.getElementById('saveCharacter');
    const clearBtn         = document.getElementById('clearCharacter');
    const characterList    = document.getElementById('characterList');
    const novelTitleEl     = document.getElementById('novelTitle');

    let editingId = null;

    if (!novelId) {
        alert('No novel selected.');
        window.location.href = 'author.html';
        return;
    }

    // Set up button listener BEFORE any async work
    saveBtn.addEventListener('click', saveCharacter);
    clearBtn.addEventListener('click', clearEditor);

    loadNovelAndCharacters();

    async function loadNovelAndCharacters() {
        // Load novel (for title + ownership check)
        const { data: novel, error } = await supabaseClient
            .from('novels')
            .select('id, title')
            .eq('id', novelId)
            .eq('author_id', currentUser.id)
            .single();

        if (error || !novel) {
            console.error('Novel load error:', error);
            alert('Novel not found or you do not have permission.');
            window.location.href = 'author.html';
            return;
        }

        if (novelTitleEl) novelTitleEl.textContent = novel.title;
        document.title = `Characters — ${novel.title} — StoryNest`;

        await loadCharacters();
    }

    async function loadCharacters() {
        const { data: characters, error } = await supabaseClient
            .from('characters')
            .select('*')
            .eq('novel_id', novelId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Load characters error:', error);
            characterList.innerHTML = `<div class="chapter-empty"><div>⚠️</div><p>Could not load characters.</p></div>`;
            return;
        }

        if (!characters || characters.length === 0) {
            characterList.innerHTML = `<div class="chapter-empty"><div>👤</div><p>No characters yet.</p></div>`;
            return;
        }

        characterList.innerHTML = '';
        characters.forEach(renderCharacter);
    }

    function renderCharacter(c) {
        const item = document.createElement('div');
        item.className = 'editor-chapter';

        item.innerHTML = `
            <div class="editor-chapter-info">
                <strong>${escapeHTML(c.name)}</strong>
                <span>${escapeHTML(c.role || '')}</span>
                <p>${escapeHTML(c.description || '')}</p>
            </div>
            <div class="editor-chapter-actions">
                <button class="secondary-btn edit-character" data-id="${c.id}">Edit</button>
                <button class="delete-chapter" data-id="${c.id}">Delete</button>
            </div>
        `;

        item.querySelector('.edit-character')
            .addEventListener('click', () => editCharacter(c));
        item.querySelector('.delete-chapter')
            .addEventListener('click', () => deleteCharacter(c.id));

        characterList.appendChild(item);
    }

    async function saveCharacter() {
        const name = nameInput.value.trim();
        const role = roleInput.value;
        const description = descInput.value.trim();

        if (!name) {
            alert('Please enter a character name.');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = editingId ? 'Updating...' : 'Adding...';

        let error;
        if (editingId) {
            ({ error } = await supabaseClient
                .from('characters')
                .update({ name, role, description })
                .eq('id', editingId));
        } else {
            ({ error } = await supabaseClient
                .from('characters')
                .insert({
                    novel_id: novelId,
                    author_id: currentUser.id,
                    name,
                    role,
                    description
                }));
        }

        saveBtn.disabled = false;
        saveBtn.textContent = '+ Add Character';

        if (error) {
            console.error('Save character error:', error);
            alert('Could not save character: ' + error.message);
            return;
        }

        editingId = null;
        clearEditor();
        await loadCharacters();
    }

    function editCharacter(c) {
        editingId = c.id;
        nameInput.value = c.name || '';
        roleInput.value = c.role || '';
        descInput.value = c.description || '';
        saveBtn.textContent = 'Update Character';
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInput.focus();
    }

    async function deleteCharacter(id) {
        if (!confirm('Delete this character?')) return;
        const { error } = await supabaseClient.from('characters').delete().eq('id', id);
        if (error) {
            alert('Could not delete: ' + error.message);
            return;
        }
        await loadCharacters();
    }

    function clearEditor() {
        nameInput.value = '';
        roleInput.value = '';
        descInput.value = '';
        editingId = null;
        saveBtn.textContent = '+ Add Character';
    }

    function escapeHTML(v) {
        const d = document.createElement('div');
        d.textContent = v ?? '';
        return d.innerHTML;
    }
}