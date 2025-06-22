<script lang="ts">
import { App } from 'obsidian';

export let app: App;
export let basePath: string;
export let config: any = null;
export let combinedFileName: string = '';

// Interface pour les liens traités
interface ProcessedLink {
	original: string;
	processed: string;
	type: 'embed' | 'internal' | 'image' | 'external';
}

// État du traitement
let processedFiles = new Set<string>();
let processingStatus = '';

// Liste globale des fichiers inclus dans le combiné
let includedFiles = new Set<string>();

// Table des fichiers inclus comme embed et leurs sections/blocs
let embedAnchors: Record<string, {file: string, sections: string[], blocks: string[]}> = {};

// Ajout d'un set pour les fichiers cachés déjà insérés
let hiddenIncludedFiles = new Set<string>();

function extractAnchorsFromContent(file: string, content: string) {
	// Titres
	const sectionAnchors: string[] = [];
	const blockAnchors: string[] = [];
	const lines = content.split('\n');
	for (const line of lines) {
		const headingMatch = line.match(/^(#+)\s*(.*)$/);
		if (headingMatch) {
			// Génère l'ancre markdown (comme Obsidian), en remplaçant les _ par des -
			const anchor = headingMatch[2].trim().replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase();
			sectionAnchors.push(anchor);
		}
		const blockMatch = line.match(/\^([\w-]+)$/);
		if (blockMatch) {
			blockAnchors.push(blockMatch[1]);
		}
	}
	embedAnchors[file.toLowerCase()] = {file, sections: sectionAnchors, blocks: blockAnchors};
}

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

		// Si c'est une image, ajouter un commentaire Obsidian juste avant
		if (/\.(png|jpg|jpeg|gif|svg|bmp|webp)$/i.test(noteName)) {
			const imageComment = `%% EMBED IMAGE: ${noteName} %%\n`;
			processedText = processedText.replace(fullMatch, imageComment + fullMatch);
			continue;
		}

		if (processedFiles.has(noteName)) continue;
		processedFiles.add(noteName);
		includedFiles.add(noteName.toLowerCase());

		try {
			const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
			if (linkedFile) {
				let linkedContent = await app.vault.read(linkedFile);
				if (!linkedContent || linkedContent.trim() === '') {
					linkedContent = `<!-- Contenu vide ou non trouvé pour '${noteName}' -->`;
				}
				let recursivelyProcessed = suffixIdsForCombined(linkedContent);
				// Extraire les ancres de ce contenu
				extractAnchorsFromContent(noteName, recursivelyProcessed);
				recursivelyProcessed = await processAllLinks(recursivelyProcessed, linkedFile.parent?.path || '');
				// Placer l'ancre de bloc markdown sur la même ligne que EMBED START
				const blockAnchor = `^${noteName.replace(/_/g, '-')}`;
				const startComment = `%% EMBED START: [${noteName}] %% ${blockAnchor}\n`;
				const endComment = `\n%% EMBED END: ${noteName} %%`;
				processedText = processedText.replace(fullMatch, startComment + recursivelyProcessed + endComment);
			} else {
				processedText = processedText.replace(fullMatch, `![[${noteName}]]`);
			}
		} catch (err) {
			processedText = processedText.replace(fullMatch, `![[${noteName}]]`);
		} finally {
			processedFiles.delete(noteName);
		}
	}
	return processedText;
}

