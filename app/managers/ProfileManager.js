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
        return this.app.profileService.saveState(this.app.modEntries);
    }
    
    restoreState(state) {
        const result = this.app.profileService.restoreState(state, this.app.modEntries);
        this.app.modEntries = result.modEntries;
        
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
            await this.app.uiManager.showMessage('Ошибка', 'Не удалось определить папку для профилей');
            return;
        }
        
        this.app.modalManager.showModal('Введите имя профиля:', '', async (profileName) => {
            if (!profileName) {
                return;
            }
            
            const cleanName = profileName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            if (!cleanName) {
                await this.app.uiManager.showMessage('Ошибка', 'Недопустимое имя профиля');
                return;
            }
            
            try {
                const state = this.saveCurrentState();
                const result = await this.app.profileService.saveProfile(cleanName, state);
                
                if (!result.success) {
                    await this.app.uiManager.showMessage('Ошибка', `Не удалось сохранить профиль:\n${result.error}`);
                    return;
                }
                
                await this.refreshProfilesList();
                await this.app.uiManager.showMessage('Успех', `Профиль '${cleanName}' сохранен`);
            } catch (error) {
                await this.app.uiManager.showMessage('Ошибка', `Не удалось сохранить профиль:\n${error.message}`);
            }
        });
    }
    
    async loadSelectedProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage('Ошибка', 'Не удалось определить папку для профилей');
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage('Ошибка', 'Выберите профиль из списка');
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        try {
            const result = await this.app.profileService.loadProfile(profileName);
            if (!result.success) {
                await this.app.uiManager.showMessage('Ошибка', `Не удалось загрузить профиль:\n${result.error}`);
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
            
            await this.app.uiManager.showMessage('Успех', `Профиль '${profileName}' загружен`);
        } catch (error) {
            await this.app.uiManager.showMessage('Ошибка', `Не удалось загрузить профиль:\n${error.message}`);
        }
    }
    
    async renameSelectedProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage('Ошибка', 'Не удалось определить папку для профилей');
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage('Ошибка', 'Выберите профиль из списка');
            return;
        }
        
        const oldProfileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        this.app.modalManager.showModal(`Введите новое имя для профиля '${oldProfileName}':`, oldProfileName, async (newProfileName) => {
            if (!newProfileName) {
                return;
            }
            
            const cleanName = newProfileName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            if (!cleanName) {
                await this.app.uiManager.showMessage('Ошибка', 'Недопустимое имя профиля');
                return;
            }
            
            if (cleanName === oldProfileName) {
                return;
            }
            
            try {
                const result = await this.app.profileService.renameProfile(oldProfileName, cleanName);
                if (!result.success) {
                    await this.app.uiManager.showMessage('Ошибка', `Не удалось переименовать профиль:\n${result.error}`);
                    return;
                }
                
                await this.refreshProfilesList();
                await this.app.uiManager.showMessage('Успех', `Профиль '${oldProfileName}' переименован в '${cleanName}'`);
            } catch (error) {
                await this.app.uiManager.showMessage('Ошибка', `Не удалось переименовать профиль:\n${error.message}`);
            }
        });
    }
    
    async overwriteSelectedProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage('Ошибка', 'Не удалось определить папку для профилей');
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage('Ошибка', 'Выберите профиль из списка для перезаписи');
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        const confirmed = await this.app.uiManager.showConfirm(`Перезаписать профиль '${profileName}' текущим состоянием?`);
        if (!confirmed) {
            return;
        }
        
        try {
            const state = this.saveCurrentState();
            const result = await this.app.profileService.saveProfile(profileName, state);
            
            if (!result.success) {
                await this.app.uiManager.showMessage('Ошибка', `Не удалось перезаписать профиль:\n${result.error}`);
                return;
            }
            
            await this.app.uiManager.showMessage('Успех', `Профиль '${profileName}' перезаписан`);
        } catch (error) {
            await this.app.uiManager.showMessage('Ошибка', `Не удалось перезаписать профиль:\n${error.message}`);
        }
    }
    
    async deleteSelectedProfile() {
        if (!this.app.profilesDir) {
            await this.initProfilesDirectory();
        }
        
        if (!this.app.profilesDir) {
            await this.app.uiManager.showMessage('Ошибка', 'Не удалось определить папку для профилей');
            return;
        }
        
        const selectedIndex = this.app.elements.profilesList.selectedIndex;
        if (selectedIndex === -1) {
            await this.app.uiManager.showMessage('Ошибка', 'Выберите профиль из списка');
            return;
        }
        
        const profileName = this.app.elements.profilesList.options[selectedIndex].value;
        
        const confirmed = await this.app.uiManager.showConfirm(`Удалить профиль '${profileName}'?`);
        if (!confirmed) {
            return;
        }
        
        try {
            const result = await this.app.profileService.deleteProfile(profileName);
            if (!result.success) {
                await this.app.uiManager.showMessage('Ошибка', `Не удалось удалить профиль:\n${result.error}`);
                return;
            }
            
            await this.refreshProfilesList();
            await this.app.uiManager.showMessage('Успех', `Профиль '${profileName}' удален`);
        } catch (error) {
            await this.app.uiManager.showMessage('Ошибка', `Не удалось удалить профиль:\n${error.message}`);
        }
    }
}
