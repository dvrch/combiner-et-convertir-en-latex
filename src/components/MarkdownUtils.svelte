<script lang="ts">
    import { App, TFile } from 'obsidian';

    export async function processMarkdown(content: string, app: App): Promise<string> {
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

                if (processedFiles.has(noteName)) {
                    console.warn(`Circular reference detected, skipping: ${noteName}`);
                    continue;
                }

                processedFiles.add(noteName);

                try {
                    const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
                    if (linkedFile instanceof TFile) {
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
                    console.error(`Error processing link ${fullMatch}:`, err);
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

            if (inSection) {
                sectionContent.push(line);
            }
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

    export async function getUniqueFileName(app: App, baseName: string, parentPath: string): Promise<string> {
        let counter = 1;
        let newFileName = `${baseName}-combined.md`;
        
        while (await app.vault.adapter.exists(`${parentPath}/${newFileName}`)) {
            newFileName = `${baseName}-combined-${counter}.md`;
            counter++;
        }
        
        return newFileName;
    }
</script> 