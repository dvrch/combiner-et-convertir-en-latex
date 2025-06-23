<script lang="ts">
import { onMount } from 'svelte';
import { getCommands, loadCommands } from '../stores/uiTexts.store';
import type { App, TFile, TAbstractFile } from 'obsidian';

export let app: App;

let files: TFile[] = [];
let fileNames: string[] = [];
let combinedName: string = 'notes-combinees.md';
let previewContent: string = '';
let showPreview = false;
let commands: any[] = [];
let search = '';
let searchResults: TFile[] = [];
let draggingIdx: number|null = null;

onMount(async () => {
    await loadCommands();
    commands = getCommands();
});

function handleDrop(event: DragEvent) {
    event.preventDefault();
    const items = event.dataTransfer?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && file.name.endsWith('.md')) {
                fileNames.push(file.name);
            }
        } else if (item.kind === 'string') {
            item.getAsString(async (path) => {
                const tfile = app.vault.getAbstractFileByPath(path) as TAbstractFile;
                if (tfile && 'extension' in tfile && (tfile as any).extension === 'md') {
                    if (!files.find(f => f.path === (tfile as TFile).path))
                        files.push(tfile as TFile);
                }
            });
        }
    }
}

function handleDragOver(event: DragEvent) {
    event.preventDefault();
}

function moveFile(from: number, to: number) {
    if (from === to) return;
    const f = files.splice(from, 1)[0];
    files.splice(to, 0, f);
}

function removeFile(idx: number) {
    files.splice(idx, 1);
}

function onDragStart(idx: number) {
    draggingIdx = idx;
}
function onDragEnd() {
    draggingIdx = null;
}
function onDropOnItem(idx: number) {
    if (draggingIdx !== null && draggingIdx !== idx) {
        moveFile(draggingIdx, idx);
        draggingIdx = null;
    }
}

async function handlePreview() {
    previewContent = '';
    for (const f of files) {
        const content = await app.vault.read(f);
        previewContent += `\n---\n# ${f.name}\n` + content;
    }
    showPreview = true;
}

function closePreview() {
    showPreview = false;
}

function handleSearch() {
    if (!search.trim()) {
        searchResults = [];
        return;
    }
    // Recherche simple dans tous les fichiers markdown du vault
    const allFiles = app.vault.getMarkdownFiles();
    searchResults = allFiles.filter(f => f.name.toLowerCase().includes(search.trim().toLowerCase()) && !files.find(ff => ff.path === f.path));
}

function addSearchedFile(f: TFile) {
    files.push(f);
    search = '';
    searchResults = [];
}
</script>

<style>
.manual-ui {
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    background: var(--background-secondary);
    max-width: 600px;
    width: 100%;
}
.file-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}
.file-item {
    display: flex;
    align-items: center;
    background: var(--background-primary);
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.5rem;
    cursor: grab;
    user-select: none;
}
.file-item.dragging {
    opacity: 0.5;
}
.file-item .remove {
    margin-left: auto;
    color: #c00;
    cursor: pointer;
}
.drag-area {
    border: 2px dashed #888;
    border-radius: 6px;
    padding: 1rem;
    text-align: center;
    margin-bottom: 1rem;
    background: #f8f8f8;
}
.name-field {
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.preview-modal {
    position: fixed;
    top: 10%;
    left: 50%;
    transform: translateX(-50%);
    background: #222;
    color: #fff;
    border-radius: 8px;
    padding: 2rem;
    z-index: 10000;
    max-width: 80vw;
    max-height: 80vh;
    overflow: auto;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
@media (max-width: 700px) {
    .manual-ui { max-width: 98vw; padding: 0.5rem; }
    .preview-modal { max-width: 98vw; padding: 1rem; }
}
.search-field { margin-bottom: 1rem; }
.search-results { background: #fff; border: 1px solid #ccc; border-radius: 4px; max-height: 120px; overflow-y: auto; }
.search-results div { padding: 0.3rem 0.7rem; cursor: pointer; }
.search-results div:hover { background: #eee; }
</style>

<div class="manual-ui">
    <h2>Combinaison manuelle</h2>
    <div class="drag-area" on:drop={handleDrop} on:dragover={handleDragOver}>
        Glisser-déposer des fichiers markdown ici (depuis Obsidian ou l'extérieur)
    </div>
    <div class="search-field">
        <input type="text" placeholder="Rechercher un fichier dans le vault..." bind:value={search} on:input={handleSearch} />
        {#if searchResults.length > 0}
            <div class="search-results">
                {#each searchResults as f}
                    <div on:click={() => addSearchedFile(f)}>{f.name}</div>
                {/each}
            </div>
        {/if}
    </div>
    <div class="file-list">
        {#each files as file, idx}
            <div class="file-item {draggingIdx === idx ? 'dragging' : ''}"
                draggable="true"
                on:dragstart={() => onDragStart(idx)}
                on:dragend={onDragEnd}
                on:drop={() => onDropOnItem(idx)}
                on:dragover|preventDefault
            >
                <span>{file.name}</span>
                <span class="remove" on:click={() => removeFile(idx)}>✖</span>
                {#if idx > 0}
                    <button on:click={() => moveFile(idx, idx-1)}>↑</button>
                {/if}
                {#if idx < files.length-1}
                    <button on:click={() => moveFile(idx, idx+1)}>↓</button>
                {/if}
            </div>
        {/each}
        {#each fileNames as name, idx}
            <div class="file-item">
                <span>{name} (externe)</span>
                <span class="remove" on:click={() => fileNames.splice(idx,1)}>✖</span>
            </div>
        {/each}
    </div>
    <div class="name-field">
        <label>Nom du fichier combiné :</label>
        <input type="text" bind:value={combinedName} style="flex:1;" />
    </div>
    <button on:mouseenter={handlePreview} on:mouseleave={closePreview} style="margin-bottom:1rem;">
        Aperçu du combiné (survol)
    </button>
    <button style="margin-left:1rem;">Combiner et créer le fichier</button>
    {#if showPreview}
        <div class="preview-modal" on:mouseleave={closePreview}>
            <h3>Aperçu du combiné</h3>
            <pre>{previewContent}</pre>
            <button on:click={closePreview}>Fermer</button>
        </div>
    {/if}
    <div style="margin-top:2rem;">
        <h3>Commandes disponibles</h3>
        <ul>
            {#each commands as cmd}
                <li><b>{cmd.name}</b> — {cmd.description}</li>
            {/each}
        </ul>
    </div>
</div> 