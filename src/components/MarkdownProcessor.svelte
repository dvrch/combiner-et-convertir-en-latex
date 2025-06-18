<script lang="ts">
import { App } from 'obsidian';

export let app: App;
export let basePath: string;
export let config: any = null;

// Interface pour les liens traités
interface ProcessedLink {
	original: string;
	processed: string;
	type: 'embed' | 'internal' | 'image' | 'external';
}

// État du traitement
let processedFiles = new Set<string>();
let processingStatus = '';

// Traitement des liens embarqués (![[note]])
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
				
				// Traitement récursif du contenu lié
				const recursivelyProcessed = await processAllLinks(linkedContent, linkedFile.parent?.path || '');
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

// Traitement des liens internes ([[note]])
async function processInternalLinks(text: string): Promise<string> {
	const internalLinkRegex = /\[\[([^\]#|^]+)(?:(#)([^\]|]+))?(?:(\^)([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
	let processedText = text;
	let match;
	
	while ((match = internalLinkRegex.exec(text)) !== null) {
		const fullMatch = match[0];
		const noteName = match[1].trim();
		const sectionIndicator = match[2];
		const sectionName = match[3];
		const blockIndicator = match[4];
		const blockId = match[5];
		const displayText = match[6];
		
		try {
			const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
			if (linkedFile) {
				// Créer un lien adapté au nouveau contexte
				let newLink = `[[${linkedFile.basename}`;
				if (sectionIndicator && sectionName) {
					newLink += `#${sectionName}`;
				} else if (blockIndicator && blockId) {
					newLink += `^${blockId}`;
				}
				if (displayText) {
					newLink += `|${displayText}`;
				}
				newLink += ']]';
				
				processedText = processedText.replace(fullMatch, newLink);
			} else {
				// Garder le lien original si le fichier n'est pas trouvé
				processedText = processedText.replace(fullMatch, `<!-- Link not found: ${noteName} -->${fullMatch}`);
			}
		} catch (err) {
			processedText = processedText.replace(fullMatch, `<!-- Error processing link: ${noteName} -->${fullMatch}`);
		}
	}
	return processedText;
}

// Traitement des images (![[image]])
async function processImages(text: string): Promise<string> {
	const imageRegex = /!\[\[([^\]#|^]+)(?:(#)([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
	let processedText = text;
	let match;
	
	while ((match = imageRegex.exec(text)) !== null) {
		const fullMatch = match[0];
		const imageName = match[1].trim();
		const sectionIndicator = match[2];
		const sectionName = match[3];
		const altText = match[4];
		
		try {
			const imageFile = app.metadataCache.getFirstLinkpathDest(imageName, '');
			if (imageFile) {
				// Adapter le chemin de l'image au nouveau contexte
				const relativePath = getRelativePath(basePath, imageFile.path);
				let newImage = `![[${relativePath}`;
				if (sectionIndicator && sectionName) {
					newImage += `#${sectionName}`;
				}
				if (altText) {
					newImage += `|${altText}`;
				}
				newImage += ']]';
				
				processedText = processedText.replace(fullMatch, newImage);
			} else {
				processedText = processedText.replace(fullMatch, `<!-- Image not found: ${imageName} -->`);
			}
		} catch (err) {
			processedText = processedText.replace(fullMatch, `<!-- Error processing image: ${imageName} -->`);
		}
	}
	return processedText;
}

// Traitement des liens externes et autres éléments
function processExternalLinks(text: string): string {
	// Les liens externes sont généralement bien gérés par Obsidian
	// On peut les laisser tels quels
	return text;
}

// Fonction principale qui traite tous les types de liens
async function processAllLinks(text: string, currentPath: string): Promise<string> {
	let processedText = text;
	
	// Traitement dans l'ordre : embarqués, internes, images, externes
	processedText = await processEmbeddedLinks(processedText);
	processedText = await processInternalLinks(processedText);
	processedText = await processImages(processedText);
	processedText = processExternalLinks(processedText);
	
	return processedText;
}

// Fonction pour calculer le chemin relatif entre deux fichiers
function getRelativePath(fromPath: string, toPath: string): string {
	if (!fromPath || !toPath) return toPath;
	
	const fromParts = fromPath.split('/').filter(p => p);
	const toParts = toPath.split('/').filter(p => p);
	
	// Trouver le préfixe commun
	let commonPrefix = 0;
	for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
		if (fromParts[i] === toParts[i]) {
			commonPrefix++;
		} else {
			break;
		}
	}
	
	// Calculer le chemin relatif
	const upLevels = fromParts.length - commonPrefix;
	const relativeParts = toParts.slice(commonPrefix);
	
	if (upLevels === 0 && relativeParts.length === 0) {
		return './';
	}
	
	const upPath = '../'.repeat(upLevels);
	const relativePath = relativeParts.join('/');
	
	return upPath + relativePath;
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

// Méthode exposée pour traiter le contenu Markdown
export async function processMarkdown(content: string): Promise<string> {
	processingStatus = 'Traitement des liens...';
	processedFiles.clear();
	
	try {
		const result = await processAllLinks(content, basePath);
		processingStatus = 'Traitement terminé';
		return result;
	} catch (error) {
		processingStatus = 'Erreur lors du traitement';
		throw error;
	}
}

// Méthode pour réinitialiser l'état
export function resetState(): void {
	processedFiles.clear();
	processingStatus = '';
}
</script>

<!-- Ce composant n'a pas d'interface utilisateur, il est purement logique --> 