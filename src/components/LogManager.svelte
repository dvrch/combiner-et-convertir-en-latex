<script lang="ts">
// Interface pour les entrées de log
interface LogEntry {
	timestamp: Date;
	level: 'info' | 'warning' | 'error' | 'success';
	message: string;
	details?: any;
}

// Interface pour les statistiques de traitement
interface ProcessingStats {
	filesProcessed: number;
	linksProcessed: number;
	imagesProcessed: number;
	errorsCount: number;
	processingTime: number;
}

// État du gestionnaire de logs
let logs: LogEntry[] = [];
let stats: ProcessingStats = {
	filesProcessed: 0,
	linksProcessed: 0,
	imagesProcessed: 0,
	errorsCount: 0,
	processingTime: 0
};
let startTime: Date | null = null;

// Ajouter une entrée de log
export function addLog(level: LogEntry['level'], message: string, details?: any): void {
	const entry: LogEntry = {
		timestamp: new Date(),
		level,
		message,
		details
	};
	
	logs.push(entry);
	
	// Limiter le nombre de logs en mémoire
	if (logs.length > 100) {
		logs = logs.slice(-50);
	}
}

// Méthodes de convenance pour différents niveaux de log
export function logInfo(message: string, details?: any): void {
	addLog('info', message, details);
}

export function logWarning(message: string, details?: any): void {
	addLog('warning', message, details);
}

export function logError(message: string, details?: any): void {
	addLog('error', message, details);
	stats.errorsCount++;
}

export function logSuccess(message: string, details?: any): void {
	addLog('success', message, details);
}

// Démarrer le suivi des statistiques
export function startProcessing(): void {
	startTime = new Date();
	stats = {
		filesProcessed: 0,
		linksProcessed: 0,
		imagesProcessed: 0,
		errorsCount: 0,
		processingTime: 0
	};
	logInfo('Début du traitement');
}

// Terminer le suivi des statistiques
export function endProcessing(): void {
	if (startTime) {
		const endTime = new Date();
		stats.processingTime = endTime.getTime() - startTime.getTime();
		logSuccess(`Traitement terminé en ${stats.processingTime}ms`);
		startTime = null;
	}
}

// Incrémenter les compteurs
export function incrementFilesProcessed(): void {
	stats.filesProcessed++;
}

export function incrementLinksProcessed(): void {
	stats.linksProcessed++;
}

export function incrementImagesProcessed(): void {
	stats.imagesProcessed++;
}

// Obtenir les statistiques actuelles
export function getStats(): ProcessingStats {
	return { ...stats };
}

// Obtenir les logs récents
export function getRecentLogs(count: number = 10): LogEntry[] {
	return logs.slice(-count);
}

// Obtenir tous les logs
export function getAllLogs(): LogEntry[] {
	return [...logs];
}

// Nettoyer les logs
export function clearLogs(): void {
	logs = [];
}

// Exporter les logs au format JSON
export function exportLogs(): string {
	return JSON.stringify({
		stats,
		logs,
		exportedAt: new Date().toISOString()
	}, null, 2);
}

// Méthode pour réinitialiser l'état
export function resetState(): void {
	logs = [];
	stats = {
		filesProcessed: 0,
		linksProcessed: 0,
		imagesProcessed: 0,
		errorsCount: 0,
		processingTime: 0
	};
	startTime = null;
}
</script>

<!-- Ce composant n'a pas d'interface utilisateur, il est purement logique --> 