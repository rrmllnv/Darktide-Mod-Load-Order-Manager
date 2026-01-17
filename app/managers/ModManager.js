export class ModManager {
    constructor(app) {
        this.app = app;
    }
    
    async scanAndUpdate() {
        const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, this.app.selectedModName);
        this.app.selectedModName = scanResult.selectedModName;
        
        if (this.app.modListRenderer) {
            this.app.modListRenderer.modEntries = this.app.modEntries;
        }
        
        if (scanResult.removed > 0) {
            const currentSelected = Array.from(this.app.selectedModNames);
            currentSelected.forEach(modName => {
                if (!this.app.modEntries.find(m => m.name === modName)) {
                    this.app.selectedModNames.delete(modName);
                }
            });
        }
        
        const searchText = this.app.elements.searchInput.value;
        this.updateModList(searchText);
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
    
    updateModList(filterText = null) {
        this.app.modListRenderer.updateModList(
            filterText,
            this.app.hideNewMods,
            this.app.hideUnusedMods,
            this.app.hideNotFoundMods,
            this.app.selectedModName,
            this.app.selectedModNames
        );
        this.app.updateStatistics();
        this.app.uiManager.updateBulkActionsPanel();
    }
    
    onSortChange() {
        const searchText = this.app.elements.searchInput.value;
        this.updateModList(searchText);
    }
    
    onCheckboxChange(modName) {
        const modEntry = this.app.modEntries.find(m => m.name === modName);
        if (modEntry && modEntry.statusElement) {
            modEntry.statusElement.textContent = modEntry.enabled ? '✓' : '✗';
            modEntry.statusElement.className = `mod-status ${modEntry.enabled ? 'enabled' : 'disabled'}`;
        }
        
        this.app.updateStatistics();
        
        if (this.app.selectedModName === modName) {
            this.selectMod(modName);
        }
    }
    
    selectMod(modName, ctrlKey = false, shiftKey = false) {
        const filteredMods = this.app.modListRenderer.filteredModEntries || [];
        const currentIndex = filteredMods.findIndex(m => m.name === modName);
        
        if (shiftKey && this.app.lastSelectedModIndex !== -1) {
            const startIndex = Math.min(this.app.lastSelectedModIndex, currentIndex);
            const endIndex = Math.max(this.app.lastSelectedModIndex, currentIndex);
            
            for (let i = startIndex; i <= endIndex; i++) {
                if (filteredMods[i]) {
                    this.app.selectedModNames.add(filteredMods[i].name);
                }
            }
        } else if (ctrlKey) {
            if (this.app.selectedModNames.has(modName)) {
                this.app.selectedModNames.delete(modName);
            } else {
                this.app.selectedModNames.add(modName);
            }
        } else {
            this.app.selectedModNames.clear();
            this.app.selectedModNames.add(modName);
            this.app.selectedModName = modName;
        }
        
        if (currentIndex !== -1) {
            this.app.lastSelectedModIndex = currentIndex;
            if (this.app.modListRenderer.callbacks.setLastSelectedIndex) {
                this.app.modListRenderer.callbacks.setLastSelectedIndex(currentIndex);
            }
        }
        
        this.updateModListSelection();
        
        if (this.app.selectedModNames.size === 1) {
            const singleMod = Array.from(this.app.selectedModNames)[0];
            this.app.selectedModName = singleMod;
        } else {
            this.app.selectedModName = '';
        }
        
        this.app.uiManager.updateBulkActionsPanel();
        this.app.updateStatistics();
    }
    
    updateModListSelection() {
        this.app.modEntries.forEach(modEntry => {
            if (modEntry.modItem) {
                if (this.app.selectedModNames.has(modEntry.name)) {
                    modEntry.modItem.classList.add('selected');
                } else {
                    modEntry.modItem.classList.remove('selected');
                }
            }
        });
    }
    
    clearSelection() {
        this.app.selectedModNames.clear();
        this.app.selectedModName = '';
        this.app.lastSelectedModIndex = -1;
        this.updateModListSelection();
        this.app.uiManager.updateBulkActionsPanel();
        this.app.updateStatistics();
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
                
                await this.app.uiManager.showMessage('Успех', `Символическая ссылка успешно создана!\n\n${linkPath} -> ${targetPath}`);
                this.app.setStatus(this.app.t('status.symlinkCreated', { modName: cleanModName }));
                
                await this.scanAndUpdate();
            } catch (error) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.symlinkCreationError')}\n${error.message}`);
            }
        });
    }
    
    onSearchChange() {
        const searchText = this.app.elements.searchInput.value;
        this.updateModList(searchText);
    }
    
    clearSearch() {
        this.app.elements.searchInput.value = '';
        this.updateModList();
    }
    
    enableAll() {
        this.app.modEntries.forEach(modEntry => {
            modEntry.enabled = true;
            if (modEntry.checkbox) {
                modEntry.checkbox.checked = true;
            }
        });
        const searchText = this.app.elements.searchInput.value;
        this.updateModList(searchText);
    }
    
    disableAll() {
        this.app.modEntries.forEach(modEntry => {
            modEntry.enabled = false;
            if (modEntry.checkbox) {
                modEntry.checkbox.checked = false;
            }
        });
        const searchText = this.app.elements.searchInput.value;
        this.updateModList(searchText);
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
        
        if (this.app.modListRenderer) {
            this.app.modListRenderer.modEntries = this.app.modEntries;
        }
        
        const searchText = this.app.elements.searchInput.value;
        this.updateModList(searchText);
        this.app.updateStatistics();
        
        this.app.setStatus(this.app.t('status.modDeleted', { modName }));
    }
}
