<script lang="ts">
    import { Plugin, Notice, TFile, WorkspaceLeaf } from 'obsidian';
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

        if (!activeFile.parent) {
            new Notice('Le fichier n\'a pas de dossier parent.');
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

        // Attendre que le contenu soit traité
        const processedContent = await processor.processMarkdown(content);
        
        // Créer le nom du fichier combiné
        const parentPath = activeFile.parent.path;
        const baseName = activeFile.basename;
        const newFileName = await processor.getUniqueFileName(baseName, parentPath);
        const fullPath = `${parentPath}/${newFileName}`;
        
        // Sauvegarder le fichier combiné
        try {
            await plugin.app.vault.create(fullPath, processedContent);
            console.log(`Fichier combiné créé à : ${fullPath}`);
            new Notice(`Fichier combiné créé : ${fullPath}`);
            
            // Ouvrir le nouveau fichier dans un volet à droite
            const newFile = plugin.app.vault.getAbstractFileByPath(fullPath);
            if (newFile instanceof TFile) {
                const leaf = plugin.app.workspace.getLeaf('split', 'vertical');
                await leaf.openFile(newFile);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            console.error(`Erreur lors de la création du fichier combiné : ${errorMessage}`);
            new Notice(`Erreur lors de la création du fichier combiné : ${errorMessage}`);
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