<script lang="ts">
import { App, TFile } from 'obsidian';

export let plugin: any;

// Interface utilisateur
let status = 'Prêt';
let isProcessing = false;

// Logique de traitement Markdown
async function processMarkdown(content: string, app: App): Promise<string> {
	const processedFiles = new Set<string>();
	
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
						linkedContent = extractSection(linkedContent, sectionName);
					} else if (blockIndicator && blockId) {
						linkedContent = extractBlock(linkedContent, blockId);
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

function extractSection(content: string, sectionName: string): string {
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

function extractBlock(content: string, blockId: string): string {
	const lines = content.split('\n');
	const blockRegex = new RegExp(`\\s\\^${blockId}$`);
	
	for (let i = 0; i < lines.length; i++) {
		if (blockRegex.test(lines[i])) {
			return lines[i].replace(blockRegex, '').trim();
		}
	}
	return '';
}

async function getUniqueFileName(app: App, baseName: string, parentPath: string): Promise<string> {
	let counter = 1;
	let newFileName = `${baseName}-combined.md`;
	
	while (await app.vault.adapter.exists(`${parentPath}/${newFileName}`)) {
		newFileName = `${baseName}-combined-${counter}.md`;
		counter++;
	}
	return newFileName;
}

// Méthode exposée pour le plugin principal
export async function combineFiles() {
	if (isProcessing) return;
	
	const { app } = plugin;
	const activeFile = app.workspace.getActiveFile();
	
	if (!activeFile || activeFile.extension !== 'md' || !activeFile.parent) {
		app.workspace.trigger('notice', 'Aucun fichier Markdown valide sélectionné.');
		return;
	}

	isProcessing = true;
	status = 'Traitement en cours...';
	
	try {
		app.workspace.trigger('notice', `Combinaison de ${activeFile.name}...`);
		
		const content = await app.vault.read(activeFile);
		const processedContent = await processMarkdown(content, app);
		const parentPath = activeFile.parent.path;
		const baseName = activeFile.basename;
		const newFileName = await getUniqueFileName(app, baseName, parentPath);
		const fullPath = `${parentPath}/${newFileName}`;

		await app.vault.create(fullPath, processedContent);
		app.workspace.trigger('notice', `Fichier combiné créé : ${fullPath}`);
		
		// Ouvre dans un volet à droite
		const newFile = app.vault.getAbstractFileByPath(fullPath);
		if (newFile && newFile instanceof TFile) {
			const leaf = app.workspace.getLeaf('split', 'vertical');
			await leaf.openFile(newFile);
		}
		
		status = 'Terminé !';
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		app.workspace.trigger('notice', `Erreur lors de la création du fichier combiné : ${errorMessage}`);
		status = 'Erreur : ' + errorMessage;
	} finally {
		isProcessing = false;
	}
}

// Fonction pour déclencher depuis l'interface
async function triggerCombine() {
	await combineFiles();
}
</script>

<!-- Interface utilisateur -->
<div class="combiner-app">
	<div class="status-bar">
		<span class="status">Status: {status}</span>
		<button 
			class="combine-btn" 
			on:click={triggerCombine}
			disabled={isProcessing}
		>
			{isProcessing ? 'Traitement...' : 'Combiner le fichier actuel'}
		</button>
	</div>
</div>

<style>
.combiner-app {
	width: 100%;
	padding: 10px;
	background: var(--background-secondary);
	border-radius: 5px;
	margin: 10px 0;
}

.status-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 10px;
}

.status {
	font-size: 14px;
	color: var(--text-muted);
}

.combine-btn {
	background: var(--interactive-accent);
	color: var(--text-on-accent);
	border: none;
	padding: 8px 16px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
	transition: background-color 0.2s;
}

.combine-btn:hover:not(:disabled) {
	background: var(--interactive-accent-hover);
}

.combine-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style> 