import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';
import { settings, loadSettingsFromPlugin, saveSettingsToPlugin } from './stores/settings.store';
import { get } from 'svelte/store';
import { combineMarkdownNote } from './markdown-combiner';

export default class MyPlugin extends Plugin {
    private view!: CombinerApp;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new SampleSettingTab(this.app, this));

        this.addRibbonIcon('dice', 'Combine Notes', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-combiner-view',
            name: 'Open Combiner',
            callback: () => {
                this.activateView();
            },
        });

        // Nouvelle commande : combiner la note active et créer un fichier combiné
        this.addCommand({
            id: 'combine-active-note-to-file',
            name: 'Combiner la note active (fichier)',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice('Aucun fichier actif.');
                    return;
                }
                const combined = await combineMarkdownNote(this.app, activeFile, get(settings));
                const parent = activeFile.parent;
                const newName = activeFile.basename + '-combined.md';
                await this.app.vault.create(parent ? parent.path + '/' + newName : newName, combined);
                new Notice('Fichier combiné créé : ' + newName);
            }
        });

        // Commande 1 : Combiner la note active directement (sans UI)
        this.addCommand({
            id: 'combine-active-note-direct',
            name: 'Combiner la note active (direct)',
            icon: 'combiner',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    this.app.workspace.trigger('notice', 'Aucune note active');
                    return;
                }
                const { combineMarkdownNote } = await import('./markdown-combiner');
                const combined = await combineMarkdownNote(this.app, activeFile, get(settings));
                const parent = activeFile.parent;
                const newName = activeFile.basename + '-combined.md';
                await this.app.vault.create(parent ? parent.path + '/' + newName : newName, combined);
                this.app.workspace.trigger('notice', 'Fichier combiné créé : ' + newName);
            }
        });

        // Commande 2 : Ouvrir la fenêtre flottante pour sélection manuelle
        this.addCommand({
            id: 'open-combiner-dom',
            name: 'Ouvrir le combiner (sélection manuelle)',
            callback: () => {
                let container = document.getElementById('combiner-debug-root');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'combiner-debug-root';
                    container.style.position = 'fixed';
                    container.style.top = '60px';
                    container.style.right = '20px';
                    container.style.zIndex = '9999';
                    container.style.background = 'var(--background-primary)';
                    container.style.border = '1px solid var(--background-modifier-border)';
                    container.style.borderRadius = '8px';
                    container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                    container.style.padding = '1rem';
                    container.style.maxWidth = '400px';
                    document.body.appendChild(container);
                } else {
                    container.innerHTML = '';
                }
                new CombinerApp({
                    target: container,
                    props: { app: this.app, settings: get(settings) }
                });
            }
        });
    }

    async onunload() {
        if (this.view) {
            // Assuming the Svelte component has a destroy method
            // this.view.$destroy(); 
        }
    }

    activateView() {
        const container = this.app.workspace.getRightLeaf(false);
        if (container && container.view.containerEl.children[1]) {
            this.view = new CombinerApp({
                target: container.view.containerEl.children[1],
                props: {
                    app: this.app,
                    settings: get(settings)
                }
            });
            this.app.workspace.revealLeaf(container);
        }
    }

    async loadSettings() {
        await loadSettingsFromPlugin(this);
    }

    async saveSettings() {
        await saveSettingsToPlugin(this);
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Settings for Combiner Plugin.' });

        new Setting(containerEl)
            .setName('Use Hidden Embeds')
            .setDesc('If enabled, internal links to notes not already embedded will be added as hidden comment blocks.')
            .addToggle(toggle => toggle
                .setValue(get(settings).useHiddenEmbeds)
                .onChange(async (value) => {
                    settings.update(s => ({ ...s, useHiddenEmbeds: value }));
                    await this.plugin.saveSettings();
                }));
    }
}  