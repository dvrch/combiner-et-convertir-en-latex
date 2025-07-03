import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';
import MarkdownProcessor from './components/MarkdownProcessor.svelte';

let combinerModal: HTMLElement | null = null;

export default class CombinerPlugin extends Plugin {
  async onload() {
    // Commande : combiner la note active
    this.addCommand({
      id: 'combiner-note-active',
      name: 'Combiner la note active',
      callback: async () => {
        // Ouvre l'UI Svelte pour combiner la note active
        this.openCombinerApp();
      },
    });

    // Commande : combiner la note active (direct, sans UI)
    this.addCommand({
      id: 'combiner-note-active-direct',
      name: 'Combiner la note active (direct)',
      callback: async () => {
        try {
          const activeFile = this.app.workspace.getActiveFile();
          if (!activeFile) {
            new Notice('Aucun fichier actif trouvé.');
            return;
          }
          if (!activeFile.parent) {
            new Notice('Impossible de déterminer le dossier parent du fichier actif.');
            return;
          }
          const content = await this.app.vault.read(activeFile);
          // Instancier MarkdownProcessor en mode logique (sans UI)
          const processor = new MarkdownProcessor({
            target: document.createElement('div'),
            props: { app: this.app }
          });
          const combinedContent = await processor.processMarkdown(content);
          // Générer un nom unique
          let baseName = activeFile.basename + '-combine.md';
          let fileName = baseName;
          let counter = 1;
          while (await this.app.vault.adapter.exists(activeFile.parent.path + '/' + fileName)) {
            fileName = activeFile.basename + '-combine-' + counter + '.md';
            counter++;
          }
          const newFile = await this.app.vault.create(activeFile.parent.path + '/' + fileName, combinedContent);
          await this.app.workspace.getLeaf('split', 'vertical').openFile(newFile);
          new Notice('Fichier combiné créé : ' + fileName);
        } catch (e) {
          new Notice('Erreur lors de la combinaison : ' + (e?.message || e));
        }
      }
    });

    // Commande : ouvrir l'UI manuelle
    this.addCommand({
      id: 'ouvrir-ui-combinaison',
      name: "Ouvrir l'interface de combinaison manuelle",
      callback: () => {
        this.openCombinerApp(true);
      },
    });
  }

  onunload() {
    if (combinerModal) {
      combinerModal.remove();
      combinerModal = null;
    }
  }

  openCombinerApp(isManual = false) {
    if (combinerModal) {
      combinerModal.remove();
    }
    combinerModal = document.createElement('div');
    combinerModal.className = 'combiner-modal';
    Object.assign(combinerModal.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '10000',
      background: 'white',
      border: '2px solid #ccc',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(combinerModal);
    new CombinerApp({
      target: combinerModal,
      props: {
        app: this.app,
        plugin: this,
        isDebug: false,
        showManualUI: isManual
      }
    });
  }
} 
