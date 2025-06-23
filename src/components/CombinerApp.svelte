<script lang="ts">
    import { App } from 'obsidian';
    import { onMount } from 'svelte';
    import MarkdownProcessor from './MarkdownProcessor.svelte';
    import type { PluginSettings } from '../settings';
    import SplitView from './SplitView.svelte';
    import { getUniqueFileName } from '../markdown-combiner';
    import { getCombinerState, setOriginal, setCombined } from '../stores/combiner.store';
    import { getUiTexts, loadUiTexts } from '../stores/uiTexts.store';

    export let app: App;
    export let settings: PluginSettings;
    export let originalContent: string = '';
    export let combinedContent: string = '';
    export let defaultFileName: string = 'note-combinee.md';
    export let checkFileExists: (name: string) => Promise<boolean> = async () => false;

    let markdownProcessor: MarkdownProcessor;
    let mainFileContent: string = '';
    let saveMessage = '';
    let texts = getUiTexts();
    let state = getCombinerState();

    onMount(() => {
        loadUiTexts();
        texts = getUiTexts();
    });

    async function handleCombine() {
        if (markdownProcessor) {
            // A simplified logic to get the active file content
            const activeFile = app.workspace.getActiveFile();
            if (activeFile) {
                const content = await app.vault.read(activeFile);
                combinedContent = await markdownProcessor.processMarkdown(content);
                setOriginal(content);
                setCombined(combinedContent);
                state = getCombinerState();
            }
        }
    }

    async function saveCombined() {
        const fileName = await getUniqueFileName(defaultFileName, checkFileExists);
        // TODO: remplacer par la vraie logique de sauvegarde Obsidian
        // await saveToVault(fileName, state.combined);
        saveMessage = `${texts.save_success || 'Fichier sauvegardé sous :'} ${fileName}`;
    }
</script>

<div class="combiner-app">
    <h1>Markdown Combiner</h1>

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
        <SplitView original={state.original} combined={state.combined} />
        <div style="margin-top:1rem; display:flex; align-items:center; gap:1rem;">
            <button on:click={saveCombined}>{texts.save_button || '💾 Sauvegarder le combiné'}</button>
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