export class ConfigManager {
    constructor(app) {
        this.app = app;
    }
    
    static getDefaultUserConfig() {
        return {
            fileUrlModLoadOrder: '',
            theme: '',
            locale: 'en',
            hideNewMods: false,
            hideNotFoundMods: false,
            hideUnusedMods: false
        };
    }
    
    async loadUserConfig() {
        try {
            const result = await window.electronAPI.loadUserConfig();
            if (result.success) {
                this.app.userConfig = result.userConfig;
            } else {
                this.app.userConfig = ConfigManager.getDefaultUserConfig();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.app.userConfig = ConfigManager.getDefaultUserConfig();
        }
    }
    
    async saveUserConfig() {
        try {
            if (!this.app.userConfig) {
                this.app.userConfig = ConfigManager.getDefaultUserConfig();
            }
            
            this.app.userConfig.fileUrlModLoadOrder = this.app.filePath || '';
            this.app.userConfig.hideNewMods = this.app.hideNewMods;
            this.app.userConfig.hideNotFoundMods = this.app.hideNotFoundMods;
            this.app.userConfig.hideUnusedMods = this.app.hideUnusedMods;
            
            const result = await window.electronAPI.saveUserConfig(this.app.userConfig);
            if (!result.success) {
                console.error('Error saving settings:', result.error);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    async applyUserConfig() {
        let wasAutoFound = false;
        
        if (this.app.userConfig && this.app.userConfig.fileUrlModLoadOrder) {
            const exists = await window.electronAPI.fileExists(this.app.userConfig.fileUrlModLoadOrder);
            if (exists) {
                this.app.filePath = this.app.userConfig.fileUrlModLoadOrder;
            } else {
                this.app.filePath = await window.electronAPI.findModLoadOrderFile();
                wasAutoFound = true;
            }
        } else {
            this.app.filePath = await window.electronAPI.findModLoadOrderFile();
            wasAutoFound = true;
        }
        
        if (!this.app.filePath) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.common.fileNotFoundPleaseSelect')
                );
            }
            this.app.filePath = '';
            this.app.elements.pathInput.value = '';
            this.app.settingsManager.applyAllSettings();
            return;
        }
        
        this.app.elements.pathInput.value = this.app.filePath;
        
        if (wasAutoFound && this.app.filePath) {
            if (!this.app.userConfig) {
                this.app.userConfig = ConfigManager.getDefaultUserConfig();
            }
            
            this.app.userConfig.fileUrlModLoadOrder = this.app.filePath;
            await this.saveUserConfig();
        }
        
        this.app.settingsManager.applyAllSettings();
    }
}
