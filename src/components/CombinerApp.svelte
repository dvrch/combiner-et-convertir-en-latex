<script lang="ts">
    import { App } from 'obsidian';
    import { onMount } from 'svelte';
    import MarkdownProcessor from './MarkdownProcessor.svelte';
    import type { PluginSettings } from '../settings';
    
    import { getUniqueFileName } from '../markdown-combiner';
    import { getCombinerState, setOriginal, setCombined } from '../stores/combiner.store';
    import { getUiTexts, loadUiTexts } from '../stores/uiTexts.store';
    import CombinerManualUI from './CombinerManualUI.svelte';
    import LatexConverter from './LatexConverter.svelte';

    export let app: App;
    export let settings: PluginSettings;
    
    export let defaultFileName: string = 'note-combinee.md';
    export let checkFileExists: (name: string) => Promise<boolean> = async () => false;

    let markdownProcessor: MarkdownProcessor;
    let latexConverter: LatexConverter;
    let mainFileContent: string = '';
    let saveMessage = '';
    let texts = getUiTexts();
    let state = getCombinerState();
    let showManualUI = false;
    let processingStatus = '';
    let showPreview = false;
    let latexContent = '';

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

    async function handleCombineAndConvert() {
        try {
            processingStatus = 'Combinaison des fichiers...';

            // 1. Obtenir le fichier actif
            const activeFile = app.workspace.getActiveFile();
            if (!activeFile) {
                processingStatus = 'Erreur: Aucun fichier actif';
                return;
            }

            // 2. Lire le contenu du fichier
            const content = await app.vault.read(activeFile);

            // 3. Combiner les fichiers markdown
            combinedContent = await markdownProcessor.processMarkdown(content);

            // 4. Convertir en LaTeX
            processingStatus = 'Conversion en LaTeX...';
            latexContent = await latexConverter.convertToLatex(combinedContent, activeFile.basename);

            // 5. Créer le fichier LaTeX
            const latexFileName = activeFile.basename + '.tex';
            const parentPath = activeFile.parent?.path || '';
            await app.vault.create(
                parentPath ? `${parentPath}/${latexFileName}` : latexFileName,
                latexContent
            );

            processingStatus = 'Conversion terminée !';
            showPreview = true;
        } catch (error) {
            processingStatus = `Erreur: ${error.message}`;
        }
    }
</script>

<div class="combiner-app">
    <h1>Markdown Combiner</h1>

    <button on:click={() => showManualUI = !showManualUI} style="margin-bottom:1rem;">
        {showManualUI ? 'Fermer la combinaison manuelle' : 'Combinaison manuelle avancée'}
    </button>
    {#if showManualUI}
        <CombinerManualUI {app} {markdownProcessor} />
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

    

    <div class="combiner-container">
        <h3>Combiner et Convertir en LaTeX</h3>

        <div class="button-container">
            <button on:click={handleCombineAndConvert}>
                Combiner et Convertir
            </button>
        </div>

        <div class="status">
            {processingStatus}
        </div>

        {#if showPreview && latexContent}
            <div class="preview">
                <h4>Aperçu LaTeX</h4>
                <pre>{latexContent}</pre>
            </div>
        {/if}
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
    .combiner-container {
        padding: 20px;
    }

    .button-container {
        margin: 20px 0;
    }

    .status {
        margin: 10px 0;
        font-style: italic;
    }

    .preview {
        margin-top: 20px;
        padding: 10px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
    }

    .preview pre {
        max-height: 300px;
        overflow: auto;
        white-space: pre-wrap;
    }
</style>