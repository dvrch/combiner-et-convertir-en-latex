<script lang="ts">
    import { App, TFile, Modal, Setting } from 'obsidian';
    import { createEventDispatcher, onMount } from 'svelte';

    export let app: App;
    export let isOpen: boolean;

    const dispatch = createEventDispatcher();

    let allMarkdownFiles: TFile[] = [];
    let selectedFiles: TFile[] = [];
    let searchTerm: string = '';

    onMount(() => {
        loadMarkdownFiles();
        console.log("App object in FileSelectionModal:", app);
    });

    async function loadMarkdownFiles() {
        allMarkdownFiles = app.vault.getMarkdownFiles();
        console.log("All Markdown files:", allMarkdownFiles);
    }

    function filteredFiles() {
        return allMarkdownFiles.filter(file => 
            file.path.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    function toggleFileSelection(file: TFile) {
        const index = selectedFiles.findIndex(f => f.path === file.path);
        if (index === -1) {
            selectedFiles = [...selectedFiles, file];
        } else {
            selectedFiles = selectedFiles.filter(f => f.path !== file.path);
        }
    }

    function isSelected(file: TFile) {
        return selectedFiles.some(f => f.path === file.path);
    }

    function handleConfirm() {
        dispatch('filesSelected', selectedFiles);
        isOpen = false;
    }

    function handleClose() {
        isOpen = false;
    }
</script>

{#if isOpen}
<div class="modal-background" on:click={handleClose}>
    <div class="modal-content" on:click|stopPropagation>
        <h2>Sélectionner des fichiers Markdown</h2>
        <div class="search-bar">
            <input type="text" bind:value={searchTerm} placeholder="Rechercher des fichiers..." />
        </div>
        <div class="file-list-modal">
            {#each filteredFiles() as file (file.path)}
                <div class="file-item-modal" on:click={() => toggleFileSelection(file)} class:selected={isSelected(file)}>
                    {file.path}
                </div>
            {/each}
        </div>
        <div class="modal-actions">
            <button on:click={handleConfirm}>Confirmer la sélection</button>
            <button on:click={handleClose}>Annuler</button>
        </div>
    </div>
</div>
{/if}

<style>
    .modal-background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .modal-content {
        background-color: var(--background-primary);
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        max-width: 800px;
        width: 90%;
        max-height: 80%;
        display: flex;
        flex-direction: column;
    }

    .search-bar {
        margin-bottom: 15px;
    }

    .search-bar input {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background-color: var(--background-secondary);
        color: var(--text-normal);
    }

    .file-list-modal {
        flex-grow: 1;
        overflow-y: auto;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 10px;
        margin-bottom: 15px;
    }

    .file-item-modal {
        padding: 8px;
        cursor: pointer;
        border-bottom: 1px solid var(--background-modifier-border);
    }

    .file-item-modal:last-child {
        border-bottom: none;
    }

    .file-item-modal:hover {
        background-color: var(--background-modifier-hover);
    }

    .file-item-modal.selected {
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    .modal-actions button {
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
    }

    .modal-actions button:last-child {
        background-color: var(--background-modifier-border);
        color: var(--text-normal);
    }
</style>
