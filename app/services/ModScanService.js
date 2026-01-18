import { ModEntry } from '../models/ModEntry.js';

export class ModScanService {
    constructor(filePath, statusCallback, app = null) {
        this.filePath = filePath;
        this.setStatus = statusCallback;
        this.app = app;
    }
    
    async scanModsDirectory(modEntries, selectedModName) {
        try {
            const modsDir = this.filePath.substring(0, this.filePath.lastIndexOf('\\'));
            if (!modsDir) {
                return { added: 0, removed: 0, selectedModName };
            }
            
            const exists = await window.electronAPI.fileExists(modsDir);
            if (!exists) {
                return { added: 0, removed: 0, selectedModName };
            }
            
            const existingModNames = new Set(modEntries.map(mod => mod.name));
            
            const result = await window.electronAPI.scanModsDirectory(modsDir);
            if (!result.success) {
                if (this.app && this.app.t) {
                    this.setStatus(this.app.t('status.scanWarning', { error: result.error }));
                } else {
                    this.setStatus(`Warning: failed to scan mods folder: ${result.error}`);
                }
                return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
            }
            
            const fileSystemMods = new Set(result.mods);
            const symlinkMods = result.symlinks || new Map();
            
            const modsToRemove = [];
            let newSelectedModName = selectedModName;
            let notFoundCount = 0;
            let restoredCount = 0;
            
            for (const mod of modEntries) {
                const wasNotFound = mod.isNotFound;
                
                if (!mod.isNew && !fileSystemMods.has(mod.name)) {
                    if (!wasNotFound) {
                        notFoundCount++;
                    }
                    mod.isNotFound = true;
                    mod.isSymlink = false;
                } else if (mod.isNotFound && fileSystemMods.has(mod.name)) {
                    mod.isNotFound = false;
                    if (wasNotFound) {
                        restoredCount++;
                    }
                }
                
                if (fileSystemMods.has(mod.name)) {
                    mod.isSymlink = symlinkMods.get(mod.name) || false;
                }
                
                if (mod.isNew && !fileSystemMods.has(mod.name)) {
                    modsToRemove.push(mod.name);
                }
            }
            
            for (let i = modEntries.length - 1; i >= 0; i--) {
                const mod = modEntries[i];
                if (modsToRemove.includes(mod.name)) {
                    modEntries.splice(i, 1);
                }
            }
            
            if (newSelectedModName && modsToRemove.includes(newSelectedModName)) {
                newSelectedModName = '';
            }
            
            const newMods = result.mods.filter(modName => !existingModNames.has(modName));
            
            const baseIndex = modEntries.length + 1000;
            newMods.sort().forEach((modName, idx) => {
                const isSymlink = symlinkMods.get(modName) || false;
                modEntries.push(new ModEntry(
                    modName,
                    false,
                    `--${modName}`,
                    true,
                    baseIndex + idx,
                    false,
                    isSymlink
                ));
            });
            
            return { 
                added: newMods.length, 
                removed: modsToRemove.length, 
                deleted: notFoundCount,
                restored: restoredCount,
                selectedModName: newSelectedModName 
            };
            
        } catch (error) {
            if (this.app && this.app.t) {
                this.setStatus(this.app.t('status.scanWarning', { error: error.message }));
            } else {
                this.setStatus(`Warning: failed to scan mods folder: ${error.message}`);
            }
            return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
        }
    }
}
