import { ConfigManager } from './ConfigManager.js';

export class SettingsManager {
    constructor(app) {
        this.app = app;
    }
    
    openSettings() {
        this.loadSettingsToForm();
        
        this.app.elements.settingsDialog.classList.add('show');
        
        const handleEscape = (e) => {
            if (e.key === 'Escape' && this.app.elements.settingsDialog.classList.contains('show')) {
                handleCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        const handleOutsideClick = (e) => {
            if (e.target === this.app.elements.settingsDialog) {
                handleCancel();
                this.app.elements.settingsDialog.removeEventListener('click', handleOutsideClick);
            }
        };
        this.app.elements.settingsDialog.addEventListener('click', handleOutsideClick);
        
        const handleOk = () => {
            this.saveSettingsFromForm();
            
            this.applySettings();
            
            this.closeSettings();
            
            this.app.elements.settingsOkBtn.removeEventListener('click', handleOk);
            this.app.elements.settingsCancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleEscape);
            this.app.elements.settingsDialog.removeEventListener('click', handleOutsideClick);
        };
        
        const handleCancel = () => {
            this.closeSettings();
            
            this.app.elements.settingsOkBtn.removeEventListener('click', handleOk);
            this.app.elements.settingsCancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleEscape);
            this.app.elements.settingsDialog.removeEventListener('click', handleOutsideClick);
        };
        
        const newOkBtn = this.app.elements.settingsOkBtn.cloneNode(true);
        const newCancelBtn = this.app.elements.settingsCancelBtn.cloneNode(true);
        this.app.elements.settingsOkBtn.parentNode.replaceChild(newOkBtn, this.app.elements.settingsOkBtn);
        this.app.elements.settingsCancelBtn.parentNode.replaceChild(newCancelBtn, this.app.elements.settingsCancelBtn);
        this.app.elements.settingsOkBtn = newOkBtn;
        this.app.elements.settingsCancelBtn = newCancelBtn;
        
        this.app.elements.settingsOkBtn.addEventListener('click', handleOk);
        this.app.elements.settingsCancelBtn.addEventListener('click', handleCancel);
    }
    
    loadSettingsToForm() {
        if (!this.app.userConfig) {
            return;
        }
        
        if (this.app.elements.settingsThemeSelect) {
            this.app.elements.settingsThemeSelect.value = this.app.userConfig.theme || '';
        }
        
        if (this.app.elements.settingsLocaleSelect) {
            this.app.elements.settingsLocaleSelect.value = this.app.userConfig.locale || 'en';
        }
    }
    
    saveSettingsFromForm() {
        if (!this.app.userConfig) {
            this.app.userConfig = ConfigManager.getDefaultUserConfig();
        }
        
        if (this.app.elements.settingsThemeSelect) {
            this.app.userConfig.theme = this.app.elements.settingsThemeSelect.value || '';
        }
        
        if (this.app.elements.settingsLocaleSelect) {
            this.app.userConfig.locale = this.app.elements.settingsLocaleSelect.value || 'ru';
        }
        
        this.app.configManager.saveUserConfig();
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
        this.app.applyLocalization();
        
        if (this.app.modListRenderer && this.app.elements.searchInput) {
            const searchText = this.app.elements.searchInput.value;
            this.app.modManager.updateModList(searchText);
        }
    }
    
    applyTheme(theme) {
        const body = document.body;
        
        const themeClasses = ['theme-dark', 'theme-high-contrast', 'theme-oled-dark', 
                             'theme-sepia', 'theme-blue-light', 'theme-nord', 'theme-dracula', 'theme-solarized'];
        themeClasses.forEach(cls => body.classList.remove(cls));
        
        if (theme && theme !== '') {
            const themeClass = `theme-${theme}`;
            if (themeClasses.includes(themeClass)) {
                body.classList.add(themeClass);
            }
        }
    }
    
    applyAllSettings() {
        if (!this.app.userConfig) {
            return;
        }
        
        if (this.app.userConfig.hideNewMods !== undefined) {
            this.app.hideNewMods = this.app.userConfig.hideNewMods;
            if (this.app.elements.hideNewModsCheckbox) {
                this.app.elements.hideNewModsCheckbox.checked = this.app.hideNewMods;
            }
        }
        
        if (this.app.userConfig.hideNotFoundMods !== undefined) {
            this.app.hideNotFoundMods = this.app.userConfig.hideNotFoundMods;
            if (this.app.elements.hideNotFoundModsCheckbox) {
                this.app.elements.hideNotFoundModsCheckbox.checked = this.app.hideNotFoundMods;
            }
        }
        
        if (this.app.userConfig.hideUnusedMods !== undefined) {
            this.app.hideUnusedMods = this.app.userConfig.hideUnusedMods;
            if (this.app.elements.hideUnusedModsCheckbox) {
                this.app.elements.hideUnusedModsCheckbox.checked = this.app.hideUnusedMods;
            }
        }
        
        if (this.app.userConfig.theme !== undefined) {
            this.applyTheme(this.app.userConfig.theme);
        }
    }
    
    closeSettings() {
        this.app.elements.settingsDialog.classList.remove('show');
    }
}
