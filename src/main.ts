import { Plugin } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';

export default class MarkdownCombinerPlugin extends Plugin {
	appView: CombinerApp | null = null;

	async onload() {
		// Ajouter la commande
		this.addCommand({
			id: 'combine-markdown-files',
			name: 'Combiner les fichiers Markdown avec les embeds',
			callback: () => this.combineMarkdownFiles()
		});

		// Ajouter le bouton dans le ribbon
		this.addRibbonIcon('link', 'Combiner les fichiers Markdown', () => {
			this.combineMarkdownFiles();
		});

		// Monter le composant Svelte
		this.appView = new CombinerApp({
			target: document.body,
			props: { plugin: this }
		});
	}

	async combineMarkdownFiles() {
		// Déléguer à la logique Svelte
		if (this.appView) {
			await this.appView.combineFiles();
		}
	}

	onunload() {
		this.appView?.$destroy();
		this.appView = null;
	}
} 