<script lang="ts">
import { App } from 'obsidian';
import type { PluginSettings } from '../settings';

export let app: App;
export let settings: PluginSettings;
export let markdownContent: string = '';

// État de la conversion
let conversionStatus = '';
let latexOutput = '';

// Configuration LaTeX
const latexConfig = {
    documentClass: 'article',
    packages: [
        'amsmath',
        'amssymb',
        'graphicx',
        'hyperref',
        'geometry',
        'babel',
        'listings'
    ],
    geometry: {
        margin: '2.5cm'
    }
};

// Convertit les titres Markdown en commandes LaTeX
function convertHeadings(text: string): string {
    return text
        .replace(/^#{6}\s+(.+)$/gm, '\\paragraph{$1}')
        .replace(/^#{5}\s+(.+)$/gm, '\\subsubsection{$1}')
        .replace(/^#{4}\s+(.+)$/gm, '\\subsection{$1}')
        .replace(/^#{3}\s+(.+)$/gm, '\\subsection{$1}')
        .replace(/^#{2}\s+(.+)$/gm, '\\section{$1}')
        .replace(/^#{1}\s+(.+)$/gm, '\\section{$1}');
}

// Convertit la mise en forme basique
function convertBasicFormatting(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}')
        .replace(/\*([^*]+)\*/g, '\\textit{$1}')
        .replace(/~~([^~]+)~~/g, '\\sout{$1}')
        .replace(/`([^`]+)`/g, '\\texttt{$1}');
}

// Convertit les liens
function convertLinks(text: string): string {
    // Liens externes
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\\href{$2}{$1}');
    // Liens internes (Obsidian)
    text = text.replace(/\[\[([^\]|]+)\]\]/g, '$1');
    text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
    return text;
}

// Convertit les listes
function convertLists(text: string): string {
    let inList = false;
    let listType = '';
    return text.split('\n').map(line => {
        if (line.match(/^\s*[-*+]\s/)) {
            if (!inList || listType !== 'itemize') {
                inList = true;
                listType = 'itemize';
                return '\\begin{itemize}\n\\item ' + line.replace(/^\s*[-*+]\s/, '');
            }
            return '\\item ' + line.replace(/^\s*[-*+]\s/, '');
        }
        else if (line.match(/^\s*\d+\.\s/)) {
            if (!inList || listType !== 'enumerate') {
                inList = true;
                listType = 'enumerate';
                return '\\begin{enumerate}\n\\item ' + line.replace(/^\s*\d+\.\s/, '');
            }
            return '\\item ' + line.replace(/^\s*\d+\.\s/, '');
        }
        else if (inList && line.trim() === '') {
            inList = false;
            return `\\end{${listType}}\n`;
        }
        return line;
    }).join('\n');
}

// Convertit les blocs de code
function convertCodeBlocks(text: string): string {
    let inCodeBlock = false;
    let language = '';
    return text.split('\n').map(line => {
        const codeBlockStart = line.match(/^```(\w*)$/);
        if (codeBlockStart) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                language = codeBlockStart[1] || 'text';
                return '\\begin{lstlisting}[language=' + language + ']';
            } else {
                inCodeBlock = false;
                return '\\end{lstlisting}';
            }
        }
        if (inCodeBlock) {
            return line.replace(/%/g, '\\%').replace(/_/g, '\\_');
        }
        return line;
    }).join('\n');
}

// Convertit les tables
function convertTables(text: string): string {
    let inTable = false;
    let columnCount = 0;
    return text.split('\n').map(line => {
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            if (!inTable) {
                inTable = true;
                columnCount = (line.match(/\|/g) || []).length - 1;
                return '\\begin{tabular}{' + '|c'.repeat(columnCount) + '|}\n\\hline\n' +
                    line.trim().slice(1, -1).split('|').map(cell => cell.trim()).join(' & ') + ' \\\\n\\hline';
            }
            if (line.trim().match(/^[\|\-:\s]+$/)) {
                return '';
            }
            return line.trim().slice(1, -1).split('|').map(cell => cell.trim()).join(' & ') + ' \\\\n\\hline';
        }
        if (inTable && line.trim() === '') {
            inTable = false;
            return '\\end{tabular}\n';
        }
        return line;
    }).join('\n');
}

// Convertit les équations mathématiques
function convertMath(text: string): string {
    // Inline math
    text = text.replace(/\$([^$]+)\$/g, '\\($1\\)');
    // Display math
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, '\\[\n$1\n\\]');
    return text;
}

// Génère l'en-tête du document LaTeX
function generateLatexHeader(title: string = ''): string {
    return `\\documentclass{${latexConfig.documentClass}}

${latexConfig.packages.map(pkg => `\\usepackage{${pkg}}`).join('\n')}

\\geometry{${Object.entries(latexConfig.geometry).map(([k, v]) => `${k}=${v}`).join(',')}}

\\begin{document}

${title ? `\\title{${title}}\n\\maketitle\n\n` : ''}`;
}

// Génère le pied de page du document LaTeX
function generateLatexFooter(): string {
    return '\n\\end{document}';
}

// Fonction principale de conversion
export async function convertToLatex(markdownContent: string, title: string = ''): Promise<string> {
    try {
        conversionStatus = 'Conversion en cours...';
        let content = markdownContent;
        // Application des conversions dans l'ordre
        content = convertMath(content);
        content = convertCodeBlocks(content);
        content = convertTables(content);
        content = convertHeadings(content);
        content = convertLists(content);
        content = convertLinks(content);
        content = convertBasicFormatting(content);
        // Assemblage du document final
        latexOutput = generateLatexHeader(title) + content + generateLatexFooter();
        conversionStatus = 'Conversion terminée';
        return latexOutput;
    } catch (error) {
        conversionStatus = 'Erreur lors de la conversion';
        throw error;
    }
}
</script>

<!-- Ce composant n'a pas d'interface utilisateur, il est purement logique -->
