// Менеджер массовых операций
export class BulkOperationsManager {
    constructor(app) {
        this.app = app;
    }
    
    // Выделить все включенные моды
    bulkSelectEnabled() {
        this.app.selectedModNames.clear();
        this.app.selectedModName = '';
        this.app.lastSelectedModIndex = -1;
        
        this.app.modEntries.forEach(modEntry => {
            if (modEntry.enabled) {
                this.app.selectedModNames.add(modEntry.name);
            }
        });
        
        // Обновляем визуальное выделение
        this.app.modManager.updateModListSelection();
        
        this.app.uiManager.updateBulkActionsPanel();
    }
    
    // Выделить все выключенные моды
    bulkSelectDisabled() {
        this.app.selectedModNames.clear();
        this.app.selectedModName = '';
        this.app.lastSelectedModIndex = -1;
        
        this.app.modEntries.forEach(modEntry => {
            if (!modEntry.enabled) {
                this.app.selectedModNames.add(modEntry.name);
            }
        });
        
        // Обновляем визуальное выделение
        this.app.modManager.updateModListSelection();
        
        this.app.uiManager.updateBulkActionsPanel();
    }
    
    // Массовое включение выбранных модов
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
        this.app.setStatus(`Включено модов: ${selected.length}`);
    }
    
    // Массовое выключение выбранных модов
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
        this.app.setStatus(`Выключено модов: ${selected.length}`);
    }
    
    // Массовое удаление выбранных модов
    async bulkDelete() {
        const selected = Array.from(this.app.selectedModNames);
        if (selected.length === 0) {
            return;
        }
        
        const confirmed = await this.app.uiManager.showConfirm(`Удалить ${selected.length} выбранных модов из списка?\n\nМоды будут удалены из файла при сохранении.`);
        if (!confirmed) {
            return;
        }
        
        // Удаляем моды из списка
        selected.forEach(modName => {
            const modIndex = this.app.modEntries.findIndex(m => m.name === modName);
            if (modIndex !== -1) {
                this.app.modEntries.splice(modIndex, 1);
            }
        });
        
        // Обновляем ссылку в рендерере
        if (this.app.modListRenderer) {
            this.app.modListRenderer.modEntries = this.app.modEntries;
        }
        
        // Очищаем выбор
        this.app.modManager.clearSelection();
        
        // Обновляем интерфейс
        const searchText = this.app.elements.searchInput.value;
        this.app.modManager.updateModList(searchText);
        this.app.updateStatistics();
        
        this.app.setStatus(`Удалено модов: ${selected.length}. Не забудьте сохранить файл.`);
    }
}
