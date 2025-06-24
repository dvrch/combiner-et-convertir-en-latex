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
    let showSettings = false;
    let uiTexts = {};
    let currentSettings = {
        useHiddenEmbeds: true,
        // Autres paramètres à ajouter ici
    };

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

    // Charger les textes UI depuis le fichier YAML
    async function loadUiTexts() {
        try {
            // En mode développement, on peut charger depuis le fichier
            // En production, on utilise des valeurs par défaut
            uiTexts = {
                'splitview.original': 'Original',
                'splitview.combined': 'Combiné',
                'save_button': '💾 Sauvegarder le combiné',
                'save_success': 'Fichier sauvegardé sous :',
                'settings.title': 'Paramètres',
                'settings.hidden_embeds': 'Utiliser les embeds cachés',
                'settings.hidden_embeds_desc': 'Inclure le contenu des liens dans des blocs cachés %%...%%',
                'manual_ui.title': 'Combinaison manuelle avancée',
                'manual_ui.close': 'Fermer la combinaison manuelle'
            };
        } catch (error) {
            console.error('Erreur de chargement des textes UI:', error);
            // Valeurs par défaut en cas d'erreur
            uiTexts = {
                'splitview.original': 'Original',
                'splitview.combined': 'Combiné',
                'save_button': '💾 Sauvegarder le combiné',
                'save_success': 'Fichier sauvegardé sous :'
            };
        }
    }

    async function handleCombine() {
        console.log('handleCombine called');
        if (markdownProcessor) {
            console.log('markdownProcessor found');
            // Logique simplifiée pour obtenir le contenu du fichier actif
            const activeFile = app.workspace.getActiveFile();
            if (activeFile) {
                console.log('Active file:', activeFile.name);
                const content = await app.vault.read(activeFile);
                console.log('Content length:', content.length);
                originalContent = content;
                
                try {
                    // Appeler la méthode processMarkdown du composant avec les paramètres
                    combinedContent = await markdownProcessor.processMarkdown(content);
                    console.log('Combined content length:', combinedContent.length);
                } catch (error) {
                    console.error('Error processing markdown:', error);
                    combinedContent = 'Erreur lors du traitement: ' + error.message;
                }
            } else {
                console.log('No active file');
                combinedContent = 'Aucun fichier actif trouvé';
            }
        } else {
            console.log('markdownProcessor not found');
            combinedContent = 'Processeur Markdown non initialisé';
        }
    }

    async function saveCombined() {
        const fileName = await getUniqueFileName(defaultFileName, checkFileExists);
        // TODO: remplacer par la vraie logique de sauvegarde Obsidian
        // await saveToVault(fileName, combinedContent);
        saveMessage = `${uiTexts['save_success'] || 'Fichier sauvegardé sous :'} ${fileName}`;
    }

    onMount(() => {
        loadUiTexts();
    });
</script>

<div class="combiner-app">
    <h1>Markdown Combiner</h1>

    <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem;">
        <button on:click={() => showManualUI = !showManualUI}>
            {showManualUI ? (uiTexts['manual_ui.close'] || 'Fermer la combinaison manuelle') : (uiTexts['manual_ui.title'] || 'Combinaison manuelle avancée')}
        </button>
        <button on:click={() => showSettings = !showSettings}>
            {showSettings ? 'Fermer les paramètres' : '⚙️ Paramètres'}
        </button>
    </div>

    {#if showSettings}
        <div class="settings-panel" style="border: 1px solid #ccc; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
            <h3>{uiTexts['settings.title'] || 'Paramètres'}</h3>
            <div style="margin-bottom: 0.5rem;">
                <label>
                    <input type="checkbox" bind:checked={currentSettings.useHiddenEmbeds} />
                    {uiTexts['settings.hidden_embeds'] || 'Utiliser les embeds cachés'}
                </label>
                <div style="font-size: 0.8em; color: #666; margin-top: 0.25rem;">
                    {uiTexts['settings.hidden_embeds_desc'] || 'Inclure le contenu des liens dans des blocs cachés %%...%%'}
                </div>
            </div>
        </div>
    {/if}

    {#if showManualUI}
        <CombinerManualUI {app} />
    {/if}

    <MarkdownProcessor 
        bind:this={markdownProcessor} 
        {app} 
        settings={currentSettings}
        basePath="" 
        config={null}
        combinedFileName=""
    />

    <button on:click={handleCombine}>Combine Active Note</button>

    <div>
        <SplitView original={originalContent} combined={combinedContent} {uiTexts} />
        <div style="margin-top:1rem; display:flex; align-items:center; gap:1rem;">
            <button on:click={saveCombined}>{uiTexts['save_button'] || '💾 Sauvegarder le combiné'}</button>
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
    .settings-panel {
        background: var(--background-secondary);
    }
</style> 