import { ModEntry } from '../models/ModEntry.js';

export class FileService {
    constructor(statusCallback) {
        this.setStatus = statusCallback;
    }
    
    parseFileContent(content) {
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (char === '\n') {
                lines.push(currentLine + '\n');
                currentLine = '';
            } else if (char === '\r') {
                continue;
            } else {
                currentLine += char;
            }
        }
        if (currentLine) {
            lines.push(currentLine + '\n');
        }
        
        const headerLines = [];
        const modEntries = [];
        
        let inHeader = true;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const stripped = line.replace(/\r?\n$/, '');
            
            if (inHeader) {
                if (stripped.startsWith('-- ')) {
                    headerLines.push(line);
                    continue;
                } else if (stripped === '' && headerLines.length > 0) {
                    headerLines.push(line);
                    continue;
                } else {
                    inHeader = false;
                }
            }
            
            if (!stripped) {
                continue;
            }
            
            const modIndex = modEntries.length;
            if (stripped.startsWith('--')) {
                const modName = stripped.substring(2).trim();
                if (modName && /[a-zA-Z0-9]/.test(modName)) {
                    modEntries.push(new ModEntry(modName, false, stripped, false, modIndex, false, false));
                }
            } else {
                const modName = stripped.trim();
                if (modName) {
                    modEntries.push(new ModEntry(modName, true, stripped, false, modIndex, false, false));
                }
            }
        }
        
        return { headerLines, modEntries };
    }
    
    formatFileContent(headerLines, modEntries, sortedModEntries = null) {
        const sortedMods = sortedModEntries || [...modEntries].sort((a, b) => a.orderIndex - b.orderIndex);
        
        let content = '';
        
        const managerComment = '-- File managed by Darktide Mod Load Order Manager\n\n';
        content += managerComment;
        
        for (const modEntry of sortedMods) {
            if (modEntry.isNew && !modEntry.enabled) {
                continue;
            }
            
            if (modEntry.isNew) {
                modEntry.isNew = false;
            }
            
            if (modEntry.enabled) {
                content += modEntry.name + '\n';
            } else {
                content += '--' + modEntry.name + '\n';
            }
        }
        
        return content;
    }
    
    async loadFile(filePath) {
        const exists = await window.electronAPI.fileExists(filePath);
        if (!exists) {
            throw new Error(`Файл не найден: ${filePath}`);
        }
        
        const result = await window.electronAPI.loadFile(filePath);
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return this.parseFileContent(result.content);
    }
    
    async saveFile(filePath, headerLines, modEntries, sortedModEntries = null) {
        const content = this.formatFileContent(headerLines, modEntries, sortedModEntries);
        const result = await window.electronAPI.saveFile(filePath, content);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result;
    }
}
