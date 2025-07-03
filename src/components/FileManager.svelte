<script lang="ts">
import { App, TFile } from 'obsidian';

export let app: App;
export let config: any = null;

// Interface pour les informations de fichier
interface FileInfo {
	originalFile: TFile;
	newFileName: string;
	parentPath: string;
	fullPath: string;
}

// État de la gestion des fichiers
let fileStatus = '';

// Générer un nom de fichier unique
async function getUniqueFileName(baseName: string, parentPath: string): Promise<string> {
	let counter = 1;
	const prefix = config?.combinedFilePrefix || '';
	const suffix = config?.combinedFileSuffix || '-combined';
	let newFileName = `${prefix}${baseName}${suffix}.md`;
	
	while (await app.vault.adapter.exists(`${parentPath}/${newFileName}`)) {
		newFileName = `${prefix}${baseName}${suffix}-${counter}.md`;
		counter++;
	}
	return newFileName;
}

// Valider le fichier actif
function validateActiveFile(): TFile | null {
	const activeFile = app.workspace.getActiveFile();
	
	if (!activeFile || activeFile.extension !== 'md' || !activeFile.parent) {
		app.workspace.trigger('notice', 'Aucun fichier Markdown valide sélectionné.');
		return null;
	}
	
	return activeFile;
}

// Préparer les informations du fichier combiné
async function prepareFileInfo(originalFile: TFile): Promise<FileInfo> {
	const parentPath = originalFile.parent?.path || '';
	const baseName = originalFile.basename;
	const newFileName = await getUniqueFileName(baseName, parentPath);
	const fullPath = `${parentPath}/${newFileName}`;
	
	return {
		originalFile,
		newFileName,
		parentPath,
		fullPath
	};
}

// Créer le fichier combiné
async function createCombinedFile(fileInfo: FileInfo, content: string): Promise<TFile> {
	fileStatus = 'Création du fichier...';
	
	try {
		await app.vault.create(fileInfo.fullPath, content);
		fileStatus = 'Fichier créé avec succès';
		
		const newFile = app.vault.getAbstractFileByPath(fileInfo.fullPath);
		if (newFile && newFile instanceof TFile) {
			return newFile;
		} else {
			throw new Error('Impossible de récupérer le fichier créé');
		}
	} catch (error) {
		fileStatus = 'Erreur lors de la création du fichier';
		throw error;
	}
}

// Ouvrir le fichier dans un nouveau volet
async function openFileInNewPane(file: TFile): Promise<void> {
	// Vérifier si l'ouverture automatique est activée
	if (config && config.openFileAfterCreation === false) {
		return;
	}
	
	try {
		const leaf = app.workspace.getLeaf('split', 'vertical');
		await leaf.openFile(file);
		app.workspace.trigger('notice', `Fichier combiné ouvert : ${file.name}`);
	} catch (error) {
		app.workspace.trigger('notice', `Erreur lors de l'ouverture du fichier : ${error}`);
	}
}

// Lire le contenu du fichier original
async function readOriginalFile(file: TFile): Promise<string> {
	fileStatus = 'Lecture du fichier original...';
	
	try {
		const content = await app.vault.read(file);
		fileStatus = 'Fichier lu avec succès';
		return content;
	} catch (error) {
		fileStatus = 'Erreur lors de la lecture du fichier';
		throw error;
	}
}

// Méthode principale pour gérer le processus complet
export async function handleFileCombination(): Promise<{originalContent: string, fileInfo: FileInfo, activeFile: TFile} | null> {
	fileStatus = 'Début du processus...';
	
	// Valider le fichier actif
	const activeFile = validateActiveFile();
	if (!activeFile) return null;
	
	try {
		// Lire le contenu original
		const originalContent = await readOriginalFile(activeFile);
		
		// Préparer les informations du fichier
		const fileInfo = await prepareFileInfo(activeFile);
		
		// Retourner les informations pour traitement
		return {
			originalContent,
			fileInfo,
			activeFile
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		app.workspace.trigger('notice', `Erreur : ${errorMessage}`);
		fileStatus = 'Erreur : ' + errorMessage;
		throw error;
	}
}

// Méthode pour finaliser la création du fichier
export async function finalizeFileCreation(fileInfo: FileInfo, processedContent: string): Promise<TFile> {
	try {
		const newFile = await createCombinedFile(fileInfo, processedContent);
		await openFileInNewPane(newFile);
		return newFile;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		app.workspace.trigger('notice', `Erreur lors de la création du fichier combiné : ${errorMessage}`);
		throw error;
	}
}

// Méthode pour réinitialiser l'état
export function resetFileStatus(): void {
	fileStatus = '';
}
</script>

<!-- Ce composant n'a pas d'interface utilisateur, il est purement logique --> 