import { App, TFile } from 'obsidian';
import type { PluginSettings } from './settings';

export async function combineMarkdownNote(app: App, file: TFile, settings: PluginSettings): Promise<string> {
    // --- Copie simplifiée de la logique de processMarkdown ---
    const processedFiles = new Set<string>();
    const includedFiles = new Set<string>();
    const hiddenIncludedFiles = new Set<string>();
    const embedAnchors: Record<string, {file: string, sections: string[], blocks: string[]}> = {};

    function extractAnchorsFromContent(file: string, content: string) {
        const sectionAnchors: string[] = [];
        const blockAnchors: string[] = [];
        const lines = content.split('\n');
        for (const line of lines) {
            const headingMatch = line.match(/^(#+)\s*(.*)$/);
            if (headingMatch) {
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

    async function processEmbeddedLinks(text: string): Promise<string> {
        const embedRegex = /!\[\[([^\]#|^]+)(?:(#)([^\]|]+))?(?:(\^)([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
        let processedText = text;
        let match;
        while ((match = embedRegex.exec(text)) !== null) {
            const fullMatch = match[0];
            const noteName = match[1].trim();
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
                    extractAnchorsFromContent(noteName, linkedContent);
                    const recursivelyProcessed = await processAllLinks(linkedContent, linkedFile.parent?.path || '');
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

    async function processInternalLinks(text: string): Promise<string> {
        const internalLinkRegex = /\[\[([^\]#|^/]+)(?:(#)([^\]|]+))?(?:(\^)([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
        const lines = text.split('\n');
        let inCodeBlock = false;
        let codeBlockStart = -1;
        const codeBlockLines: {start: number, end: number}[] = [];
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
        const newLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let match;
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
                            const commentBlock = `%%\n%% EMBED HIDDEN START: [[${noteName}]] %%\n${linkedContent}\n%% EMBED HIDDEN END %%\n%%`;
                            newLines.push(commentBlock);
                            hiddenIncludedFiles.add(noteName.toLowerCase());
                        }
                    } catch (err) {/* ignore */}
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
            internalLinkRegex.lastIndex = 0;
            newLines.push(line);
        }
        return newLines.join('\n');
    }

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
            const imageExtRegex = /\.(png|jpg|jpeg|gif|svg|bmp|webp)$/i;
            if (!imageExtRegex.test(imageName)) {
                // rien à faire si ce n'est pas une image
            } else {
                imageName = imageName.replace(/\.md$/i, '');
            }
            try {
                const imageFile = app.metadataCache.getFirstLinkpathDest(imageName, '');
                if (imageFile) {
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
            } catch (err) {/* ignore */}
        }
        return processedText;
    }

    function processExternalLinks(text: string): string {
        return text;
    }

    async function processAllLinks(text: string, currentPath: string): Promise<string> {
        let processedText = text;
        processedText = await processEmbeddedLinks(processedText);
        processedText = await processInternalLinks(processedText);
        processedText = await processImages(processedText);
        processedText = processExternalLinks(processedText);
        return processedText;
    }

    function convertInternalBlockLinksToLocal(text: string): string {
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

    // --- Appel principal ---
    const content = await app.vault.read(file);
    let result = await processAllLinks(content, file.parent?.path || '');
    result = convertInternalBlockLinksToLocal(result);
    return result;
} 