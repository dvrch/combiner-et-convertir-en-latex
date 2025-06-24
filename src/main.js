import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
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
}

class CombinerModal {
	constructor(app, plugin) {
		this.app = app;
		this.plugin = plugin;
		this.modal = null;
		this.component = null;
	}

	open() {
		this.modal = new (this.app.constructor.Modal)(this.app);
		this.modal.containerEl.addClass('combiner-modal');
		
		this.component = new CombinerApp({
			target: this.modal.contentEl,
			props: {
				app: this.app,
				plugin: this.plugin,
				isDebug: false
			}
		});

		this.modal.open();
	}
} 