// Менеджер работы с профилями
import { ProfileService } from '../services/ProfileService.js';

export class ProfileManager {
    constructor(app) {
        this.app = app;
    }
    
    async initProfilesDirectory() {
        try {
            const modsDir = this.app.filePath ? this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\')) : '';
            if (!modsDir) {
                const defaultModsDir = this.app.defaultPath.substring(0, this.app.defaultPath.lastIndexOf('\\'));
                const result = await window.electronAPI.getProfilesDirectory(defaultModsDir);
                if (result.success) {
                    this.app.profilesDir = result.path;
                }
            } else {
                const result = await window.electronAPI.getProfilesDirectory(modsDir);
                if (result.success) {
                    this.app.profilesDir = result.path;
                }
            }
            
            // Инициализация сервиса профилей
            this.app.profileService = new ProfileService(this.app.profilesDir);
            
            // Обновляем список профилей
            await this.refreshProfilesList();
        } catch (error) {
            console.error('Ошибка инициализации папки профилей:', error);
        }
    }
    
    saveCurrentState() {
        const settings = {
            hideNewMods: this.app.hideNewMods || false,
            hideDeletedMods: this.app.hideDeletedMods || false,
            hideUnusedMods: this.app.hideUnusedMods || false,
            sort: this.app.elements.sortSelect ? this.app.elements.sortSelect.value : null
        };
        return this.app.profileService.saveState(this.app.modEntries, settings);
    }
    
    restoreState(state) {
        const result = this.app.profileService.restoreState(state, this.app.modEntries);
        this.app.modEntries = result.modEntries;
        
        // Восстанавливаем настройки из профиля
        if (result.settings) {
            // Восстанавливаем настройки фильтрации
            this.app.hideNewMods = result.settings.hideNewMods || false;
            this.app.hideDeletedMods = result.settings.hideDeletedMods || false;
            this.app.hideUnusedMods = result.settings.hideUnusedMods || false;
            
            // Применяем настройки фильтрации к чекбоксам
            if (this.app.elements.hideNewModsCheckbox) {
                this.app.elements.hideNewModsCheckbox.checked = this.app.hideNewMods;
            }
            if (this.app.elements.hideDeletedModsCheckbox) {
                this.app.elements.hideDeletedModsCheckbox.checked = this.app.hideDeletedMods;
            }
            if (this.app.elements.hideUnusedModsCheckbox) {
                this.app.elements.hideUnusedModsCheckbox.checked = this.app.hideUnusedMods;
            }
            
            // Восстанавливаем сортировку
            if (result.settings.sort && this.app.elements.sortSelect) {
                // Конвертируем старые локализованные значения в ключи
                let sortValue = result.settings.sort;
                if (sortValue === 'По порядку файла') sortValue = 'fileOrder';
                else if (sortValue === 'По имени') sortValue = 'name';
                else if (sortValue === 'По статусу') sortValue = 'status';
                else if (sortValue === 'Новые сначала') sortValue = 'newFirst';
                
                // Проверяем, что значение существует в селекте
                const option = Array.from(this.app.elements.sortSelect.options).find(opt => opt.value === sortValue);
                if (option) {
                    this.app.elements.sortSelect.value = sortValue;
                } else {
                    // Если значение не найдено, используем значение по умолчанию
                    this.app.elements.sortSelect.value = 'fileOrder';
                }
            }
        }
        
        // Очищаем все старые ссылки на DOM элементы, чтобы они не мешали
        this.app.modEntries.forEach(modEntry => {
            modEntry.checkbox = null;
            modEntry.statusElement = null;
            modEntry.modItem = null;
        });
        
        // Обновляем ссылку на modEntries в рендерере
        if (this.app.modListRenderer) {
            this.app.modListRenderer.modEntries = this.app.modEntries;
        }
        
        // Очищаем выбор при восстановлении состояния
        this.app.modManager.clearSelection();
        
        const searchText = this.app.elements.searchInput.value;
        this.app.modManager.updateModList(searchText);
        this.app.updateStatistics();
    }
    
    async refreshProfilesList() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        this.app.elements.profilesList.innerHTML = '';
        
        if (!this.app.profilesDir) {
            return;
        }
        
