<script lang="ts">
    import { Plugin, Notice, TFile } from 'obsidian';
    import MarkdownProcessor from './MarkdownProcessor.svelte';

    export let plugin: Plugin;
    let processor: MarkdownProcessor | null = null;

    async function combineMarkdownFiles() {
        const activeFile = plugin.app.workspace.getActiveFile();
        if (!activeFile || !(activeFile instanceof TFile)) {
            new Notice('Aucun fichier Markdown actif à combiner.');
            return;
        }

        if (activeFile.extension !== 'md') {
            new Notice('Le fichier actif n\'est pas un fichier Markdown.');
            return;
        }

        new Notice(`Combinaison de ${activeFile.name}...`);
        
        const content = await plugin.app.vault.read(activeFile);
        
        if (!processor) {
            processor = new MarkdownProcessor({
                target: document.body,
                props: {
                    app: plugin.app,
                    content
                }
            });
        } else {
            processor.$set({ content });
        }
    }

    export function initialize() {
        plugin.addCommand({
            id: 'combine-markdown-files',
            name: 'Combiner les fichiers Markdown avec les embeds',
            callback: combineMarkdownFiles
        });
    }

    export function cleanup() {
        if (processor) {
            processor.$destroy();
            processor = null;
        }
    }
</script>

<div class="plugin-main">
    <slot />
</div>

<style>
    .plugin-main {
        width: 100%;
    }
</style> 