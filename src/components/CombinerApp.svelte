<script lang="ts">
    import { App } from 'obsidian';
    import { onMount } from 'svelte';
    import MarkdownProcessor from './MarkdownProcessor.svelte';
    import type { PluginSettings } from '../settings';

    export let app: App;
    export let settings: PluginSettings;

    let markdownProcessor: MarkdownProcessor;
    let mainFileContent: string = '';
    let combinedContent: string = '';

    async function handleCombine() {
        if (markdownProcessor) {
            // A simplified logic to get the active file content
            const activeFile = app.workspace.getActiveFile();
            if (activeFile) {
                const content = await app.vault.read(activeFile);
                combinedContent = await markdownProcessor.processMarkdown(content);
            }
        }
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

    <textarea readonly bind:value={combinedContent}></textarea>
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