        try {
            const result = await this.app.profileService.listProfiles();
            if (result.success) {
                result.profiles.forEach(profileName => {
                    const option = document.createElement('option');
                    option.value = profileName;
                    option.textContent = profileName;
                    this.app.elements.profilesList.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Ошибка обновления списка профилей:', error);
        }
    }
    
    async saveCurrentProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        this.app.modalManager.showModal(this.app.t('ui.enterProfileName') + ':', '', async (profileName) => {
            if (!profileName) {
                return;
            }
            
            const cleanName = profileName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            if (!cleanName) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.invalidProfileName'));
                return;
            }
            
            try {
                const state = this.saveCurrentState();
                const result = await this.app.profileService.saveProfile(cleanName, state);
                
                if (!result.success) {
                    await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToSaveProfile')}\n${result.error}`);
                    return;
                }
                
                await this.refreshProfilesList();
                await this.app.uiManager.showMessage(this.app.t('messages.success'), this.app.t('messages.profileSaved', { profileName: cleanName }));
            } catch (error) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToSaveProfile')}\n${error.message}`);
            }
        });
    }
    
    async loadSelectedProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.selectProfileFromList'));
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        try {
            const result = await this.app.profileService.loadProfile(profileName);
            if (!result.success) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToLoadProfile')}\n${result.error}`);
                return;
            }
            
            this.restoreState(result.state);
            
            // Обновляем ссылку на modEntries в рендерере после восстановления
            if (this.app.modListRenderer) {
                this.app.modListRenderer.modEntries = this.app.modEntries;
            }
            
            // Сканируем папку модов после загрузки профиля
            const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, this.app.selectedModName);
            this.app.selectedModName = scanResult.selectedModName;
            
            // Обновляем ссылку на modEntries в рендерере после сканирования
            if (this.app.modListRenderer) {
                this.app.modListRenderer.modEntries = this.app.modEntries;
            }
            
            // Очищаем выбор удаленных модов
            if (scanResult.removed > 0) {
                const currentSelected = Array.from(this.app.selectedModNames);
                currentSelected.forEach(modName => {
                    if (!this.app.modEntries.find(m => m.name === modName)) {
                        this.app.selectedModNames.delete(modName);
                    }
                });
            }
            
            const searchText = this.app.elements.searchInput.value;
            this.app.modManager.updateModList(searchText);
            this.app.updateStatistics();
            
            await this.app.uiManager.showMessage(this.app.t('messages.success'), this.app.t('messages.profileLoaded', { profileName }));
        } catch (error) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToLoadProfile')}\n${error.message}`);
        }
    }
    
    async renameSelectedProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.selectProfileFromList'));
            return;
        }
        
        const oldProfileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        this.app.modalManager.showModal(this.app.t('messages.enterNewProfileName', { oldProfileName }), oldProfileName, async (newProfileName) => {
            if (!newProfileName) {
                return;
            }
            
            const cleanName = newProfileName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            if (!cleanName) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.invalidProfileName'));
                return;
            }
            
            if (cleanName === oldProfileName) {
                return;
            }
            
            try {
                const result = await this.app.profileService.renameProfile(oldProfileName, cleanName);
                if (!result.success) {
                    await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToRenameProfile')}\n${result.error}`);
                    return;
                }
                
                await this.refreshProfilesList();
                await this.app.uiManager.showMessage(this.app.t('messages.success'), this.app.t('messages.profileRenamed', { oldProfileName, newProfileName: cleanName }));
            } catch (error) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToRenameProfile')}\n${error.message}`);
            }
        });
    }
    
    async overwriteSelectedProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.selectProfileToOverwrite'));
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.overwriteProfileConfirm', { profileName }));
        if (!confirmed) {
            return;
        }
        
        try {
            const state = this.saveCurrentState();
            const result = await this.app.profileService.saveProfile(profileName, state);
            
            if (!result.success) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToOverwriteProfile')}\n${result.error}`);
                return;
            }
            
            await this.app.uiManager.showMessage(this.app.t('messages.success'), this.app.t('messages.profileOverwritten', { profileName }));
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToOverwriteProfile')}\n${error.message}`);
        }
    }
    
    async deleteSelectedProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineProfilesDir'));
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.selectProfileFromList'));
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.deleteProfileConfirm', { profileName }));
        if (!confirmed) {
            return;
        }
        
        try {
            const result = await this.app.profileService.deleteProfile(profileName);
            if (!result.success) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToDeleteProfile')}\n${result.error}`);
                return;
            }
            
            await this.refreshProfilesList();
            await this.app.uiManager.showMessage(this.app.t('messages.success'), this.app.t('messages.profileDeleted', { profileName }));
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToDeleteProfile')}\n${error.message}`);
        }
    }
}
