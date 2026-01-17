// Менеджер управления настройками
export class SettingsManager {
    constructor(app) {
        this.app = app;
    }
    
    // Открытие окна настроек
    openSettings() {
        // Загружаем текущие настройки
        this.loadSettingsToForm();
        
        // Показываем модальное окно
        this.app.elements.settingsDialog.classList.add('show');
        
        // Обработчик Escape для закрытия
        const handleEscape = (e) => {
            if (e.key === 'Escape' && this.app.elements.settingsDialog.classList.contains('show')) {
                handleCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Обработчик клика вне модального окна
        const handleOutsideClick = (e) => {
            if (e.target === this.app.elements.settingsDialog) {
                handleCancel();
                this.app.elements.settingsDialog.removeEventListener('click', handleOutsideClick);
            }
        };
        this.app.elements.settingsDialog.addEventListener('click', handleOutsideClick);
        
        // Обработчик OK
        const handleOk = () => {
            // Сохраняем настройки из формы
            this.saveSettingsFromForm();
            
            // Применяем настройки
            this.applySettings();
            
            // Закрываем окно
            this.closeSettings();
            
            // Удаляем обработчики
            this.app.elements.settingsOkBtn.removeEventListener('click', handleOk);
            this.app.elements.settingsCancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleEscape);
            this.app.elements.settingsDialog.removeEventListener('click', handleOutsideClick);
        };
        
        // Обработчик Отмена
        const handleCancel = () => {
            // Закрываем окно без сохранения
            this.closeSettings();
            
            // Удаляем обработчики
            this.app.elements.settingsOkBtn.removeEventListener('click', handleOk);
            this.app.elements.settingsCancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleEscape);
            this.app.elements.settingsDialog.removeEventListener('click', handleOutsideClick);
        };
        
        // Удаляем старые обработчики, если есть
        const newOkBtn = this.app.elements.settingsOkBtn.cloneNode(true);
        const newCancelBtn = this.app.elements.settingsCancelBtn.cloneNode(true);
        this.app.elements.settingsOkBtn.parentNode.replaceChild(newOkBtn, this.app.elements.settingsOkBtn);
        this.app.elements.settingsCancelBtn.parentNode.replaceChild(newCancelBtn, this.app.elements.settingsCancelBtn);
        this.app.elements.settingsOkBtn = newOkBtn;
        this.app.elements.settingsCancelBtn = newCancelBtn;
        
        // Добавляем обработчики
        this.app.elements.settingsOkBtn.addEventListener('click', handleOk);
        this.app.elements.settingsCancelBtn.addEventListener('click', handleCancel);
    }
    
    // Загрузка настроек в форму
    loadSettingsToForm() {
        if (!this.app.userConfig) {
            return;
        }
        
        // Применяем тему
        if (this.app.elements.settingsThemeSelect) {
            this.app.elements.settingsThemeSelect.value = this.app.userConfig.theme || '';
        }
        
        // Применяем язык
        if (this.app.elements.settingsLocaleSelect) {
            this.app.elements.settingsLocaleSelect.value = this.app.userConfig.locale || 'en';
        }
    }
    
    // Сохранение настроек из формы
    saveSettingsFromForm() {
        // Инициализируем настройки, если их нет
        if (!this.app.userConfig) {
            this.app.userConfig = {
                fileUrlModLoadOrder: '',
                theme: '',
                locale: 'en',
                hideNewMods: false,
                hideDeletedMods: false,
                hideUnusedMods: false
            };
        }
        
        // Обновляем настройки из формы
        if (this.app.elements.settingsThemeSelect) {
            this.app.userConfig.theme = this.app.elements.settingsThemeSelect.value || '';
        }
        
        if (this.app.elements.settingsLocaleSelect) {
            this.app.userConfig.locale = this.app.elements.settingsLocaleSelect.value || 'ru';
        }
        
        // Сохраняем настройки в файл
        this.app.configManager.saveUserConfig();
    }
    
    // Применение настроек к интерфейсу
    async applySettings() {
        if (!this.app.userConfig) {
            return;
        }
        
        // Применяем язык
        if (this.app.userConfig.locale !== undefined) {
            await this.applyLocale(this.app.userConfig.locale);
        }
        
        // Применяем тему
        if (this.app.userConfig.theme !== undefined) {
            this.applyTheme(this.app.userConfig.theme);
        }
    }
    
    // Применение языка
    async applyLocale(locale) {
        await this.app.localeManager.loadLocale(locale);
        this.app.localeManager.setLocale(locale);
        this.app.applyLocalization();
        
        // Обновляем список модов, чтобы применились новые переводы флагов
        if (this.app.modListRenderer && this.app.elements.searchInput) {
            const searchText = this.app.elements.searchInput.value;
            this.app.modManager.updateModList(searchText);
        }
    }
    
    // Применение темы
    applyTheme(theme) {
        const body = document.body;
        
        // Удаляем все классы тем
        body.classList.remove('dark-theme');
        
        // Применяем выбранную тему
        if (theme === 'dark') {
            body.classList.add('dark-theme');
        }
        // Если theme пустая или 'light', применяется светлая тема (по умолчанию)
    }
    
    // Применение всех настроек при загрузке приложения
    applyAllSettings() {
        if (!this.app.userConfig) {
            return;
        }
        
        // Применяем фильтры
        if (this.app.userConfig.hideNewMods !== undefined) {
            this.app.hideNewMods = this.app.userConfig.hideNewMods;
            if (this.app.elements.hideNewModsCheckbox) {
                this.app.elements.hideNewModsCheckbox.checked = this.app.hideNewMods;
            }
        }
        
        if (this.app.userConfig.hideDeletedMods !== undefined) {
            this.app.hideDeletedMods = this.app.userConfig.hideDeletedMods;
            if (this.app.elements.hideDeletedModsCheckbox) {
                this.app.elements.hideDeletedModsCheckbox.checked = this.app.hideDeletedMods;
            }
        }
        
        if (this.app.userConfig.hideUnusedMods !== undefined) {
            this.app.hideUnusedMods = this.app.userConfig.hideUnusedMods;
            if (this.app.elements.hideUnusedModsCheckbox) {
                this.app.elements.hideUnusedModsCheckbox.checked = this.app.hideUnusedMods;
            }
        }
        
        // Применяем тему
        if (this.app.userConfig.theme !== undefined) {
            this.applyTheme(this.app.userConfig.theme);
        }
    }
    
    // Закрытие окна настроек
    closeSettings() {
        this.app.elements.settingsDialog.classList.remove('show');
    }
}
