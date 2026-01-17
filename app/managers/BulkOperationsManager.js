export class BulkOperationsManager {
    constructor(app) {
        this.app = app;
    }
    
    bulkSelectEnabled() {
        this.app.selectedModNames.clear();
        this.app.selectedModName = '';
        this.app.lastSelectedModIndex = -1;
        
        this.app.modEntries.forEach(modEntry => {
            if (modEntry.enabled) {
                this.app.selectedModNames.add(modEntry.name);
            }
        });
        
        this.app.modManager.updateModListSelection();
        
        this.app.uiManager.updateBulkActionsPanel();
    }
    
    bulkSelectDisabled() {
        this.app.selectedModNames.clear();
        this.app.selectedModName = '';
        this.app.lastSelectedModIndex = -1;
        
        this.app.modEntries.forEach(modEntry => {
            if (!modEntry.enabled) {
                this.app.selectedModNames.add(modEntry.name);
            }
        });
        
        this.app.modManager.updateModListSelection();
        
        this.app.uiManager.updateBulkActionsPanel();
    }
    
    bulkEnable() {
        const selected = Array.from(this.app.selectedModNames);
        if (selected.length === 0) {
            return;
        }
        
        selected.forEach(modName => {
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
            }
        });
        
        this.app.updateStatistics();
        this.app.setStatus(this.app.t('status.modsEnabled', { count: selected.length }));
    }
    
    bulkDisable() {
        const selected = Array.from(this.app.selectedModNames);
        if (selected.length === 0) {
            return;
        }
        
        selected.forEach(modName => {
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
            }
        });
        
        this.app.updateStatistics();
        this.app.setStatus(this.app.t('status.modsDisabled', { count: selected.length }));
    }
    
    async bulkDelete() {
        const selected = Array.from(this.app.selectedModNames);
        if (selected.length === 0) {
            return;
        }
        
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.deleteModsConfirm', { count: selected.length }));
        if (!confirmed) {
            return;
        }
        
        selected.forEach(modName => {
            const modIndex = this.app.modEntries.findIndex(m => m.name === modName);
            if (modIndex !== -1) {
                this.app.modEntries.splice(modIndex, 1);
            }
        });
        
        if (this.app.modListRenderer) {
            this.app.modListRenderer.modEntries = this.app.modEntries;
        }
        
        this.app.modManager.clearSelection();
        
        const searchText = this.app.elements.searchInput.value;
        this.app.modManager.updateModList(searchText);
        this.app.updateStatistics();
        
        this.app.setStatus(this.app.t('status.modsDeleted', { count: selected.length }));
    }
}
