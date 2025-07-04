<script lang="ts">
import { onMount } from 'svelte';
import { getCommands, loadCommands } from '../stores/uiTexts.store';
import type { App, TFile, TAbstractFile } from 'obsidian';

export let app: App;
export let markdownProcessor: any; // Assuming MarkdownProcessor type

let files: TFile[] = [];
let fileNames: string[] = [];
let combinedName: string = 'notes-combinees.md';

let commands: any[] = [];

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
            // Fichier externe
            const file = item.getAsFile();
            if (file && file.name.endsWith('.md')) {
                // On ne peut pas lire le contenu externe ici, mais on peut afficher le nom
                fileNames.push(file.name);
            }
        } else if (item.kind === 'string') {
            // Drag depuis Obsidian : on tente de récupérer le chemin
            item.getAsString(async (path) => {
                const tfile = app.vault.getAbstractFileByPath(path) as TAbstractFile;
                // Vérification manuelle des propriétés d'un TFile
                if (tfile && 'extension' in tfile && (tfile as any).extension === 'md') {
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
    const f = files.splice(from, 1)[0];
    files.splice(to, 0, f);
}

function removeFile(idx: number) {
    files.splice(idx, 1);
}

async function handleCombineAndSave() {
    if (!markdownProcessor) {
        console.error("MarkdownProcessor is not available.");
        return;
    }

    let combinedContent = '';
    for (const f of files) {
        const content = await app.vault.read(f);
        combinedContent += content + '\n'; // Simple concatenation for now
    }

    // Process the combined content using the markdownProcessor
    const processedContent = await markdownProcessor.processMarkdown(combinedContent);

    // Save the processed content to a new file
    try {
        await app.vault.create(combinedName, processedContent);
        console.log(`File ${combinedName} created successfully.`);
        // Optionally, show a success message to the user
    } catch (error) {
        console.error(`Error creating file ${combinedName}:`, error);
        // Optionally, show an error message to the user
    }
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
</style>

<div class="manual-ui">
    <h2>Combinaison manuelle</h2>
    <div class="drag-area" on:drop={handleDrop} on:dragover={handleDragOver}>
        Glisser-déposer des fichiers markdown ici (depuis Obsidian ou l'extérieur)
    </div>
    <div class="file-list">
        {#each files as file, idx}
            <div class="file-item" draggable="true">
                <span>{file.name}</span>
                <span class="remove" on:click={() => removeFile(idx)}>✖</span>
                
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
    <button on:click={handleCombineAndSave}>Combiner et créer le fichier</button>
    
    <div style="margin-top:2rem;">
        <h3>Commandes disponibles</h3>
        <ul>
            {#each commands as cmd}
                <li><b>{cmd.name}</b> — {cmd.description}</li>
            {/each}
        </ul>
    </div>
</div> 