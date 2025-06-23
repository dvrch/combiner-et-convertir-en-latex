import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';
import type { PluginSettings } from './settings';
import { DEFAULT_SETTINGS } from './settings';
import { combineMarkdownNote } from './markdown-combiner';

export default class MyPlugin extends Plugin {
    settings: PluginSettings = DEFAULT_SETTINGS;
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
                const combined = await combineMarkdownNote(this.app, activeFile, this.settings);
                const parent = activeFile.parent;
                const newName = activeFile.basename + '-combined.md';
                await this.app.vault.create(parent ? parent.path + '/' + newName : newName, combined);
                new Notice('Fichier combiné créé : ' + newName);
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
        // This is a simplified way to open a view.
        // You might need a more complex implementation depending on your needs,
        // possibly involving a custom View class that hosts the Svelte component.
        const container = this.app.workspace.getRightLeaf(false);
        if (container && container.view.containerEl.children[1]) {
            this.view = new CombinerApp({
                target: container.view.containerEl.children[1],
                props: {
                    app: this.app,
                    settings: this.settings
                }
            });
            this.app.workspace.revealLeaf(container);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
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
                .setValue(this.plugin.settings.useHiddenEmbeds)
                .onChange(async (value) => {
                    this.plugin.settings.useHiddenEmbeds = value;
                    await this.plugin.saveSettings();
                }));
    }
} 