// Traitement des liens internes ([[note]])
async function processInternalLinks(text: string): Promise<string> {
	const internalLinkRegex = /\[\[([^\]#|^/]+)(?:(#)([^\]|]+))?(?:(\^)([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
	let processedText = text;
	let match;
	let insertions: {index: number, content: string}[] = [];

	// Découper le texte en lignes pour repérer les blocs de code et les commentaires
	const lines = processedText.split('\n');
	let inCodeBlock = false;
	let codeBlockStart = -1;
	const codeBlockLines: {start: number, end: number}[] = [];
	let inComment = false;
	const commentLines: {start: number, end: number}[] = [];

	for (let i = 0; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (/^(```|~~~)/.test(trimmed)) {
			if (!inCodeBlock) {
				inCodeBlock = true;
				codeBlockStart = i;
			} else {
				inCodeBlock = false;
				codeBlockLines.push({start: codeBlockStart, end: i});
			}
		}
		if (/^%%/.test(trimmed)) {
			if (!inComment) {
				inComment = true;
				commentLines.push({start: i, end: -1});
			} else {
				inComment = false;
				commentLines[commentLines.length - 1].end = i;
			}
		}
	}

	// Pour chaque ligne, chercher les liens hors blocs de code et hors commentaires
	for (let i = 0; i < lines.length; i++) {
		// Vérifier si la ligne est dans un bloc de code ou un commentaire
		let inBlock = false;
		for (const block of codeBlockLines) {
			if (i >= block.start && i <= block.end) { inBlock = true; break; }
		}
		for (const block of commentLines) {
			if (block.end !== -1 && i >= block.start && i <= block.end) { inBlock = true; break; }
		}
		if (inBlock) continue;

		let line = lines[i];
		let lineMatch;
		while ((lineMatch = internalLinkRegex.exec(line)) !== null) {
			const fullMatch = lineMatch[0];
			const noteName = lineMatch[1].trim();
			const sectionIndicator = lineMatch[2];
			const sectionName = lineMatch[3];
			const blockIndicator = lineMatch[4];
			const blockId = lineMatch[5];
			const displayText = lineMatch[6];

			const embed = embedAnchors[noteName.toLowerCase()];
			if (embed) {
				if (!sectionIndicator && !blockIndicator) {
					const anchor = `^${noteName.replace(/_/g, '-')}`;
					const textLabel = displayText || noteName;
					lines[i] = lines[i].replace(fullMatch, `[[#${anchor}|${textLabel}]]`);
					continue;
				}
				if (sectionIndicator && sectionName) {
					const anchor = sectionName.replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase();
					if (embed.sections.includes(anchor)) {
						const textLabel = displayText || sectionName;
						lines[i] = lines[i].replace(fullMatch, `[[#${anchor}|${textLabel}]]`);
						continue;
					}
				}
				if (blockIndicator && blockId) {
					const anchor = '^' + blockId.replace(/_/g, '-');
					if (embed.blocks.includes(blockId.replace(/_/g, '-'))) {
						const textLabel = displayText || blockId;
						lines[i] = lines[i].replace(fullMatch, `[[#${anchor}|${textLabel}]]`);
						continue;
					}
				}
			}
			if (!includedFiles.has(noteName.toLowerCase()) && !hiddenIncludedFiles.has(noteName.toLowerCase())) {
				try {
					const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
					if (linkedFile) {
						let linkedContent = await app.vault.read(linkedFile);
						if (!linkedContent || linkedContent.trim() === '') {
							linkedContent = `<!-- Contenu vide ou non trouvé pour '${noteName}' -->`;
						}
						const commentBlock = `\n%%\n%% EMBED HIDDEN: ${noteName} %%\n${linkedContent}\n%% END EMBED HIDDEN %%\n%%\n`;
						// Insérer avant la ligne, toujours isolé
						let insertCharIndex = 0;
						if (i === 0) { insertCharIndex = 0; }
						else {
							let sum = 0;
							for (let j = 0; j < i; j++) sum += lines[j].length + 1;
							insertCharIndex = sum;
						}
						insertions.push({index: insertCharIndex, content: commentBlock});
						hiddenIncludedFiles.add(noteName.toLowerCase());
					}
				} catch (err) {}
			}
			const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
			if (linkedFile && !linkedFile.path.startsWith('http') && !linkedFile.path.startsWith('/')) {
				const textLabel = displayText || noteName;
				lines[i] = lines[i].replace(fullMatch, `[[${noteName}|${textLabel}]]`);
			} else {
				const textLabel = displayText || noteName;
				lines[i] = lines[i].replace(fullMatch, `[[${noteName}|${textLabel}]]`);
			}
		}
	}
	// Appliquer les insertions en partant de la fin
	insertions.sort((a, b) => b.index - a.index);
	let joined = lines.join('\n');
	for (const ins of insertions) {
		joined = joined.slice(0, ins.index) + ins.content + joined.slice(ins.index);
	}
	return joined;
}

// Traitement des images (![[image]])
async function processImages(text: string): Promise<string> {
	const imageRegex = /!\[\[([^\]#|^]+)(?:(#)([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
	let processedText = text;
	let match;
	
	while ((match = imageRegex.exec(text)) !== null) {
		const fullMatch = match[0];
		let imageName = match[1].trim();
		const sectionIndicator = match[2];
		const sectionName = match[3];
		const altText = match[4];

		// Correction : s'assurer que imageName garde son extension originale
		// Si imageName se termine par .md mais que ce n'est pas une image, on ne touche pas
		// Si imageName est une image, on ne modifie jamais l'extension
		const imageExtRegex = /\.(png|jpg|jpeg|gif|svg|bmp|webp)$/i;
		if (!imageExtRegex.test(imageName)) {
			// Si ce n'est pas une image, on laisse tel quel
		} else {
			// Si c'est une image, on s'assure de ne jamais ajouter .md
			imageName = imageName.replace(/\.md$/i, '');
		}
		try {
			const imageFile = app.metadataCache.getFirstLinkpathDest(imageName, '');
			if (imageFile) {
				// Chemin Obsidian (toujours relatif à la racine du vault, sans ../)
				const obsidianPath = imageFile.path.replace(/\\/g, '/');
				let newImage = `![[${obsidianPath}`;
				if (sectionIndicator && sectionName) {
					newImage += `#${sectionName}`;
				}
				if (altText) {
					newImage += `|${altText}`;
				}
				newImage += ']]';
				processedText = processedText.replace(fullMatch, newImage);
			} else {
				processedText = processedText.replace(fullMatch, `![[${imageName}]]`);
			}
		} catch (err) {
			processedText = processedText.replace(fullMatch, `![[${imageName}]]`);
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
	// Tolérance : ignore la casse, espaces, tirets, underscores
	const normalizedSection = sectionName.trim().toLowerCase().replace(/[-_\s]+/g, '');
	let inSection = false;
	const sectionContent: string[] = [];
	let currentLevel = 0;
	let found = false;

	for (const line of lines) {
		const headingMatch = line.match(/^(#+)\s*(.*)$/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const headingText = headingMatch[2].trim().toLowerCase().replace(/[-_\s]+/g, '');
			if (headingText === normalizedSection) {
				inSection = true;
				currentLevel = level;
				sectionContent.push(line);
				found = true;
			} else if (inSection && level <= currentLevel) {
				inSection = false;
			}
		}
		if (inSection) sectionContent.push(line);
	}

	if (found && sectionContent.length > 0) {
		return sectionContent.join('\n');
	} else {
		// Fallback : insérer tout le contenu avec un commentaire d'avertissement
		return `<!-- Section '${sectionName}' non trouvée, insertion du contenu complet de la note -->\n` + content;
	}
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

function extractTableContent(content: string): string {
	const lines = content.split('\n');
	let result: string[] = [];
	// Cherche la ligne '=this.caption' si elle existe
	const captionIdx = lines.findIndex(line => line.trim().startsWith('=this.caption'));
	if (captionIdx !== -1) {
		result.push(lines[captionIdx]);
	}
	// Cherche la première ligne de tableau
	const startIdx = lines.findIndex(line => line.trim().startsWith('|'));
	if (startIdx === -1) return '<!-- Table markdown non trouvé -->';
	// Ajoute toutes les lignes du tableau jusqu'à la première ligne vide ou la fin
	for (let i = startIdx; i < lines.length; i++) {
		if (lines[i].trim() === '') break;
		result.push(lines[i]);
	}
	return result.join('\n');
}

function extractFigureContent(content: string): string {
	const lines = content.split('\n');
	let result: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes('![[')) {
			// Ajoute la ligne précédente si c'est une caption
			if (i > 0 && lines[i-1].trim().startsWith('caption')) {
				result.push(lines[i-1]);
			}
			result.push(lines[i]);
		}
	}
	if (result.length === 0) return '<!-- Figure/image non trouvée -->';
	return result.join('\n');
}

// Ajoute un suffixe -comb aux titres et blocs dans le contenu inclus
function suffixIdsForCombined(content: string): string {
	// Ne plus rien ajouter
	return content;
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