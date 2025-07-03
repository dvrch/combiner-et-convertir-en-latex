import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import CombinerApp from './components/CombinerApp.svelte';

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