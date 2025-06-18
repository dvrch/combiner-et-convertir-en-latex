<script>
import { onMount } from 'svelte';
export let plugin;

// Commande Obsidian
onMount(() => {
  plugin.addCommand({
    id: 'combine-markdown-files',
    name: 'Combiner les fichiers Markdown avec les embeds',
    callback: combineMarkdownFiles
  });
});

// Fonction principale
async function combineMarkdownFiles() {
  const { app } = plugin;
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile || activeFile.extension !== 'md' || !activeFile.parent) {
    app.workspace.trigger('notice', 'Aucun fichier Markdown valide sélectionné.');
    return;
  }
  app.workspace.trigger('notice', `Combinaison de ${activeFile.name}...`);
  const content = await app.vault.read(activeFile);
  const processedContent = await processMarkdown(content, app);
  const parentPath = activeFile.parent.path;
  const baseName = activeFile.basename;
  const newFileName = await getUniqueFileName(app, baseName, parentPath);
  const fullPath = `${parentPath}/${newFileName}`;
  try {
    await app.vault.create(fullPath, processedContent);
    app.workspace.trigger('notice', `Fichier combiné créé : ${fullPath}`);
    // Ouvre dans un volet à droite
    const newFile = app.vault.getAbstractFileByPath(fullPath);
    if (newFile) {
      const leaf = app.workspace.getLeaf('split', 'vertical');
      await leaf.openFile(newFile);
    }
  } catch (e) {
    app.workspace.trigger('notice', `Erreur lors de la création du fichier combiné : ${e?.message || e}`);
  }
}

// Logique de combinaison markdown (pur JS/Svelte)
async function processMarkdown(content, app) {
  const processedFiles = new Set();
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
      if (processedFiles.has(noteName)) continue;
      processedFiles.add(noteName);
      try {
        const linkedFile = app.metadataCache.getFirstLinkpathDest(noteName, '');
        if (linkedFile) {
          let linkedContent = await app.vault.read(linkedFile);
          if (sectionIndicator && sectionName) linkedContent = extractSection(linkedContent, sectionName);
          else if (blockIndicator && blockId) linkedContent = extractBlock(linkedContent, blockId);
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

function extractSection(content, sectionName) {
  const lines = content.split('\n');
  const sectionRegex = new RegExp(`^#+\\s*${sectionName}$`);
  let inSection = false;
  const sectionContent = [];
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

async function getUniqueFileName(app, baseName, parentPath) {
  let counter = 1;
  let newFileName = `${baseName}-combined.md`;
  while (await app.vault.adapter.exists(`${parentPath}/${newFileName}`)) {
    newFileName = `${baseName}-combined-${counter}.md`;
    counter++;
  }
  return newFileName;
}
</script>

<div class="combiner-app">
  <slot />
</div>

<style>
.combiner-app {
  width: 100%;
}
</style> 