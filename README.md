# Obsidian Markdown Combiner Plugin

Un plugin Obsidian qui combine récursivement le contenu d'un fichier Markdown principal avec ses fichiers Markdown liés (embeds) en un seul fichier consolidé.

## 🚀 Fonctionnalités

- **Combinaison récursive** : Traite automatiquement les liens embarqués (`![[note]]`) et les inclut dans le fichier final
- **Gestion complète des liens** : Supporte les liens internes, images, et sections
- **Architecture modulaire** : Composants Svelte spécialisés pour une maintenance facile
- **Configuration flexible** : Paramètres personnalisables pour le traitement et la sortie
- **Logging avancé** : Suivi détaillé des opérations et statistiques de traitement

## 📁 Architecture

Le plugin utilise une architecture modulaire basée sur des composants Svelte spécialisés :

### Composants principaux

- **`CombinerApp.svelte`** : Orchestrateur principal qui coordonne tous les composants
- **`MarkdownProcessor.svelte`** : Traitement spécialisé du contenu Markdown et des liens
- **`FileManager.svelte`** : Gestion des fichiers, noms et opérations de fichiers
- **`ConfigManager.svelte`** : Gestion de la configuration et des paramètres
- **`LogManager.svelte`** : Logging et suivi des statistiques de traitement

### Structure des fichiers

```
src/
├── components/
│   ├── CombinerApp.svelte      # Composant principal (orchestrateur)
│   ├── MarkdownProcessor.svelte # Traitement Markdown et liens
│   ├── FileManager.svelte      # Gestion des fichiers
│   ├── ConfigManager.svelte    # Configuration du plugin
│   └── LogManager.svelte       # Logging et statistiques
├── main.ts                     # Point d'entrée du plugin
└── svelte.d.ts                 # Types Svelte
```

## 🛠️ Installation

1. Clonez ce dépôt dans votre dossier de plugins Obsidian
2. Installez les dépendances : `pnpm install`
3. Compilez le plugin : `pnpm run build`
4. Activez le plugin dans Obsidian

## 📖 Utilisation

### Méthode 1 : Commande
1. Ouvrez un fichier Markdown dans Obsidian
2. Utilisez la commande `Combiner les fichiers Markdown avec les embeds` (Ctrl/Cmd + P)
3. Le fichier combiné sera créé dans le même dossier

### Méthode 2 : Bouton Ribbon
1. Cliquez sur l'icône de lien dans la barre latérale
2. Le fichier actif sera automatiquement combiné

## ⚙️ Configuration

Le plugin offre plusieurs options de configuration :

### Paramètres de traitement
- `processEmbeddedLinks` : Traiter les liens embarqués (`![[note]]`)
- `processInternalLinks` : Traiter les liens internes (`[[note]]`)
- `processImages` : Traiter les images (`![[image]]`)
- `processExternalLinks` : Traiter les liens externes
- `maxRecursionDepth` : Profondeur maximale de récursion (1-50)

### Paramètres de nommage
- `combinedFilePrefix` : Préfixe pour les fichiers combinés
- `combinedFileSuffix` : Suffixe pour les fichiers combinés (défaut: `-combined`)

### Paramètres d'affichage
- `showNotifications` : Afficher les notifications
- `openFileAfterCreation` : Ouvrir automatiquement le fichier créé

## 🔧 Développement

### Prérequis
- Node.js 16+
- pnpm
- Obsidian

### Scripts disponibles

```bash
# Installation des dépendances
pnpm install

# Développement avec hot reload
pnpm run dev

# Build de production
pnpm run build

# Vérification du code
pnpm run lint

# Tests (si configurés)
pnpm run test
```

### Architecture des composants

Chaque composant a une responsabilité spécifique :

1. **CombinerApp** : Orchestration du processus complet
2. **MarkdownProcessor** : Parsing et traitement du contenu Markdown
3. **FileManager** : Opérations sur les fichiers et gestion des noms
4. **ConfigManager** : Chargement/sauvegarde de la configuration
5. **LogManager** : Suivi des opérations et statistiques

### Ajout de nouvelles fonctionnalités

Pour ajouter une nouvelle fonctionnalité :

1. Créez un nouveau composant Svelte dans `src/components/`
2. Définissez clairement ses responsabilités
3. Intégrez-le dans `CombinerApp.svelte`
4. Ajoutez les tests appropriés

## 📝 Logs et Debugging

Le plugin inclut un système de logging complet :

- **Logs d'information** : Suivi des opérations normales
- **Logs d'avertissement** : Problèmes non critiques
- **Logs d'erreur** : Erreurs de traitement
- **Statistiques** : Métriques de performance

Les logs peuvent être exportés au format JSON pour analyse.

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :

1. Forker le projet
2. Créer une branche pour votre fonctionnalité
3. Suivre les conventions de code existantes
4. Ajouter des tests si approprié
5. Soumettre une pull request

## 📄 Licence

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

Pour signaler un bug ou demander une fonctionnalité, veuillez créer une issue sur GitHub.
