import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';
import { getSettings, setSetting, loadSettingsFromPlugin, saveSettingsToPlugin } from './stores/settings.store';
import { combineMarkdownNote, getUniqueFileName } from './markdown-combiner';

async function createAndOpenCombinedFile(app: App, baseFile: TFile, combinedContent: string) {
    const parent = baseFile.parent;
    const baseName = baseFile.basename + '-combined.md';
    const existsFn = async (name: string) => {
        const path = parent ? parent.path + '/' + name : name;
        return !!app.vault.getAbstractFileByPath(path);
    };
    const uniqueName = await getUniqueFileName(baseName, existsFn);
    const filePath = parent ? parent.path + '/' + uniqueName : uniqueName;
    const newFile = await app.vault.create(filePath, combinedContent);
    // Ouvre dans un nouveau pane à droite
    const leaf = app.workspace.getLeaf('split', 'vertical');
    await leaf.openFile(newFile);
    app.workspace.trigger('notice', 'Fichier combiné créé et ouvert : ' + uniqueName);
}

export default class MyPlugin extends Plugin {
    private view!: CombinerApp;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new SampleSettingTab(this.app, this));

        this.addRibbonIcon('dice', 'Combine Notes', () => {
            this.openFloatingCombiner();
        });

        this.addCommand({
            id: 'open-combiner-view',
            name: 'Open Combiner',
            callback: () => {
                this.openFloatingCombiner();
            },
        });

        // Commande : combiner la note active et créer un fichier combiné (toujours unique, ouverture à droite)
        this.addCommand({
            id: 'combine-active-note-to-file',
            name: 'Combiner la note active (fichier)',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice('Aucun fichier actif.');
                    return;
                }
                const settings = getSettings();
                const combined = await combineMarkdownNote(this.app, activeFile, settings);
                await createAndOpenCombinedFile(this.app, activeFile, combined);
            }
        });

        // Commande : Combiner la note active directement (sans UI, ouverture à droite)
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
                const settings = getSettings();
                const combined = await combineMarkdownNote(this.app, activeFile, settings);
                await createAndOpenCombinedFile(this.app, activeFile, combined);
            }
        });

        // Commande : Ouvrir la fenêtre flottante pour sélection manuelle
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
                const settings = getSettings();
                new CombinerApp({
                    target: container,
                    props: { app: this.app, settings }
                });
            }
        });
    }

    async onunload() {
        if (this.view) {
            // Assuming the Svelte component has a destroy method
            // this.view.$destroy(); 
        }
        const container = document.getElementById('combiner-debug-root');
        if (container) {
            container.remove();
        }
    }

    openFloatingCombiner() {
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

            // Make it draggable
            let isDragging = false;
            let currentX: number;
            let currentY: number;
            let initialX: number;
            let initialY: number;
            let xOffset = 0;
            let yOffset = 0;

            container.addEventListener("mousedown", dragStart);
            container.addEventListener("mouseup", dragEnd);
            container.addEventListener("mousemove", drag);

            function dragStart(e: MouseEvent) {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;

                if (e.target === container) {
                    isDragging = true;
                }
            }

            function dragEnd(e: MouseEvent) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
            }

            function drag(e: MouseEvent) {
                if (isDragging && container) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;

                    xOffset = currentX;
                    yOffset = currentY;

                    setTranslate(currentX, currentY, container);
                }
            }

            function setTranslate(xPos: number, yPos: number, el: HTMLElement) {
                el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
            }
        } else {
            container.innerHTML = '';
        }
        const settings = getSettings();
        new CombinerApp({
            target: container,
            props: { app: this.app, settings }
        });
    }

    activateView() {
        const container = this.app.workspace.getRightLeaf(false);
        if (container && container.view.containerEl.children[1]) {
            const settings = getSettings();
            this.view = new CombinerApp({
                target: container.view.containerEl.children[1],
                props: {
                    app: this.app,
                    settings
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

        const settings = getSettings();
        new Setting(containerEl)
            .setName('Use Hidden Embeds')
            .setDesc('If enabled, internal links to notes not already embedded will be added as hidden comment blocks.')
            .addToggle(toggle => toggle
                .setValue(settings.useHiddenEmbeds)
                .onChange(async (value) => {
                    setSetting('useHiddenEmbeds', value);
                    await this.plugin.saveSettings();
                }));
    }
}  