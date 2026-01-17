// Менеджер для управления статус-баром
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
    
    updateStatistics(modEntries) {
        if (!this.app) {
            // Fallback для обратной совместимости
            const total = modEntries.length;
            const enabled = modEntries.filter(m => m.enabled).length;
            const disabled = total - enabled;
            const newModsCount = modEntries.filter(m => m.isNew).length;
            
            let statsText = `Всего: ${total} | Включено: ${enabled} | Выключено: ${disabled}`;
            if (newModsCount > 0) {
                statsText += ` | Новых: ${newModsCount}`;
            }
            
            this.setStatus(statsText);
            return;
        }
        
        const total = modEntries.length;
        const enabled = modEntries.filter(m => m.enabled).length;
        const disabled = total - enabled;
        const newModsCount = modEntries.filter(m => m.isNew).length;
        
        // Формируем строку статистики для статус бара с локализацией
        let statsText;
        if (newModsCount > 0) {
            statsText = this.app.t('status.totalWithNew', { total, enabled, disabled, newModsCount });
        } else {
            statsText = this.app.t('status.total', { total, enabled, disabled });
        }
        
        this.setStatus(statsText);
    }
}
