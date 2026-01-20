import { ConfigManager } from './ConfigManager.js';

export class SettingsManager {
    constructor(app) {
        this.app = app;
    }
    
    
    async applySettings() {
        if (!this.app.userConfig) {
            return;
        }
        
        if (this.app.userConfig.locale !== undefined) {
            await this.applyLocale(this.app.userConfig.locale);
        }
        
        if (this.app.userConfig.theme !== undefined) {
            this.applyTheme(this.app.userConfig.theme);
        }
    }
    
    async applyLocale(locale) {
        await this.app.localeManager.loadLocale(locale);
        this.app.localeManager.setLocale(locale);
        await this.app.applyLocalization();
        
        if (this.app.themeComponent) {
            await this.app.themeComponent.updateThemeSelectLabels();
        }
        
        if (this.app.profileComponent) {
            await this.app.profileComponent.updateLocalization();
        }
        
        if (this.app.modListComponent) {
            if (this.app.modListComponent.updateLocalization) {
                this.app.modListComponent.updateLocalization();
            }
            if (this.app.searchComponent) {
                const searchText = this.app.searchComponent.getSearchText();
                this.app.modListComponent.updateModList();
            }
        }
        
        if (this.app.searchComponent) {
            if (this.app.searchComponent.updateLocalization) {
                this.app.searchComponent.updateLocalization();
            }
        }
        
        if (this.app.bulkOperationsComponent) {
            if (this.app.bulkOperationsComponent.updateLocalization) {
                this.app.bulkOperationsComponent.updateLocalization();
            }
        }
        
        if (this.app.settingsComponent) {
            if (this.app.settingsComponent.updateLocalization) {
                this.app.settingsComponent.updateLocalization();
            }
        }
        
        if (this.app.fileOperationsComponent) {
            if (this.app.fileOperationsComponent.updateLocalization) {
                this.app.fileOperationsComponent.updateLocalization();
            }
        }
    }
    
    applyTheme(theme) {
        if (this.app.themeComponent) {
            this.app.themeComponent.applyTheme(theme);
        }
    }
    
    applyAllSettings() {
        if (!this.app.userConfig) {
            return;
        }
        
        if (this.app.searchComponent && this.app.searchComponent.applySettings) {
            this.app.searchComponent.applySettings();
        }
        
        if (this.app.userConfig.theme !== undefined) {
            this.applyTheme(this.app.userConfig.theme);
        }
        
        if (this.app.profileComponent && typeof this.app.profileComponent.updateListSize === 'function') {
            this.app.profileComponent.updateListSize();
        }
    }
    
}
