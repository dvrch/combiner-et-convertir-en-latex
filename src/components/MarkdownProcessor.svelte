<script>
	export let app;
	export let basePath = '';
	export let settings = {};
	export let config = null;
	export let combinedFileName = '';
	
	// État du traitement
	let processedFiles = new Set();
	let processingStatus = '';
	
	// Liste globale des fichiers inclus dans le combiné
	let includedFiles = new Set();
	
	// Table des fichiers inclus comme embed et leurs sections/blocs
	let embedAnchors = {};
	
	// Ajout d'un set pour les fichiers cachés déjà insérés
	let hiddenIncludedFiles = new Set();
	
	function extractAnchorsFromContent(file, content) {
		// Titres
		const sectionAnchors = [];
		const blockAnchors = [];
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
	async function processEmbeddedLinks(text) {
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
					processedText = processedText.replace(fullMatch, `\n${startComment}${recursivelyProcessed}${endComment}`);
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
	// Nouvelle version de processInternalLinks : insertion du bloc caché juste avant la ligne du lien
	async function processInternalLinks(text) {
		// Regex modifiée pour ne pas matcher les liens qui commencent déjà par [[#
		const internalLinkRegex = /\[\[(?!\#)([^\]#|^/]+)(?:(#)([^\]|]+))?(?:(\^)([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
		
		// Découper le texte en lignes pour repérer les blocs de code
		const lines = text.split('\n');
		let inCodeBlock = false;
		let codeBlockStart = -1;
	
		// Repérer les blocs de code (``` ou ~~~)
		const codeBlockLines = [];
		for (let i = 0; i < lines.length; i++) {
			if (/^(```|~~~)/.test(lines[i].trim())) {
				if (!inCodeBlock) {
					inCodeBlock = true;
					codeBlockStart = i;
				} else {
					inCodeBlock = false;
					codeBlockLines.push({start: codeBlockStart, end: i});
				}
			}
		}
	
		// On va construire un nouveau tableau de lignes avec les blocs cachés insérés au bon endroit
		let newLines = [];
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			let match;
			
			// Ne pas traiter les liens dans les blocs de code
			let inBlock = false;
			for (const block of codeBlockLines) {
				if (i >= block.start && i <= block.end) {
					inBlock = true;
					break;
				}
			}
			if (inBlock) {
				newLines.push(line);
				continue;
			}

			while ((match = internalLinkRegex.exec(line)) !== null) {
				const fullMatch = match[0];
				const noteName = match[1].trim();
				const sectionIndicator = match[2];
				const sectionName = match[3];
				const blockIndicator = match[4];
				const blockId = match[5];
				const displayText = match[6];
	
				// Si c'est une image, ne rien modifier
				if (/\.(png|jpg|jpeg|gif|svg|bmp|webp)$/i.test(noteName)) {
					continue;
				}
	
				const embed = embedAnchors[noteName.toLowerCase()];
				if (embed) {
					if (!sectionIndicator && !blockIndicator) {
						const anchor = `^${noteName.replace(/_/g, '-')}`;
						const textLabel = displayText || noteName;
						line = line.replace(fullMatch, `[[#${anchor}|${textLabel}]]`);
						continue;
					}
					if (sectionIndicator && sectionName) {
						const anchor = sectionName.replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase();
						if (embed.sections.includes(anchor)) {
							const textLabel = displayText || sectionName;
							line = line.replace(fullMatch, `[[#${anchor}|${textLabel}]]`);
							continue;
						}
					}
					if (blockIndicator && blockId) {
						const anchor = '^' + blockId.replace(/_/g, '-');
						if (embed.blocks.includes(blockId.replace(/_/g, '-'))) {
							const textLabel = displayText || blockId;
							line = line.replace(fullMatch, `[[#${anchor}|${textLabel}]]`);
							continue;
						}
					}
				}
				if (settings.useHiddenEmbeds && !includedFiles.has(noteName.toLowerCase()) && !hiddenIncludedFiles.has(noteName.toLowerCase())) {
					try {
						const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
						if (linkedFile) {
							let linkedContent = await app.vault.read(linkedFile);
							if (!linkedContent || linkedContent.trim() === '') {
								linkedContent = `<!-- Contenu vide ou non trouvé pour '${noteName}' -->`;
							}
							// Bloc isolé avec lignes vides avant et après
							const commentBlock = `%%EMBED HIDDEN START: [[${noteName}]] \n${linkedContent}\nEMBED HIDDEN END %%`;
							// Insérer le bloc caché juste avant la ligne courante
							newLines.push(commentBlock);
							hiddenIncludedFiles.add(noteName.toLowerCase());
						}
					} catch (err) {}
				}
				const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
				if (linkedFile && !linkedFile.path.startsWith('http') && !linkedFile.path.startsWith('/')) {
					const textLabel = displayText || noteName;
					line = line.replace(fullMatch, `[[${noteName}|${textLabel}]]`);
				} else {
					const textLabel = displayText || noteName;
					line = line.replace(fullMatch, `[[${noteName}|${textLabel}]]`);
				}
			}
			// reset regex lastIndex for next match in next line
			internalLinkRegex.lastIndex = 0;
			newLines.push(line);
		}
		return newLines.join('\n');
	}
	
	// Traitement des images (![[image]])
	async function processImages(text) {
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
	function processExternalLinks(text) {
		// Les liens externes sont généralement bien gérés par Obsidian
		// On peut les laisser tels quels
		return text;
	}
	
	// Fonction pour préserver les blocs mathématiques
	function preserveMathBlocks(text) {
		const mathBlocks = [];
		let blockCounter = 0;
		
		// Remplacer les blocs $$ par des placeholders
		const preservedText = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
			const placeholder = `__MATH_BLOCK_${blockCounter}__`;
			mathBlocks[blockCounter] = match;
			blockCounter++;
			return placeholder;
		});
		
		return { text: preservedText, mathBlocks };
	}
	
	// Fonction pour restaurer les blocs mathématiques
	function restoreMathBlocks(text, mathBlocks) {
		let restoredText = text;
		mathBlocks.forEach((block, index) => {
			restoredText = restoredText.replace(`__MATH_BLOCK_${index}__`, block);
		});
		return restoredText;
	}
	
	// Fonction principale qui traite tous les types de liens
	async function processAllLinks(text, currentPath) {
		// Préserver les blocs mathématiques
		const { text: preservedText, mathBlocks } = preserveMathBlocks(text);
		
		let processedText = preservedText;
		
		// Traitement dans l'ordre : embarqués, internes, images, externes
		processedText = await processEmbeddedLinks(processedText);
		processedText = await processInternalLinks(processedText);
		processedText = await processImages(processedText);
		processedText = processExternalLinks(processedText);
		
		// Restaurer les blocs mathématiques
		return restoreMathBlocks(processedText, mathBlocks);
	}
	
	// Fonction pour calculer le chemin relatif entre deux fichiers
	function getRelativePath(fromPath, toPath) {
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
	
	function extractSection(content, sectionName) {
		const lines = content.split('\n');
		// Tolérance : ignore la casse, espaces, tirets, underscores
		const normalizedSection = sectionName.trim().toLowerCase().replace(/[-_\s]+/g, '');
		let inSection = false;
		const sectionContent = [];
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
	
	function extractBlock(content, blockId) {
		const lines = content.split('\n');
		const blockRegex = new RegExp(`\\s\\^${blockId}$`);
		
		for (let i = 0; i < lines.length; i++) {
			if (blockRegex.test(lines[i])) {
				return lines[i].replace(blockRegex, '').trim();
			}
		}
		return '';
	}
	
	function extractTableContent(content) {
		const lines = content.split('\n');
		let result = [];
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
	
	function extractFigureContent(content) {
		const lines = content.split('\n');
		let result = [];
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
	function suffixIdsForCombined(content) {
		// Ne plus rien ajouter
		return content;
	}

	// Fonction utilitaire pour transformer les liens [[nom#^xxx]] en [[#^xxx]] si nom est inclus
	function convertInternalBlockLinksToLocal(text) {
		// Regex : [[nom#^blockid]] ou [[nom#^blockid|texte]]
		return text.replace(/\[\[([^\]#|^/]+)#\^([\w-]+)(?:\|([^\]]+))?\]\]/g, (match, noteName, blockId, displayText) => {
			if (includedFiles.has(noteName.toLowerCase())) {
				if (displayText) {
					return `[[#^${blockId}|${displayText}]]`;
				} else {
					return `[[#^${blockId}]]`;
				}
			}
			return match;
		});
	}
	
	// Méthode exposée pour traiter le contenu Markdown
	export async function processMarkdown(content) {
		processingStatus = 'Traitement des liens...';
		processedFiles.clear();
		includedFiles.clear();
		hiddenIncludedFiles.clear();
		embedAnchors = {};
		
		try {
			let result = await processAllLinks(content, basePath);
			// Conversion des liens de blocs internes en liens locaux si inclus
			result = convertInternalBlockLinksToLocal(result);
			processingStatus = 'Traitement terminé';
			return result;
		} catch (error) {
			processingStatus = 'Erreur lors du traitement';
			throw error;
		}
	}
	
	// Méthode pour réinitialiser l'état
	export function resetState() {
		processedFiles.clear();
		processingStatus = '';
		includedFiles.clear();
		hiddenIncludedFiles.clear();
		embedAnchors = {};
	}
</script>

<!-- Ce composant n'a pas d'interface utilisateur, il est purement logique --> 