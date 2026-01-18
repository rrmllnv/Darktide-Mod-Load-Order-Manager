import { ConfigManager } from '../../managers/ConfigManager.js';

export class SettingsComponent {
    constructor(app) {
        this.app = app;
    }
    
    async init() {
        this.bindEvents();
        this.updateLocalization();
    }
    
    t(key, params = {}) {
        if (this.app.localeManager) {
            return this.app.localeManager.t(key, params);
        }
        return this.app.t(key, params);
    }
    
    bindEvents() {
        if (this.app.elements.settingsBtn) {
            this.app.elements.settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }
    }
    
    bindSectionSwitchers() {
        const menuItems = document.querySelectorAll('.settings-menu-item');
        menuItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                const section = newItem.getAttribute('data-section');
                if (section) {
                    this.switchSection(section);
                }
            });
        });
    }
    
    switchSection(sectionName) {
        const menuItems = document.querySelectorAll('.settings-menu-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        const contentSections = document.querySelectorAll('.settings-content-section');
        contentSections.forEach(section => {
            section.classList.remove('active');
        });
        
        const activeMenuItem = document.querySelector(`.settings-menu-item[data-section="${sectionName}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
        
        const activeSection = document.getElementById(`settings-section-${sectionName}`);
        if (activeSection) {
            activeSection.classList.add('active');
        }
    }
    
    openSettings() {
        this.loadSettingsToForm();
        
        this.bindSectionSwitchers();
        
        this.switchSection('general');
        
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
        
        const handleOk = async () => {
            this.saveSettingsFromForm();
            
            const restartTourCheckbox = document.getElementById('settings-restart-tour-checkbox');
            let shouldRestartTour = false;
            
            if (restartTourCheckbox && restartTourCheckbox.checked) {
                if (!this.app.userConfig) {
                    this.app.userConfig = ConfigManager.getDefaultUserConfig();
                }
                this.app.userConfig.tourCompleted = false;
                this.app.userConfig.browseTourCompleted = false;
                
                if (this.app.configManager && this.app.configManager.saveUserConfig) {
                    await this.app.configManager.saveUserConfig();
                }
                
                restartTourCheckbox.checked = false;
                shouldRestartTour = true;
            }
            
            if (this.app.settingsManager && this.app.settingsManager.applySettings) {
                this.app.settingsManager.applySettings();
            }
            
            this.closeSettings();
            
            if (shouldRestartTour) {
                await this.startTourAfterClose();
            }
            
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
    
    async startTourAfterClose() {
        if (!this.app.tourComponent) {
            return;
        }
        
        if (!this.app.tourComponent.elements) {
            await this.app.tourComponent.init();
        }
        
        if (this.app.tourComponent.isActive) {
            this.app.tourComponent.isActive = false;
        }
        
        if (this.app.filePath) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.common.welcome'),
                this.app.t('messages.common.welcomeFileFound')
            );
            setTimeout(() => {
                this.app.tourComponent.startTour();
            }, 300);
        } else {
            setTimeout(() => {
                this.app.tourComponent.startBrowseTour();
            }, 300);
        }
    }
    
    updateLocalization() {
        const settingsTitle = document.querySelector('#settings-dialog .modal-title');
        if (settingsTitle) {
            settingsTitle.textContent = this.t('ui.settings.settings');
        }
        
        const settingsThemeLabel = document.getElementById('settings-theme-label');
        if (settingsThemeLabel) {
            settingsThemeLabel.textContent = this.t('ui.settings.theme');
        }
        
        const settingsLocaleLabel = document.getElementById('settings-locale-label');
        if (settingsLocaleLabel) {
            settingsLocaleLabel.textContent = this.t('ui.settings.locale');
        }
        
        if (this.app.elements.settingsOkBtn) {
            this.app.elements.settingsOkBtn.textContent = this.t('ui.common.save');
        }
        
        if (this.app.elements.settingsCancelBtn) {
            this.app.elements.settingsCancelBtn.textContent = this.t('ui.common.cancel');
        }
        
        if (this.app.elements.settingsBtn) {
            this.app.elements.settingsBtn.title = this.t('ui.settings.settings');
        }
        
        const restartTourLabel = document.getElementById('settings-restart-tour-label');
        if (restartTourLabel) {
            restartTourLabel.textContent = this.t('ui.settings.restartTour');
        }
    }
}
