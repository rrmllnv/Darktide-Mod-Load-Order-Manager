import { ModEntry } from '../../models/ModEntry.js';

export class ProfileComponent {
    constructor(app) {
        this.app = app;
        this.profilesDir = null;
        this.selectedProfileName = null;
        this.locales = {};
    }
    
    async init() {
        this.loadStyles();
        await this.loadLocales();
        await this.updateLocalization();
        await this.initProfilesDirectory();
        this.bindEvents();
    }
    
    loadStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'components/profile/styles/profile.css';
        link.setAttribute('data-profile-style', 'profile.css');
        
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
            const response = await fetch(`components/profile/locales/${locale}.json`);
            if (response.ok) {
                this.locales[locale] = await response.json();
                return this.locales[locale];
            } else {
                if (locale !== 'en') {
                    return await this.loadLocale('en');
                }
            }
        } catch (error) {
            console.warn(`Failed to load profile locale ${locale}:`, error);
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
    
    async initProfilesDirectory() {
        try {
            const modsDir = this.app.filePath ? this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\')) : '';
            if (!modsDir) {
                if (!this.app.defaultPath) {
                    console.warn('defaultPath not available yet, skipping profiles initialization');
                    return;
                }
                const defaultModsDir = this.app.defaultPath.substring(0, this.app.defaultPath.lastIndexOf('\\'));
                const result = await window.electronAPI.getProfilesDirectory(defaultModsDir);
                if (result.success) {
                    this.profilesDir = result.path;
                    this.app.profilesDir = result.path;
                }
            } else {
                const result = await window.electronAPI.getProfilesDirectory(modsDir);
                if (result.success) {
                    this.profilesDir = result.path;
                    this.app.profilesDir = result.path;
                }
            }
            
            await this.refreshProfilesList();
        } catch (error) {
            console.error('Error initializing profiles directory:', error);
        }
    }
    
    bindEvents() {
        if (this.app.elements.profilesList) {
            this.app.elements.profilesList.addEventListener('change', () => {
                this.onProfileSelectionChange();
            });
            
            this.app.elements.profilesList.addEventListener('blur', () => {
                this.onProfileListBlur();
            });
        }
        
        if (this.app.elements.newProfileBtn) {
            this.app.elements.newProfileBtn.addEventListener('click', () => {
                this.saveCurrentProfile();
            });
        }
        
        if (this.app.elements.loadProfileBtn) {
            this.app.elements.loadProfileBtn.addEventListener('click', () => {
                this.loadSelectedProfile();
            });
        }
        
        if (this.app.elements.overwriteProfileBtn) {
            this.app.elements.overwriteProfileBtn.addEventListener('click', () => {
                this.overwriteSelectedProfile();
            });
        }
        
        if (this.app.elements.renameProfileBtn) {
            this.app.elements.renameProfileBtn.addEventListener('click', () => {
                this.renameSelectedProfile();
            });
        }
        
        if (this.app.elements.deleteProfileBtn) {
            this.app.elements.deleteProfileBtn.addEventListener('click', () => {
                this.deleteSelectedProfile();
            });
        }
    }
    
    onProfileSelectionChange() {
        const selectedOption = this.app.elements.profilesList.options[this.app.elements.profilesList.selectedIndex];
        if (selectedOption) {
            this.selectedProfileName = selectedOption.value;
            this.app.selectedProfileName = selectedOption.value;
        } else {
            this.selectedProfileName = null;
            this.app.selectedProfileName = null;
        }
        this.updateProfileListStyles();
    }
    
    onProfileListBlur() {
        this.updateProfileListStyles();
    }
    
    updateProfileListStyles() {
        Array.from(this.app.elements.profilesList.options).forEach(option => {
            if (option.value === this.selectedProfileName) {
                option.classList.add('selected-no-focus');
            } else {
                option.classList.remove('selected-no-focus');
            }
        });
    }
    
    async updateLocalization() {
        const t = (key) => this.t(key);
        
        const profilesLabel = document.querySelector('.profiles-frame .section-label');
        if (profilesLabel) profilesLabel.textContent = t('ui.profiles');
        
        if (this.app.elements.newProfileBtn) this.app.elements.newProfileBtn.title = t('ui.newProfile');
        if (this.app.elements.loadProfileBtn) this.app.elements.loadProfileBtn.title = t('ui.loadProfile');
        if (this.app.elements.overwriteProfileBtn) this.app.elements.overwriteProfileBtn.title = t('ui.overwriteProfile');
        if (this.app.elements.renameProfileBtn) this.app.elements.renameProfileBtn.title = t('ui.renameProfile');
        if (this.app.elements.deleteProfileBtn) this.app.elements.deleteProfileBtn.title = t('ui.deleteProfile');
        
        if (this.app.elements.modalTitle) this.app.elements.modalTitle.textContent = t('ui.enterProfileName');
        if (this.app.elements.profileNameInput) this.app.elements.profileNameInput.placeholder = t('ui.profileNamePlaceholder');
    }
    
    saveCurrentState() {
        const settings = {
            hideNewMods: this.app.hideNewMods || false,
            hideNotFoundMods: this.app.hideNotFoundMods || false,
            hideUnusedMods: this.app.hideUnusedMods || false,
            sort: this.app.elements.sortSelect ? this.app.elements.sortSelect.value : null
        };
        
        const modsToSave = this.app.modEntries.filter(modEntry => {
            if (modEntry.isNew && !modEntry.enabled) {
                return false;
            }
            return true;
        });
        
        const sortedMods = [...modsToSave].sort((a, b) => a.orderIndex - b.orderIndex);
        
        const state = {
            _order: [],
            _mods: {},
            _settings: {
                hideNewMods: settings.hideNewMods || false,
                hideNotFoundMods: settings.hideNotFoundMods || false,
                hideUnusedMods: settings.hideUnusedMods || false,
                sort: settings.sort || null
            }
        };
        
        for (const modEntry of sortedMods) {
            state._order.push(modEntry.name);
            state._mods[modEntry.name] = modEntry.enabled;
        }
        
        return state;
    }
    
    restoreState(state) {
        if (!state) {
            this.app.modEntries = [];
            return;
        }
        
        if (!state._order || !state._mods) {
            this.app.modEntries = [];
            return;
        }
        
        const profileOrder = state._order;
        const profileMods = state._mods;
        const profileSettings = state._settings || null;
        
        const profileModNames = new Set(profileOrder);
        
        const existingModsMap = new Map();
        for (const modEntry of this.app.modEntries) {
            existingModsMap.set(modEntry.name, modEntry);
        }
        
        const restoredMods = [];
        const maxOrderIndex = Math.max(...this.app.modEntries.map(m => m.orderIndex), 0);
        
        profileOrder.forEach((modName, index) => {
            const enabled = profileMods[modName];
            const existingMod = existingModsMap.get(modName);
            
            if (existingMod) {
                existingMod.enabled = enabled;
                existingMod.orderIndex = index;
                existingMod.isNew = false;
                restoredMods.push(existingMod);
                existingModsMap.delete(modName);
            } else {
                restoredMods.push(new ModEntry(
                    modName,
                    enabled,
                    enabled ? modName : `--${modName}`,
                    false,
                    index,
                    false,
                    false
                ));
            }
        });
        
        for (const [modName, modEntry] of existingModsMap) {
            if (!modEntry.isNew) {
                modEntry.isNew = true;
            }
            modEntry.enabled = false;
            modEntry.orderIndex = maxOrderIndex + 1000 + restoredMods.length;
            restoredMods.push(modEntry);
        }
        
        this.app.modEntries = restoredMods;
        
        if (profileSettings) {
            this.app.hideNewMods = profileSettings.hideNewMods || false;
            this.app.hideNotFoundMods = profileSettings.hideNotFoundMods || false;
            this.app.hideUnusedMods = profileSettings.hideUnusedMods || false;
            
            if (this.app.elements.hideNewModsCheckbox) {
                this.app.elements.hideNewModsCheckbox.checked = this.app.hideNewMods;
            }
            if (this.app.elements.hideNotFoundModsCheckbox) {
                this.app.elements.hideNotFoundModsCheckbox.checked = this.app.hideNotFoundMods;
            }
            if (this.app.elements.hideUnusedModsCheckbox) {
                this.app.elements.hideUnusedModsCheckbox.checked = this.app.hideUnusedMods;
            }
            
            if (profileSettings.sort && this.app.elements.sortSelect) {
                const sortValue = profileSettings.sort;
                const validSortKeys = ['fileOrder', 'name', 'status', 'newFirst'];
                
                if (validSortKeys.includes(sortValue)) {
                    const option = Array.from(this.app.elements.sortSelect.options).find(opt => opt.value === sortValue);
                    if (option) {
                        this.app.elements.sortSelect.value = sortValue;
                    } else {
                        this.app.elements.sortSelect.value = 'fileOrder';
                    }
                } else {
                    this.app.elements.sortSelect.value = 'fileOrder';
                }
            }
        }
        
        this.app.modEntries.forEach(modEntry => {
            modEntry.checkbox = null;
            modEntry.statusElement = null;
            modEntry.modItem = null;
        });
        
        if (this.app.modListComponent) {
            this.app.modListComponent.modEntries = this.app.modEntries;
        }
        
        if (this.app.modListComponent) {
            this.app.modListComponent.clearSelection();
        }
        
        if (this.app.modListComponent) {
            this.app.modListComponent.updateModList();
        }
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
    }
    
    async refreshProfilesList() {
        if (!this.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        const previouslySelectedProfile = this.selectedProfileName;
        this.app.elements.profilesList.innerHTML = '';
        
        if (!this.profilesDir) {
            return;
        }
        
        try {
            const result = await window.electronAPI.listProfiles(this.profilesDir);
            if (result.success) {
                result.profiles.forEach(profileName => {
                    const option = document.createElement('option');
                    option.value = profileName;
                    option.textContent = profileName;
                    this.app.elements.profilesList.appendChild(option);
                });
                
                if (previouslySelectedProfile && result.profiles.includes(previouslySelectedProfile)) {
                    this.app.elements.profilesList.value = previouslySelectedProfile;
                    this.selectedProfileName = previouslySelectedProfile;
                    this.app.selectedProfileName = previouslySelectedProfile;
                } else {
                    this.app.elements.profilesList.selectedIndex = -1;
                    this.selectedProfileName = null;
                    this.app.selectedProfileName = null;
                }
            }
        } catch (error) {
            console.error('Error refreshing profiles list:', error);
        }
    }
    
    async saveCurrentProfile() {
        if (!this.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        if (!this.app.modalManager) {
            console.error('ModalManager not initialized');
            return;
        }
        
        this.app.modalManager.showModal(this.t('ui.enterProfileName') + ':', '', async (profileName) => {
            if (!profileName) {
                return;
            }
            
            const cleanName = profileName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            if (!cleanName) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.invalidProfileName'));
                return;
            }
            
            try {
                const state = this.saveCurrentState();
                const result = await window.electronAPI.saveProfile(this.profilesDir, cleanName, state);
                
                if (!result.success) {
                    await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToSaveProfile')}\n${result.error}`);
                    return;
                }
                
                await this.refreshProfilesList();
                await this.app.uiManager.showMessage(this.app.t('messages.success'), this.t('messages.profileSaved', { profileName: cleanName }));
            } catch (error) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToSaveProfile')}\n${error.message}`);
            }
        });
    }
    
    async loadSelectedProfile() {
        if (!this.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.selectProfileFromList'));
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        try {
            const result = await window.electronAPI.loadProfile(this.profilesDir, profileName);
            if (!result.success) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToLoadProfile')}\n${result.error}`);
                return;
            }
            
            this.restoreState(result.state);
            
                        if (this.app.modListComponent) {
                            this.app.modListComponent.modEntries = this.app.modEntries;
                        }
                        
                        if (this.app.modScanService) {
                            const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, this.app.selectedModName);
                            this.app.selectedModName = scanResult.selectedModName;
                            
                            if (this.app.modListComponent) {
                                this.app.modListComponent.modEntries = this.app.modEntries;
                            }
                
                if (scanResult.removed > 0) {
                    const currentSelected = Array.from(this.app.selectedModNames);
                    currentSelected.forEach(modName => {
                        if (!this.app.modEntries.find(m => m.name === modName)) {
                            this.app.selectedModNames.delete(modName);
                        }
                    });
                }
                
                    if (this.app.modListComponent) {
                        this.app.modListComponent.updateModList();
                    }
                if (this.app.updateStatistics) {
                    this.app.updateStatistics();
                }
            }
            
            await this.app.uiManager.showMessage(this.app.t('messages.success'), this.t('messages.profileLoaded', { profileName }));
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToLoadProfile')}\n${error.message}`);
        }
    }
    
    async renameSelectedProfile() {
        if (!this.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.selectProfileFromList'));
            return;
        }
        
        const oldProfileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        if (!this.app.modalManager) {
            console.error('ModalManager not initialized');
            return;
        }
        
        this.app.modalManager.showModal(this.t('messages.enterNewProfileName', { oldProfileName }), oldProfileName, async (newProfileName) => {
            if (!newProfileName) {
                return;
            }
            
            const cleanName = newProfileName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            if (!cleanName) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.invalidProfileName'));
                return;
            }
            
            if (cleanName === oldProfileName) {
                return;
            }
            
            try {
                const result = await window.electronAPI.renameProfile(this.profilesDir, oldProfileName, cleanName);
                if (!result.success) {
                    await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToRenameProfile')}\n${result.error}`);
                    return;
                }
                
                await this.refreshProfilesList();
                await this.app.uiManager.showMessage(this.app.t('messages.success'), this.t('messages.profileRenamed', { oldProfileName, newProfileName: cleanName }));
            } catch (error) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToRenameProfile')}\n${error.message}`);
            }
        });
    }
    
    async overwriteSelectedProfile() {
        if (!this.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.selectProfileToOverwrite'));
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        const confirmed = await this.app.uiManager.showConfirm(this.t('messages.overwriteProfileConfirm', { profileName }));
        if (!confirmed) {
            return;
        }
        
        try {
            const state = this.saveCurrentState();
            const result = await window.electronAPI.saveProfile(this.profilesDir, profileName, state);
            
            if (!result.success) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToOverwriteProfile')}\n${result.error}`);
                return;
            }
            
            await this.app.uiManager.showMessage(this.app.t('messages.success'), this.t('messages.profileOverwritten', { profileName }));
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToOverwriteProfile')}\n${error.message}`);
        }
    }
    
    async deleteSelectedProfile() {
        if (!this.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.t('messages.selectProfileFromList'));
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        const confirmed = await this.app.uiManager.showConfirm(this.t('messages.deleteProfileConfirm', { profileName }));
        if (!confirmed) {
            return;
        }
        
        try {
            const result = await window.electronAPI.deleteProfile(this.profilesDir, profileName);
            if (!result.success) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToDeleteProfile')}\n${result.error}`);
                return;
            }
            
            await this.refreshProfilesList();
            await this.app.uiManager.showMessage(this.app.t('messages.success'), this.t('messages.profileDeleted', { profileName }));
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.t('messages.failedToDeleteProfile')}\n${error.message}`);
        }
    }
}
