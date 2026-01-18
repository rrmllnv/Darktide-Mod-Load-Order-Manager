import { ConfigManager } from '../../managers/ConfigManager.js';

export class SettingsComponent {
    constructor(app) {
        this.app = app;
        this.locales = {};
    }
    
    async init() {
        this.loadStyles();
        await this.loadLocales();
        this.bindEvents();
        this.updateLocalization();
    }
    
    loadStyles() {
        const existingLink = document.querySelector('link[data-settings-style="settings.css"]');
        if (existingLink) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'components/settings/styles/settings.css';
        link.setAttribute('data-settings-style', 'settings.css');
        
        const baseLink = document.querySelector('link[href="styles/base.css"]');
        if (baseLink && baseLink.nextSibling) {
            baseLink.parentNode.insertBefore(link, baseLink.nextSibling);
        } else {
            document.head.appendChild(link);
        }
    }
    
    async loadLocales() {
        const currentLocale = this.app.localeManager ? this.app.localeManager.getCurrentLocale() || 'en' : 'en';
        await this.loadLocale(currentLocale);
    }
    
    async loadLocale(locale) {
        if (this.locales[locale]) {
            return this.locales[locale];
        }
        
        try {
            const response = await fetch(`components/settings/locales/${locale}.json`);
            if (response.ok) {
                this.locales[locale] = await response.json();
                return this.locales[locale];
            } else {
                if (locale !== 'en') {
                    return await this.loadLocale('en');
                }
            }
        } catch (error) {
            console.warn(`Failed to load settings locale ${locale}:`, error);
            if (locale !== 'en') {
                return await this.loadLocale('en');
            }
        }
        
        return null;
    }
    
    t(key, params = {}) {
        const currentLocale = this.app.localeManager ? this.app.localeManager.getCurrentLocale() || 'en' : 'en';
        const localeData = this.locales[currentLocale] || this.locales['en'] || {};
        
        const keys = key.split('.');
        let value = localeData;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return this.app.t(key, params);
            }
        }
        
        if (typeof value !== 'string') {
            return this.app.t(key, params);
        }
        
        if (Object.keys(params).length > 0) {
            return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }
        
        return value;
    }
    
    bindEvents() {
        if (this.app.elements.settingsBtn) {
            this.app.elements.settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }
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
            
            if (this.app.settingsManager && this.app.settingsManager.applySettings) {
                this.app.settingsManager.applySettings();
            }
            
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
            this.app.userConfig.locale = this.app.elements.settingsLocaleSelect.value || 'en';
        }
        
        if (this.app.configManager && this.app.configManager.saveUserConfig) {
            this.app.configManager.saveUserConfig();
        }
    }
    
    closeSettings() {
        this.app.elements.settingsDialog.classList.remove('show');
    }
    
    updateLocalization() {
        const settingsTitle = document.querySelector('#settings-dialog .modal-title');
        if (settingsTitle) {
            settingsTitle.textContent = this.t('ui.settings');
        }
        
        const settingsThemeLabel = document.getElementById('settings-theme-label');
        if (settingsThemeLabel) {
            settingsThemeLabel.textContent = this.t('ui.theme');
        }
        
        const settingsLocaleLabel = document.getElementById('settings-locale-label');
        if (settingsLocaleLabel) {
            settingsLocaleLabel.textContent = this.t('ui.locale');
        }
        
        if (this.app.elements.settingsOkBtn) {
            this.app.elements.settingsOkBtn.textContent = this.t('ui.save');
        }
        
        if (this.app.elements.settingsCancelBtn) {
            this.app.elements.settingsCancelBtn.textContent = this.t('ui.cancel');
        }
        
        if (this.app.elements.settingsBtn) {
            this.app.elements.settingsBtn.title = this.t('ui.settings');
        }
    }
}
