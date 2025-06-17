import { Plugin } from 'obsidian';
import PluginMain from './components/PluginMain.svelte';

export default class MarkdownCombinerPlugin extends Plugin {
	private main: PluginMain | null = null;

	async onload() {
		this.main = new PluginMain({
			target: document.body,
			props: {
				plugin: this
			}
		});
		
		this.main.initialize();
	}

	onunload() {
		if (this.main) {
			this.main.cleanup();
			this.main.$destroy();
			this.main = null;
		}
	}
} 