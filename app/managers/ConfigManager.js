// Менеджер настроек приложения
export class ConfigManager {
    constructor(app) {
        this.app = app;
    }
    
    // Получить структуру настроек по умолчанию
    static getDefaultUserConfig() {
        return {
            fileUrlModLoadOrder: '',
            theme: '',
            locale: 'en',
            hideNewMods: false,
            hideDeletedMods: false,
            hideUnusedMods: false
        };
    }
    
    async loadUserConfig() {
        try {
            const result = await window.electronAPI.loadUserConfig();
            if (result.success) {
                this.app.userConfig = result.userConfig;
            } else {
                // Если не удалось загрузить, создаем настройки по умолчанию
                this.app.userConfig = ConfigManager.getDefaultUserConfig();
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            this.app.userConfig = ConfigManager.getDefaultUserConfig();
        }
    }
    
    async saveUserConfig() {
        try {
            if (!this.app.userConfig) {
                this.app.userConfig = ConfigManager.getDefaultUserConfig();
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
    
    async applyUserConfig() {
        // Применяем сохраненный путь из настроек или ищем файл в стандартных местах
        let wasAutoFound = false; // Флаг: был ли путь найден автоматически (не из настроек)
        
        if (this.app.userConfig && this.app.userConfig.fileUrlModLoadOrder) {
            // Проверяем, существует ли сохраненный путь
            const exists = await window.electronAPI.fileExists(this.app.userConfig.fileUrlModLoadOrder);
            if (exists) {
                this.app.filePath = this.app.userConfig.fileUrlModLoadOrder;
                // Путь из настроек существует, не нужно сохранять
            } else {
                // Если сохраненный путь не существует, ищем файл в стандартных местах
                this.app.filePath = await window.electronAPI.findModLoadOrderFile();
                wasAutoFound = true; // Путь найден автоматически
            }
        } else {
            // Если нет сохраненного пути, ищем файл в стандартных местах
            this.app.filePath = await window.electronAPI.findModLoadOrderFile();
            wasAutoFound = true; // Путь найден автоматически
        }
        
        this.app.elements.pathInput.value = this.app.filePath;
        
        // Сохраняем путь только если он был найден автоматически
        if (wasAutoFound && this.app.filePath) {
            if (!this.app.userConfig) {
                this.app.userConfig = ConfigManager.getDefaultUserConfig();
            }
            
            // Сохраняем найденный путь, чтобы при следующем запуске не искать заново
            this.app.userConfig.fileUrlModLoadOrder = this.app.filePath;
            await this.saveUserConfig();
        }
        
        // Применяем остальные настройки через SettingsManager
        this.app.settingsManager.applyAllSettings();
    }
}
