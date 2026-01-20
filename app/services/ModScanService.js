import { ModEntry } from '../models/ModEntry.js';

export class ModScanService {
    constructor(filePath, statusCallback, app = null) {
        this.filePath = filePath;
        this.setStatus = statusCallback;
        this.app = app;
    }
    
    async scanProjectModsDirectory(projectModEntries, selectedModName) {
        try {
            if (!this.app || !this.app.userConfig || !this.app.userConfig.projectPath) {
                return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
            }
            
            const scanDir = this.app.userConfig.projectPath;
            
            if (!scanDir) {
                return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
            }
            
            const exists = await window.electronAPI.fileExists(scanDir);
            if (!exists) {
                return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
            }
            
            const result = await window.electronAPI.scanModsDirectory(scanDir);
            if (!result.success) {
                if (this.app && this.app.t) {
                    this.setStatus(this.app.t('status.common.scanWarning', { error: result.error }));
                } else {
                    this.setStatus(`Warning: failed to scan mods folder: ${result.error}`);
                }
                return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
            }
            
            const symlinkMods = result.symlinks || new Map();
            
            projectModEntries.length = 0;
            
            const baseIndex = 1000;
            result.mods.sort().forEach((modName, idx) => {
                const isSymlink = symlinkMods.get(modName) || false;
                projectModEntries.push(new ModEntry(
                    modName,
                    false,
                    `--${modName}`,
                    false,
                    baseIndex + idx,
                    false,
                    isSymlink
                ));
            });
            
            return { 
                added: result.mods.length, 
                removed: 0, 
                deleted: 0,
                restored: 0,
                selectedModName: '' 
            };
            
        } catch (error) {
            if (this.app && this.app.t) {
                this.setStatus(this.app.t('status.common.scanWarning', { error: error.message }));
            } else {
                this.setStatus(`Warning: failed to scan mods folder: ${error.message}`);
            }
            return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
        }
    }
    
    async scanGameModsDirectory(gameModEntries, selectedModName) {
        try {
            const scanDir = this.filePath ? this.filePath.substring(0, this.filePath.lastIndexOf('\\')) : null;
            
            if (!scanDir) {
                return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
            }
            
            const exists = await window.electronAPI.fileExists(scanDir);
            if (!exists) {
                return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
            }
            
            const result = await window.electronAPI.scanModsDirectory(scanDir);
            if (!result.success) {
                if (this.app && this.app.t) {
                    this.setStatus(this.app.t('status.common.scanWarning', { error: result.error }));
                } else {
                    this.setStatus(`Warning: failed to scan mods folder: ${result.error}`);
                }
                return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
            }
            
            const fileSystemMods = new Set(result.mods);
            const symlinkMods = result.symlinks || new Map();
            
            const existingModNames = new Set(gameModEntries.map(mod => mod.name));
            
            const modsToRemove = [];
            let newSelectedModName = selectedModName;
            let notFoundCount = 0;
            let restoredCount = 0;
            
            for (const mod of gameModEntries) {
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
            
            for (let i = gameModEntries.length - 1; i >= 0; i--) {
                const mod = gameModEntries[i];
                if (modsToRemove.includes(mod.name)) {
                    gameModEntries.splice(i, 1);
                }
            }
            
            if (newSelectedModName && modsToRemove.includes(newSelectedModName)) {
                newSelectedModName = '';
            }
            
            const newMods = result.mods.filter(modName => !existingModNames.has(modName));
            
            const baseIndex = gameModEntries.length + 1000;
            newMods.sort().forEach((modName, idx) => {
                const isSymlink = symlinkMods.get(modName) || false;
                gameModEntries.push(new ModEntry(
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
                this.setStatus(this.app.t('status.common.scanWarning', { error: error.message }));
            } else {
                this.setStatus(`Warning: failed to scan mods folder: ${error.message}`);
            }
            return { added: 0, removed: 0, deleted: 0, restored: 0, selectedModName };
        }
    }
    
    async scanModsDirectory(modEntries, selectedModName) {
        const isDeveloperViewMode = this.app && this.app.userConfig && this.app.userConfig.developerViewMode && this.app.userConfig.projectPath;
        
        if (isDeveloperViewMode) {
            return await this.scanProjectModsDirectory(this.app.projectModEntries, selectedModName);
        } else {
            return await this.scanGameModsDirectory(this.app.gameModEntries, selectedModName);
        }
    }
}
