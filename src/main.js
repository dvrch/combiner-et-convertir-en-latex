import { App, Plugin, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';

export default class CombinerPlugin extends Plugin {
	async onload() {
		console.log('Loading Combiner Plugin');

		// Ajouter la commande palette
		this.addCommand({
			id: 'combiner-notes',
			name: 'Combiner les notes',
			callback: () => {
				this.openCombinerModal();
			}
		});

		// Ajouter la commande debug
		this.addCommand({
			id: 'combiner-debug',
			name: 'Debug Combiner',
			callback: () => {
				this.debugCombiner();
			}
		});

		// Ajouter la commande de test pour combiner la note active
		this.addCommand({
			id: 'combiner-active-note',
			name: 'Combiner la note active',
			callback: () => {
				this.combineActiveNote();
			}
		});

		// Ajouter le bouton dans la barre de ruban
		this.addRibbonIcon('link', 'Combiner les notes', (evt) => {
			this.openCombinerModal();
		});
	}

	onunload() {
		console.log('Unloading Combiner Plugin');
	}

	openCombinerModal() {
		const modal = new CombinerModal(this.app, this);
		modal.open();
	}

	debugCombiner() {
		// Monter le composant dans le DOM principal pour debug
		const container = document.createElement('div');
		container.id = 'combiner-debug-container';
		container.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			z-index: 10000;
			background: white;
			border: 2px solid #ccc;
			border-radius: 8px;
			padding: 20px;
			max-width: 80vw;
			max-height: 80vh;
			overflow: auto;
		`;
		
		document.body.appendChild(container);
		
		new CombinerApp({
			target: container,
			props: {
				app: this.app,
				plugin: this,
				isDebug: true
			}
		});
	}

	async combineActiveNote() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('Aucun fichier actif');
			return;
		}

		try {
			// Créer une instance temporaire du processeur
			const container = document.createElement('div');
			document.body.appendChild(container);
			
			const processor = new (await import('./components/MarkdownProcessor.svelte')).default({
				target: container,
				props: {
					app: this.app,
					settings: {},
					basePath: '',
					config: null,
					combinedFileName: ''
				}
			});

			// Lire le contenu du fichier actif
			const content = await this.app.vault.read(activeFile);
			
			// Traiter le contenu
			const combinedContent = await processor.processMarkdown(content);
			
			// Créer un nom de fichier unique
			const baseName = activeFile.basename + '-combined.md';
			let fileName = baseName;
			let counter = 1;
			
			while (await this.app.vault.adapter.exists(fileName)) {
				fileName = `${activeFile.basename}-combined-${counter}.md`;
				counter++;
			}
			
			// Sauvegarder le fichier combiné
			await this.app.vault.create(fileName, combinedContent);
			
			// Nettoyer
			processor.$destroy();
			document.body.removeChild(container);
			
			new Notice(`Fichier combiné créé : ${fileName}`);
			
			// Ouvrir le fichier créé
			const newFile = this.app.vault.getAbstractFileByPath(fileName);
			if (newFile) {
				this.app.workspace.getLeaf().openFile(newFile);
			}
			
		} catch (error) {
			console.error('Erreur lors de la combinaison:', error);
			new Notice('Erreur lors de la combinaison: ' + error.message);
		}
	}
}

class CombinerModal extends Modal {
	constructor(app, plugin) {
		super(app);
		this.plugin = plugin;
		this.component = null;
	}

	open() {
		super.open();
		this.containerEl.addClass('combiner-modal');
		
		this.component = new CombinerApp({
			target: this.contentEl,
			props: {
				app: this.app,
				plugin: this.plugin,
				isDebug: false
			}
		});
	}

	onClose() {
		if (this.component) {
			this.component.$destroy();
		}
	}
} 