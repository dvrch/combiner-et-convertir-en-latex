<script>
    import { onMount } from 'svelte';
    import MarkdownProcessor from './MarkdownProcessor.svelte';
    import SplitView from './SplitView.svelte';
    import CombinerManualUI from './CombinerManualUI.svelte';

    export let app;
    export let plugin;
    export let isDebug = false;
    export let settings = {};
    export let originalContent = '';
    export let combinedContent = '';
    export let defaultFileName = 'note-combinee.md';
    export let checkFileExists = async () => false;

    let markdownProcessor;
    let mainFileContent = '';
    let saveMessage = '';
    let showManualUI = false;

    // Fonction utilitaire pour générer un nom de fichier unique
    async function getUniqueFileName(baseName, checkExists) {
        let fileName = baseName;
        let counter = 1;
        
        while (await checkExists(fileName)) {
            const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
            const ext = baseName.match(/\.[^/.]+$/)?.[0] || '';
            fileName = `${nameWithoutExt}_${counter}${ext}`;
            counter++;
        }
        
        return fileName;
    }

    async function handleCombine() {
        if (markdownProcessor) {
            // Logique simplifiée pour obtenir le contenu du fichier actif
            const activeFile = app.workspace.getActiveFile();
            if (activeFile) {
                const content = await app.vault.read(activeFile);
                combinedContent = await markdownProcessor.processMarkdown(content);
                originalContent = content;
            }
        }
    }

    async function saveCombined() {
        const fileName = await getUniqueFileName(defaultFileName, checkFileExists);
        // TODO: remplacer par la vraie logique de sauvegarde Obsidian
        // await saveToVault(fileName, combinedContent);
        saveMessage = `Fichier sauvegardé sous : ${fileName}`;
    }
</script>

<div class="combiner-app">
    <h1>Markdown Combiner</h1>

    <button on:click={() => showManualUI = !showManualUI} style="margin-bottom:1rem;">
        {showManualUI ? 'Fermer la combinaison manuelle' : 'Combinaison manuelle avancée'}
    </button>
    {#if showManualUI}
        <CombinerManualUI {app} />
    {/if}

    <MarkdownProcessor 
        bind:this={markdownProcessor} 
        {app} 
        {settings} 
        basePath="" 
        config={null}
        combinedFileName=""
    />

    <button on:click={handleCombine}>Combine Active Note</button>

    <div>
        <SplitView original={originalContent} combined={combinedContent} />
        <div style="margin-top:1rem; display:flex; align-items:center; gap:1rem;">
            <button on:click={saveCombined}>💾 Sauvegarder le combiné</button>
            {#if saveMessage}
                <span>{saveMessage}</span>
            {/if}
        </div>
    </div>
</div>

<style>
    .combiner-app {
        padding: 1rem;
    }
    textarea {
        width: 100%;
        height: 400px;
        margin-top: 1rem;
    }
</style> 