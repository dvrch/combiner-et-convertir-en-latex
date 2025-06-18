<script>
export let plugin;

// Interface utilisateur simple pour le plugin
let status = 'Prêt';
let isProcessing = false;

// Fonction pour déclencher la combinaison depuis l'interface
async function triggerCombine() {
  if (isProcessing) return;
  
  isProcessing = true;
  status = 'Traitement en cours...';
  
  try {
    await plugin.combineMarkdownFiles();
    status = 'Terminé !';
  } catch (error) {
    status = 'Erreur : ' + error.message;
  } finally {
    isProcessing = false;
  }
}
</script>

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