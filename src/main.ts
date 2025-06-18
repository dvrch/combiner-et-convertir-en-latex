import { Plugin } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';

export default class MarkdownCombinerPlugin extends Plugin {
	appView: CombinerApp | null = null;

	async onload() {
		this.appView = new CombinerApp({
			target: document.body,
			props: { plugin: this }
		});
	}

	onunload() {
		this.appView?.$destroy();
		this.appView = null;
	}
} 