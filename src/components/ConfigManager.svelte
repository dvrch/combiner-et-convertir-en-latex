<script lang="ts">
// Interface pour les configurations du plugin
interface PluginConfig {
	// Paramètres de traitement
	processEmbeddedLinks: boolean;
	processInternalLinks: boolean;
	processImages: boolean;
	processExternalLinks: boolean;
	
	// Paramètres de nommage
	combinedFilePrefix: string;
	combinedFileSuffix: string;
	
	// Paramètres d'affichage
	showNotifications: boolean;
	openFileAfterCreation: boolean;
	
	// Paramètres de traitement
	maxRecursionDepth: number;
	preserveOriginalLinks: boolean;
}

// Configuration par défaut
const defaultConfig: PluginConfig = {
	processEmbeddedLinks: true,
	processInternalLinks: true,
	processImages: true,
	processExternalLinks: false,
	combinedFilePrefix: '',
	combinedFileSuffix: '-combined',
	showNotifications: true,
	openFileAfterCreation: true,
	maxRecursionDepth: 10,
	preserveOriginalLinks: true
};

// État de la configuration
let currentConfig: PluginConfig = { ...defaultConfig };
let configStatus = '';

// Charger la configuration depuis le stockage
export async function loadConfig(plugin: any): Promise<PluginConfig> {
	configStatus = 'Chargement de la configuration...';
	
	try {
		const savedConfig = await plugin.loadData();
		if (savedConfig) {
			currentConfig = { ...defaultConfig, ...savedConfig };
		} else {
			currentConfig = { ...defaultConfig };
		}
		
		configStatus = 'Configuration chargée';
		return currentConfig;
	} catch (error) {
		configStatus = 'Erreur lors du chargement de la configuration';
		console.error('Erreur de chargement de configuration:', error);
		return defaultConfig;
	}
}

// Sauvegarder la configuration
export async function saveConfig(plugin: any, config: PluginConfig): Promise<void> {
	configStatus = 'Sauvegarde de la configuration...';
	
	try {
		await plugin.saveData(config);
		currentConfig = { ...config };
		configStatus = 'Configuration sauvegardée';
	} catch (error) {
		configStatus = 'Erreur lors de la sauvegarde de la configuration';
		console.error('Erreur de sauvegarde de configuration:', error);
		throw error;
	}
}

// Mettre à jour une partie de la configuration
export async function updateConfig(plugin: any, updates: Partial<PluginConfig>): Promise<void> {
	const newConfig = { ...currentConfig, ...updates };
	await saveConfig(plugin, newConfig);
}

// Réinitialiser la configuration aux valeurs par défaut
export async function resetConfig(plugin: any): Promise<void> {
	await saveConfig(plugin, defaultConfig);
}

// Obtenir la configuration actuelle
export function getCurrentConfig(): PluginConfig {
	return { ...currentConfig };
}

// Valider la configuration
export function validateConfig(config: PluginConfig): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];
	
	if (config.maxRecursionDepth < 1 || config.maxRecursionDepth > 50) {
		errors.push('La profondeur de récursion doit être entre 1 et 50');
	}
	
	if (config.combinedFileSuffix.length > 50) {
		errors.push('Le suffixe du fichier ne peut pas dépasser 50 caractères');
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}

// Méthode pour réinitialiser l'état
export function resetConfigStatus(): void {
	configStatus = '';
}
</script>

<!-- Ce composant n'a pas d'interface utilisateur, il est purement logique --> 