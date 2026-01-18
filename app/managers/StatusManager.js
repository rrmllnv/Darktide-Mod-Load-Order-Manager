export class StatusManager {
    constructor(statusElement, app = null) {
        this.statusElement = statusElement;
        this.app = app;
    }
    
    setStatus(message) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
        }
    }
    
    updateStatistics(modEntries, selectedModNames = null) {
        const total = modEntries.length;
        const enabled = modEntries.filter(m => m.enabled).length;
        const disabled = total - enabled;
        const newModsCount = modEntries.filter(m => m.isNew).length;
        const notFoundCount = modEntries.filter(m => m.isNotFound).length;
        const selectedCount = selectedModNames ? selectedModNames.size : 0;
        
        let statsText = this.app.t('status.common.total', { total, enabled, disabled });
        
        const parts = [];
        if (newModsCount > 0) {
            parts.push(this.app.t('status.common.newMods', { count: newModsCount }));
        }
        if (notFoundCount > 0) {
            parts.push(this.app.t('status.common.notFoundMods', { count: notFoundCount }));
        }
        if (selectedCount > 0) {
            parts.push(this.app.t('status.common.selectedMods', { count: selectedCount }));
        }
        
        if (parts.length > 0) {
            statsText += ' | ' + parts.join(' | ');
        }
        
        this.setStatus(statsText);
    }
}
