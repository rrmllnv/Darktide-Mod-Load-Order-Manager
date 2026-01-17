// Менеджер для привязки событий UI
export class EventBinder {
    constructor(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.bindAll();
    }
    
    bindAll() {
        // Кнопки управления файлом
        this.elements.browseBtn.addEventListener('click', () => this.callbacks.browseFile());
        
        // Запуск dtkit-patch
        if (this.elements.launchDtkitBtn) {
            this.elements.launchDtkitBtn.addEventListener('click', () => this.callbacks.launchDtkitPatch());
        }
        
        // Сортировка
        this.elements.sortSelect.addEventListener('change', () => this.callbacks.onSortChange());
        
        // Массовые операции
        this.elements.enableAllBtn.addEventListener('click', () => this.callbacks.enableAll());
        this.elements.disableAllBtn.addEventListener('click', () => this.callbacks.disableAll());
        this.elements.scanBtn.addEventListener('click', () => this.callbacks.scanAndUpdate());
        
        // Выделение модов
        if (this.elements.bulkSelectEnabledBtn) {
            this.elements.bulkSelectEnabledBtn.addEventListener('click', () => this.callbacks.bulkSelectEnabled());
        }
        if (this.elements.bulkSelectDisabledBtn) {
            this.elements.bulkSelectDisabledBtn.addEventListener('click', () => this.callbacks.bulkSelectDisabled());
        }
        
        // Поиск
        this.elements.searchInput.addEventListener('input', () => this.callbacks.onSearchChange());
        this.elements.clearSearchBtn.addEventListener('click', () => this.callbacks.clearSearch());
        
        // Скрытие новых модов
        this.elements.hideNewModsCheckbox.addEventListener('change', () => {
            this.callbacks.onHideNewModsChange(this.elements.hideNewModsCheckbox.checked);
        });
        
        // Скрытие не используемых модов
        this.elements.hideUnusedModsCheckbox.addEventListener('change', () => {
            this.callbacks.onHideUnusedModsChange(this.elements.hideUnusedModsCheckbox.checked);
        });
        
        // Скрытие не найденных модов
        if (this.elements.hideNotFoundModsCheckbox) {
            this.elements.hideNotFoundModsCheckbox.addEventListener('change', () => {
                this.callbacks.onHideNotFoundModsChange(this.elements.hideNotFoundModsCheckbox.checked);
            });
        }
        
        // Кнопка добавления мода (dropdown)
        if (this.elements.addModBtn) {
            this.elements.addModBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.elements.addModDropdown) {
                    this.elements.addModDropdown.classList.toggle('show');
                }
            });
        }
        
        // Закрытие dropdown при клике вне его
        document.addEventListener('click', (e) => {
            if (this.elements.addModDropdown && 
                !this.elements.addModDropdown.contains(e.target) && 
                !this.elements.addModBtn?.contains(e.target)) {
                this.elements.addModDropdown.classList.remove('show');
            }
        });
        
        // Добавление папки мода
        if (this.elements.addModFolderBtn) {
            this.elements.addModFolderBtn.addEventListener('click', () => {
                if (this.elements.addModDropdown) {
                    this.elements.addModDropdown.classList.remove('show');
                }
                this.callbacks.addModFolder();
            });
        }
        
        // Создание симлинка
        if (this.elements.createSymlinkBtn) {
            this.elements.createSymlinkBtn.addEventListener('click', () => {
                if (this.elements.addModDropdown) {
                    this.elements.addModDropdown.classList.remove('show');
                }
                this.callbacks.createSymlinkForMod();
            });
        }
        
        // Профили
        this.elements.newProfileBtn.addEventListener('click', () => this.callbacks.saveCurrentProfile());
        this.elements.overwriteProfileBtn.addEventListener('click', () => this.callbacks.overwriteSelectedProfile());
        this.elements.loadProfileBtn.addEventListener('click', () => this.callbacks.loadSelectedProfile());
        this.elements.reloadFileBtn.addEventListener('click', () => this.callbacks.reloadFile());
        this.elements.renameProfileBtn.addEventListener('click', () => this.callbacks.renameSelectedProfile());
        this.elements.deleteProfileBtn.addEventListener('click', () => this.callbacks.deleteSelectedProfile());
        
        // Сохранение
        this.elements.saveBtn.addEventListener('click', () => this.callbacks.saveFile());
        this.elements.cancelBtn.addEventListener('click', () => this.callbacks.loadFile());
        
        // Настройки
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.callbacks.openSettings());
        }
        
        // Массовые действия
        if (this.elements.bulkEnableBtn) {
            this.elements.bulkEnableBtn.addEventListener('click', () => this.callbacks.bulkEnable());
        }
        if (this.elements.bulkDisableBtn) {
            this.elements.bulkDisableBtn.addEventListener('click', () => this.callbacks.bulkDisable());
        }
        if (this.elements.bulkDeleteBtn) {
            this.elements.bulkDeleteBtn.addEventListener('click', () => this.callbacks.bulkDelete());
        }
        if (this.elements.bulkClearSelectionBtn) {
            this.elements.bulkClearSelectionBtn.addEventListener('click', () => this.callbacks.bulkClearSelection());
        }
    }
}
