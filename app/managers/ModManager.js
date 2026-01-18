export class ModManager {
    constructor(app) {
        this.app = app;
    }
    
    async scanAndUpdate() {
        const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, this.app.selectedModName);
        this.app.selectedModName = scanResult.selectedModName;
        
        if (this.app.modListComponent) {
            this.app.modListComponent.modEntries = this.app.modEntries;
        }
        
        if (scanResult.removed > 0) {
            const currentSelected = Array.from(this.app.selectedModNames);
            currentSelected.forEach(modName => {
                if (!this.app.modEntries.find(m => m.name === modName)) {
                    this.app.selectedModNames.delete(modName);
                }
            });
        }
        
        if (this.app.modListComponent) {
            this.app.modListComponent.updateModList();
        }
        this.app.updateStatistics();
        
        let message = '';
        const parts = [];
        
        if (scanResult.added > 0) {
            parts.push(`${this.app.t('messages.scanNewMods')} ${scanResult.added}`);
        }
        if (scanResult.removed > 0) {
            parts.push(`${this.app.t('messages.scanRemovedMods')} ${scanResult.removed}`);
        }
        if (scanResult.deleted > 0) {
            parts.push(`${this.app.t('messages.scanDeletedMods')} ${scanResult.deleted}`);
        }
        if (scanResult.restored > 0) {
            parts.push(`${this.app.t('messages.scanRestoredMods')} ${scanResult.restored}`);
        }
        
        if (parts.length > 0) {
            message = parts.join('\n');
        } else {
            message = this.app.t('messages.scanNoChanges');
        }
        
        this.app.uiManager.showMessage(this.app.t('messages.info'), message);
    }
    
    
    async createSymlinkForMod() {
        const modsDir = this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\'));
        if (!modsDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineModsDir'));
            return;
        }
        
        const result = await window.electronAPI.selectFolder('');
        if (!result.success || result.canceled) {
            return;
        }
        
        const targetPath = result.folderPath;
        
        const targetExists = await window.electronAPI.fileExists(targetPath);
        if (!targetExists) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.selectedFolderNotExists'));
            return;
        }
        
        const pathParts = targetPath.split('\\');
        const defaultModName = pathParts[pathParts.length - 1];
        
        this.app.modalManager.showModal(this.app.t('ui.enterModName'), defaultModName, async (modName) => {
            if (!modName || !modName.trim()) {
                return;
            }
            
            const cleanModName = modName.trim();
            const linkPath = modsDir + '\\' + cleanModName;
            
            const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.createSymlinkConfirm', { targetPath, linkPath, modName: cleanModName }));
            if (!confirmed) {
                return;
            }
            
            try {
                const symlinkResult = await window.electronAPI.createSymlink(linkPath, targetPath);
                if (!symlinkResult.success) {
                    await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToCreateSymlink')}\n${symlinkResult.error}`);
                    return;
                }
                
                await this.app.uiManager.showMessage('Success', `Symbolic link created successfully!\n\n${linkPath} -> ${targetPath}`);
                this.app.setStatus(this.app.t('status.symlinkCreated', { modName: cleanModName }));
                
                await this.scanAndUpdate();
            } catch (error) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.symlinkCreationError')}\n${error.message}`);
            }
        });
    }
    
    
    enableMod(modName) {
        const modEntry = this.app.modEntries.find(m => m.name === modName);
        if (modEntry) {
            modEntry.enabled = true;
            if (modEntry.checkbox) {
                modEntry.checkbox.checked = true;
            }
            if (modEntry.statusElement) {
                modEntry.statusElement.textContent = '✓';
                modEntry.statusElement.className = 'mod-status enabled';
            }
            this.app.updateStatistics();
        }
    }
    
    disableMod(modName) {
        const modEntry = this.app.modEntries.find(m => m.name === modName);
        if (modEntry) {
            modEntry.enabled = false;
            if (modEntry.checkbox) {
                modEntry.checkbox.checked = false;
            }
            if (modEntry.statusElement) {
                modEntry.statusElement.textContent = '✗';
                modEntry.statusElement.className = 'mod-status disabled';
            }
            this.app.updateStatistics();
        }
    }
    
    copyModName(modName) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(modName).then(() => {
                this.app.setStatus(this.app.t('status.modNameCopied', { modName }));
            }).catch(() => {
                const textArea = document.createElement('textarea');
                textArea.value = modName;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    this.app.setStatus(this.app.t('status.modNameCopied', { modName }));
                } catch (err) {
                    this.app.setStatus(this.app.t('status.copyError'));
                }
                document.body.removeChild(textArea);
            });
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = modName;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.app.setStatus(this.app.t('status.modNameCopied', { modName }));
            } catch (err) {
                this.app.setStatus(this.app.t('status.copyError'));
            }
            document.body.removeChild(textArea);
        }
    }
    
    async deleteMod(modName) {
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.deleteModConfirm', { modName }));
        if (!confirmed) {
            return;
        }
        
        const modIndex = this.app.modEntries.findIndex(m => m.name === modName);
        if (modIndex !== -1) {
            this.app.modEntries.splice(modIndex, 1);
        }
        
        if (this.app.selectedModNames.has(modName)) {
            this.app.selectedModNames.delete(modName);
        }
        
        if (this.app.selectedModName === modName) {
            this.app.selectedModName = '';
        }
        
        if (this.app.modListComponent) {
            this.app.modListComponent.modEntries = this.app.modEntries;
        }
        
        if (this.app.modListComponent) {
            this.app.modListComponent.updateModList();
        }
        this.app.updateStatistics();
        
        this.app.setStatus(this.app.t('status.modDeleted', { modName }));
    }
}
