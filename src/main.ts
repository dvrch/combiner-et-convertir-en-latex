import { Plugin, TFile } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';

export default class MarkdownCombinerPlugin extends Plugin {
	appView: CombinerApp | null = null;

	async onload() {
		// Ajouter la commande directement dans le plugin pour qu'elle soit disponible immédiatement
		this.addCommand({
			id: 'combine-markdown-files',
			name: 'Combiner les fichiers Markdown avec les embeds',
			callback: () => this.combineMarkdownFiles()
		});

		// Monter le composant Svelte pour l'interface utilisateur
		this.appView = new CombinerApp({
			target: document.body,
			props: { plugin: this }
		});
	}

	async combineMarkdownFiles() {
		const { app } = this;
		const activeFile = app.workspace.getActiveFile();
		
		if (!activeFile || activeFile.extension !== 'md' || !activeFile.parent) {
			app.workspace.trigger('notice', 'Aucun fichier Markdown valide sélectionné.');
			return;
		}

		app.workspace.trigger('notice', `Combinaison de ${activeFile.name}...`);
		
		try {
			const content = await app.vault.read(activeFile);
			const processedContent = await this.processMarkdown(content, app);
			const parentPath = activeFile.parent.path;
			const baseName = activeFile.basename;
			const newFileName = await this.getUniqueFileName(app, baseName, parentPath);
			const fullPath = `${parentPath}/${newFileName}`;

			await app.vault.create(fullPath, processedContent);
			app.workspace.trigger('notice', `Fichier combiné créé : ${fullPath}`);
			
			// Ouvre dans un volet à droite
			const newFile = app.vault.getAbstractFileByPath(fullPath);
			if (newFile && newFile instanceof TFile) {
				const leaf = app.workspace.getLeaf('split', 'vertical');
				await leaf.openFile(newFile);
			}
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : String(e);
			app.workspace.trigger('notice', `Erreur lors de la création du fichier combiné : ${errorMessage}`);
		}
	}

	async processMarkdown(content: string, app: any): Promise<string> {
		const processedFiles = new Set<string>();
		const plugin = this;
		
		async function processEmbeddedLinks(text: string): Promise<string> {
			const embedRegex = /!\[\[([^\]#|^]+)(?:(#)([^\]|]+))?(?:(\^)([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
			let processedText = text;
			let match;
			
			while ((match = embedRegex.exec(text)) !== null) {
				const fullMatch = match[0];
				const noteName = match[1].trim();
				const sectionIndicator = match[2];
				const sectionName = match[3];
				const blockIndicator = match[4];
				const blockId = match[5];
				
				if (processedFiles.has(noteName)) continue;
				processedFiles.add(noteName);
				
				try {
					const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
					if (linkedFile) {
						let linkedContent = await app.vault.read(linkedFile);
						
						if (sectionIndicator && sectionName) {
							linkedContent = plugin.extractSection(linkedContent, sectionName);
						} else if (blockIndicator && blockId) {
							linkedContent = plugin.extractBlock(linkedContent, blockId);
						}
						
						const recursivelyProcessed = await processEmbeddedLinks(linkedContent);
						processedText = processedText.replace(fullMatch, recursivelyProcessed);
					} else {
						processedText = processedText.replace(fullMatch, `<!-- Linked file not found: ${noteName} -->`);
					}
				} catch (err) {
					processedText = processedText.replace(fullMatch, `<!-- Error: Could not process ${noteName} -->`);
				} finally {
					processedFiles.delete(noteName);
				}
			}
			return processedText;
		}
		
		return await processEmbeddedLinks(content);
	}

	extractSection(content: string, sectionName: string): string {
		const lines = content.split('\n');
		const sectionRegex = new RegExp(`^#+\\s*${sectionName}$`);
		let inSection = false;
		const sectionContent: string[] = [];
		let currentLevel = 0;
		
		for (const line of lines) {
			const headingMatch = line.match(/^(#+)\s*(.*)$/);
			if (headingMatch) {
				const level = headingMatch[1].length;
				if (sectionRegex.test(line)) {
					inSection = true;
					currentLevel = level;
					sectionContent.push(line);
				} else if (inSection && level <= currentLevel) {
					inSection = false;
				}
			}
			if (inSection) sectionContent.push(line);
		}
		return sectionContent.join('\n');
	}

	extractBlock(content: string, blockId: string): string {
		const lines = content.split('\n');
		const blockRegex = new RegExp(`\\s\\^${blockId}$`);
		
		for (let i = 0; i < lines.length; i++) {
			if (blockRegex.test(lines[i])) {
				return lines[i].replace(blockRegex, '').trim();
			}
		}
		return '';
	}

	async getUniqueFileName(app: any, baseName: string, parentPath: string): Promise<string> {
		let counter = 1;
		let newFileName = `${baseName}-combined.md`;
		
		while (await app.vault.adapter.exists(`${parentPath}/${newFileName}`)) {
			newFileName = `${baseName}-combined-${counter}.md`;
			counter++;
		}
		return newFileName;
	}

	onunload() {
		this.appView?.$destroy();
		this.appView = null;
	}
} 