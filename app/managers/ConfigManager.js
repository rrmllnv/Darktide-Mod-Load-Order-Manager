// Менеджер настроек приложения
export class ConfigManager {
    constructor(app) {
        this.app = app;
    }
    
    async loadUserConfig() {
        try {
            const result = await window.electronAPI.loadUserConfig();
            if (result.success) {
                this.app.userConfig = result.userConfig;
            } else {
                // Если не удалось загрузить, создаем настройки по умолчанию
                this.app.userConfig = {
                    fileUrlModLoadOrder: '',
                    theme: '',
                    hideNewMods: false,
                    hideDeletedMods: false,
                    hideUnusedMods: false
                };
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            this.app.userConfig = {
                fileUrlModLoadOrder: '',
                theme: '',
                hideNewMods: false,
                hideDeletedMods: false,
                hideUnusedMods: false
            };
        }
    }
    
    async saveUserConfig() {
        try {
            if (!this.app.userConfig) {
                this.app.userConfig = {
                    fileUrlModLoadOrder: '',
                    theme: '',
                    hideNewMods: false,
                    hideDeletedMods: false,
                    hideUnusedMods: false
                };
            }
            
            // Обновляем текущие значения
            this.app.userConfig.fileUrlModLoadOrder = this.app.filePath || '';
            this.app.userConfig.hideNewMods = this.app.hideNewMods;
            this.app.userConfig.hideDeletedMods = this.app.hideDeletedMods;
            this.app.userConfig.hideUnusedMods = this.app.hideUnusedMods;
            
            const result = await window.electronAPI.saveUserConfig(this.app.userConfig);
            if (!result.success) {
                console.error('Ошибка сохранения настроек:', result.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
        }
    }
    
    applyUserConfig() {
        // Применяем сохраненный путь из настроек или используем путь по умолчанию
        if (this.app.userConfig && this.app.userConfig.fileUrlModLoadOrder) {
            this.app.filePath = this.app.userConfig.fileUrlModLoadOrder;
        } else {
            this.app.filePath = this.app.defaultPath;
        }
        this.app.elements.pathInput.value = this.app.filePath;
        
        // Применяем настройки чекбоксов
        if (this.app.userConfig) {
            this.app.hideNewMods = this.app.userConfig.hideNewMods || false;
            this.app.hideDeletedMods = this.app.userConfig.hideDeletedMods || false;
            this.app.hideUnusedMods = this.app.userConfig.hideUnusedMods || false;
            
            if (this.app.elements.hideNewModsCheckbox) {
                this.app.elements.hideNewModsCheckbox.checked = this.app.hideNewMods;
            }
            if (this.app.elements.hideDeletedModsCheckbox) {
                this.app.elements.hideDeletedModsCheckbox.checked = this.app.hideDeletedMods;
            }
            if (this.app.elements.hideUnusedModsCheckbox) {
                this.app.elements.hideUnusedModsCheckbox.checked = this.app.hideUnusedMods;
            }
        }
    }
}
