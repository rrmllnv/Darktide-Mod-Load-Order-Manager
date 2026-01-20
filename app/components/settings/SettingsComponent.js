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
    
    bindProjectPathBrowse() {
        const browseBtn = document.getElementById('settings-project-path-browse-btn');
        if (browseBtn) {
            const newBrowseBtn = browseBtn.cloneNode(true);
            browseBtn.parentNode.replaceChild(newBrowseBtn, browseBtn);
            
            newBrowseBtn.addEventListener('click', async () => {
                try {
                    const result = await window.electronAPI.selectFolder();
                    if (result.success && result.folderPath) {
                        const projectPathInput = document.getElementById('settings-project-path-input');
                        if (projectPathInput) {
                            projectPathInput.value = result.folderPath;
                        }
                    }
                } catch (error) {
                    console.error('Error selecting project folder:', error);
                }
            });
        }
    }
    
    openSettings() {
        this.loadSettingsToForm();
        
        this.bindSectionSwitchers();
        this.bindProjectPathBrowse();
        
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
            
            if (this.app.developerComponent && this.app.developerComponent.updateVisibility) {
                this.app.developerComponent.updateVisibility();
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
        
        const saveProfileHideNewMods = document.getElementById('settings-save-profile-hide-new-mods');
        if (saveProfileHideNewMods) {
            saveProfileHideNewMods.checked = this.app.userConfig.saveProfileHideNewMods !== undefined ? this.app.userConfig.saveProfileHideNewMods : true;
        }
        
        const saveProfileHideNotFoundMods = document.getElementById('settings-save-profile-hide-not-found-mods');
        if (saveProfileHideNotFoundMods) {
            saveProfileHideNotFoundMods.checked = this.app.userConfig.saveProfileHideNotFoundMods !== undefined ? this.app.userConfig.saveProfileHideNotFoundMods : true;
        }
        
        const saveProfileHideUnusedMods = document.getElementById('settings-save-profile-hide-unused-mods');
        if (saveProfileHideUnusedMods) {
            saveProfileHideUnusedMods.checked = this.app.userConfig.saveProfileHideUnusedMods !== undefined ? this.app.userConfig.saveProfileHideUnusedMods : true;
        }
        
        const saveProfileSort = document.getElementById('settings-save-profile-sort');
        if (saveProfileSort) {
            saveProfileSort.checked = this.app.userConfig.saveProfileSort !== undefined ? this.app.userConfig.saveProfileSort : true;
        }
        
        const profilesListSize = document.getElementById('settings-profiles-list-size');
        if (profilesListSize) {
            profilesListSize.value = this.app.userConfig.profilesListSize !== undefined ? this.app.userConfig.profilesListSize : 6;
        }
        
        const developerMode = document.getElementById('settings-developer-mode-checkbox');
        if (developerMode) {
            developerMode.checked = this.app.userConfig.developerMode !== undefined ? this.app.userConfig.developerMode : false;
        }
        
        const projectPathInput = document.getElementById('settings-project-path-input');
        if (projectPathInput) {
            projectPathInput.value = this.app.userConfig.projectPath || '';
        }
        
        const todosGroupByMod = document.getElementById('settings-todos-group-by-mod-checkbox');
        if (todosGroupByMod) {
            todosGroupByMod.checked = this.app.userConfig.todosGroupByMod !== undefined ? this.app.userConfig.todosGroupByMod : true;
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
        
        const saveProfileHideNewMods = document.getElementById('settings-save-profile-hide-new-mods');
        if (saveProfileHideNewMods) {
            this.app.userConfig.saveProfileHideNewMods = saveProfileHideNewMods.checked;
        }
        
        const saveProfileHideNotFoundMods = document.getElementById('settings-save-profile-hide-not-found-mods');
        if (saveProfileHideNotFoundMods) {
            this.app.userConfig.saveProfileHideNotFoundMods = saveProfileHideNotFoundMods.checked;
        }
        
        const saveProfileHideUnusedMods = document.getElementById('settings-save-profile-hide-unused-mods');
        if (saveProfileHideUnusedMods) {
            this.app.userConfig.saveProfileHideUnusedMods = saveProfileHideUnusedMods.checked;
        }
        
        const saveProfileSort = document.getElementById('settings-save-profile-sort');
        if (saveProfileSort) {
            this.app.userConfig.saveProfileSort = saveProfileSort.checked;
        }
        
        const profilesListSize = document.getElementById('settings-profiles-list-size');
        if (profilesListSize) {
            const sizeValue = parseInt(profilesListSize.value, 10);
            if (!isNaN(sizeValue) && sizeValue >= 3 && sizeValue <= 20) {
                this.app.userConfig.profilesListSize = sizeValue;
            } else {
                this.app.userConfig.profilesListSize = 6;
            }
            
            if (this.app.elements.profilesList) {
                this.app.elements.profilesList.size = this.app.userConfig.profilesListSize;
            }
        }
        
        const developerMode = document.getElementById('settings-developer-mode-checkbox');
        if (developerMode) {
            this.app.userConfig.developerMode = developerMode.checked;
        }
        
        const projectPathInput = document.getElementById('settings-project-path-input');
        if (projectPathInput) {
            this.app.userConfig.projectPath = projectPathInput.value || '';
        }
        
        const todosGroupByMod = document.getElementById('settings-todos-group-by-mod-checkbox');
        if (todosGroupByMod) {
            this.app.userConfig.todosGroupByMod = todosGroupByMod.checked;
        }
        
        if (this.app.configManager && this.app.configManager.saveUserConfig) {
            this.app.configManager.saveUserConfig();
        }
        
        if (this.app.todosComponent && this.app.todosComponent.loadTodos) {
            this.app.todosComponent.loadTodos();
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
        
        const menuItems = document.querySelectorAll('.settings-menu-item-text');
        menuItems.forEach(item => {
            const menuItem = item.closest('.settings-menu-item');
            if (menuItem) {
                const section = menuItem.getAttribute('data-section');
                if (section === 'general') {
                    item.textContent = this.t('ui.settings.general');
                } else if (section === 'profiles') {
                    item.textContent = this.t('ui.settings.profiles');
                } else if (section === 'development') {
                    item.textContent = this.t('ui.settings.development');
                }
            }
        });
        
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
        
        const saveProfileFiltersLabel = document.getElementById('settings-profile-filters-label');
        if (saveProfileFiltersLabel) {
            saveProfileFiltersLabel.textContent = this.t('ui.settings.saveProfileFilters');
        }
        
        const saveProfileHideNewModsLabel = document.getElementById('settings-save-profile-hide-new-mods-label');
        if (saveProfileHideNewModsLabel) {
            saveProfileHideNewModsLabel.textContent = this.t('ui.settings.saveProfileHideNewMods');
        }
        
        const saveProfileHideNotFoundModsLabel = document.getElementById('settings-save-profile-hide-not-found-mods-label');
        if (saveProfileHideNotFoundModsLabel) {
            saveProfileHideNotFoundModsLabel.textContent = this.t('ui.settings.saveProfileHideNotFoundMods');
        }
        
        const saveProfileHideUnusedModsLabel = document.getElementById('settings-save-profile-hide-unused-mods-label');
        if (saveProfileHideUnusedModsLabel) {
            saveProfileHideUnusedModsLabel.textContent = this.t('ui.settings.saveProfileHideUnusedMods');
        }
        
        const saveProfileSortLabel = document.getElementById('settings-save-profile-sort-label');
        if (saveProfileSortLabel) {
            saveProfileSortLabel.textContent = this.t('ui.settings.saveProfileSort');
        }
        
        const profilesListSizeLabel = document.getElementById('settings-profiles-list-size-label');
        if (profilesListSizeLabel) {
            profilesListSizeLabel.textContent = this.t('ui.settings.profilesListSize');
        }
        
        const developerModeLabel = document.getElementById('settings-developer-mode-label');
        if (developerModeLabel) {
            developerModeLabel.textContent = this.t('ui.settings.developerMode');
        }
        
        const todosSectionLabel = document.getElementById('settings-todos-section-label');
        if (todosSectionLabel) {
            todosSectionLabel.textContent = this.t('ui.settings.todosSection');
        }
        
        const todosGroupByModLabel = document.getElementById('settings-todos-group-by-mod-label');
        if (todosGroupByModLabel) {
            todosGroupByModLabel.textContent = this.t('ui.settings.todosGroupByMod');
        }
        if (developerModeLabel) {
            developerModeLabel.textContent = this.t('ui.settings.developerMode');
        }
        
        const projectPathLabel = document.getElementById('settings-project-path-label');
        if (projectPathLabel) {
            projectPathLabel.textContent = this.t('ui.settings.projectPath');
        }
        
        const projectPathBrowseBtn = document.getElementById('settings-project-path-browse-btn');
        if (projectPathBrowseBtn) {
            projectPathBrowseBtn.textContent = this.t('ui.fileOperations.browse');
        }
    }
}
