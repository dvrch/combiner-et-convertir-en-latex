<script lang="ts">
import { App } from 'obsidian';
import MarkdownProcessor from './MarkdownProcessor.svelte';
import FileManager from './FileManager.svelte';
import ConfigManager from './ConfigManager.svelte';

export let plugin: any;

// Composants spécialisés
let markdownProcessor: MarkdownProcessor;
let fileManager: FileManager;
let configManager: ConfigManager;

// État global
let isProcessing = false;
let status = 'Prêt';
let currentConfig: any = null;

// Initialiser la configuration
async function initializeConfig() {
	configManager = new ConfigManager({
		target: document.createElement('div'), // Composant virtuel
		props: {}
	});
	
	currentConfig = await configManager.loadConfig(plugin);
}

// Méthode principale exposée pour le plugin
export async function combineFiles() {
	if (isProcessing) return;
	
	const { app } = plugin;
	
	isProcessing = true;
	status = 'Initialisation...';
	
	try {
		// Initialiser la configuration
		await initializeConfig();
		
		// Initialiser les composants spécialisés
		markdownProcessor = new MarkdownProcessor({
			target: document.createElement('div'), // Composant virtuel
			props: { 
				app: app,
				basePath: '', // Sera défini plus tard
				config: currentConfig
			}
		});
		
		fileManager = new FileManager({
			target: document.createElement('div'), // Composant virtuel
			props: { 
				app: app,
				config: currentConfig
			}
		});
		
		// Étape 1: Gestion du fichier
		const fileData = await fileManager.handleFileCombination();
		if (!fileData) {
			status = 'Aucun fichier valide sélectionné';
			return;
		}
		
		const { originalContent, fileInfo, activeFile } = fileData;
		
		// Mettre à jour le chemin de base pour le processeur Markdown
		markdownProcessor.$set({ basePath: fileInfo.parentPath });
		
		// Étape 2: Traitement du contenu Markdown
		status = 'Traitement du contenu...';
		const processedContent = await markdownProcessor.processMarkdown(originalContent);
		
		// Étape 3: Finalisation de la création du fichier
		status = 'Création du fichier final...';
		await fileManager.finalizeFileCreation(fileInfo, processedContent);
		
		status = 'Terminé avec succès !';
		
		// Afficher la notification si configuré
		if (currentConfig.showNotifications) {
			app.workspace.trigger('notice', `Fichier combiné créé : ${fileInfo.newFileName}`);
		}
		
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		if (currentConfig?.showNotifications) {
			app.workspace.trigger('notice', `Erreur lors de la combinaison : ${errorMessage}`);
		}
		
		status = 'Erreur : ' + errorMessage;
	} finally {
		isProcessing = false;
		
		// Nettoyer les composants
		if (markdownProcessor) {
			markdownProcessor.$destroy();
		}
		if (fileManager) {
			fileManager.$destroy();
		}
		if (configManager) {
			configManager.$destroy();
		}
	}
}

// Méthode pour réinitialiser l'état
export function resetState() {
	isProcessing = false;
	status = 'Prêt';
	
	if (markdownProcessor) {
		markdownProcessor.resetState();
	}
	if (fileManager) {
		fileManager.resetFileStatus();
	}
	if (configManager) {
		configManager.resetConfigStatus();
	}
}

// Méthode pour obtenir la configuration actuelle
export function getConfig() {
	return currentConfig;
}
</script>

<!-- Ce composant n'a plus d'interface utilisateur, il est purement logique --> 