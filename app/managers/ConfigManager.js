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
            hideUnusedMods: false,
            tourCompleted: false,
            browseTourCompleted: false,
            saveProfileHideNewMods: true,
            saveProfileHideNotFoundMods: true,
            saveProfileHideUnusedMods: true,
            saveProfileSort: true,
            profilesListSize: 6,
            developerMode: false,
            projectPath: '',
            developerViewMode: false,
            todosShowOnlyActive: false,
            todosGroupByMod: true,
            rightPanelWidth: 300
        };
    }
    
    async loadUserConfig() {
        try {
            const result = await window.electronAPI.loadUserConfig();
            if (result.success) {
                const defaultConfig = ConfigManager.getDefaultUserConfig();
                this.app.userConfig = { ...defaultConfig, ...result.userConfig };
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
            if (this.app.todosShowOnlyActive !== undefined) {
                this.app.userConfig.todosShowOnlyActive = this.app.todosShowOnlyActive;
            }
            if (this.app.userConfig.todosGroupByMod !== undefined) {
                this.app.userConfig.todosGroupByMod = this.app.userConfig.todosGroupByMod;
            }
            if (this.app.rightPanelWidth !== undefined) {
                this.app.userConfig.rightPanelWidth = this.app.rightPanelWidth;
            }
            
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
                    this.app.t('messages.common.welcome'),
                    this.app.t('messages.common.fileNotFoundPleaseSelect')
                );
            }
            this.app.filePath = '';
            this.app.elements.pathInput.value = '';
            if (this.app.fileManager && this.app.fileManager.updateSaveButton) {
                this.app.fileManager.updateSaveButton();
            }
            this.app.settingsManager.applyAllSettings();
            
            if (this.app.tourComponent && this.app.tourComponent.shouldShowBrowseTour()) {
                setTimeout(() => {
                    this.app.tourComponent.startBrowseTour();
                }, 300);
            }
            
            return;
        }
        
        this.app.elements.pathInput.value = this.app.filePath;
        
        if (this.app.fileManager && this.app.fileManager.updateSaveButton) {
            this.app.fileManager.updateSaveButton();
        }
        
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
