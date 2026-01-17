// Импорты модулей
import { ModEntry } from './models/ModEntry.js';
import { FileService } from './services/FileService.js';
import { ProfileService } from './services/ProfileService.js';
import { ModScanService } from './services/ModScanService.js';
import { ModalManager } from './ui/ModalManager.js';
import { ModListRenderer } from './ui/ModListRenderer.js';
import { EventBinder } from './ui/EventBinder.js';
import { StatusManager } from './utils/StatusManager.js';
import { LocaleManager } from './utils/LocaleManager.js';
import { ConfigManager } from './managers/ConfigManager.js';
import { FileManager } from './managers/FileManager.js';
import { ProfileManager } from './managers/ProfileManager.js';
import { ModManager } from './managers/ModManager.js';
import { UIManager } from './managers/UIManager.js';
import { BulkOperationsManager } from './managers/BulkOperationsManager.js';
import { SettingsManager } from './managers/SettingsManager.js';

// Главный класс приложения
class ModLoadOrderManager {
    constructor() {
        // Путь к файлу mod_load_order.txt
        this.defaultPath = '';
        this.filePath = '';
        
        // Данные
        this.headerLines = [];
        this.modEntries = [];
        this.selectedModName = ''; // Одиночный выбор (для совместимости)
        this.selectedModNames = new Set(); // Множественный выбор
        this.lastSelectedModIndex = -1; // Для Shift+Click
        this.hideNewMods = false;
        this.hideUnusedMods = false;
        this.hideDeletedMods = false;
        
        // Система профилей
        this.savedState = null;
        this.profilesDir = null;
        
        // Настройки
        this.userConfig = null;
        
        // Элементы интерфейса
        this.elements = {};
        
        // Сервисы и менеджеры
        this.fileService = null;
        this.profileService = null;
        this.modScanService = null;
        this.modalManager = null;
        this.modListRenderer = null;
        this.statusManager = null;
        this.eventBinder = null;
        
        // Менеджеры функциональности
        this.localeManager = new LocaleManager();
        this.configManager = new ConfigManager(this);
        this.fileManager = new FileManager(this);
        this.profileManager = new ProfileManager(this);
        this.modManager = new ModManager(this);
        this.uiManager = new UIManager(this);
        this.bulkOperationsManager = new BulkOperationsManager(this);
        this.settingsManager = new SettingsManager(this);
        
        // Инициализация
        this.init();
    }
    
    async init() {
        // Получаем элементы интерфейса
        this.elements = {
            pathInput: document.getElementById('path-input'),
            browseBtn: document.getElementById('browse-btn'),
            loadBtn: document.getElementById('load-btn'),
            sortSelect: document.getElementById('sort-select'),
            enableAllBtn: document.getElementById('enable-all-btn'),
            disableAllBtn: document.getElementById('disable-all-btn'),
            scanBtn: document.getElementById('scan-btn'),
            modsList: document.getElementById('mods-list'),
            searchInput: document.getElementById('search-input'),
            clearSearchBtn: document.getElementById('clear-search-btn'),
            hideNewModsCheckbox: document.getElementById('hide-new-mods-checkbox'),
            hideUnusedModsCheckbox: document.getElementById('hide-unused-mods-checkbox'),
            hideDeletedModsCheckbox: document.getElementById('hide-deleted-mods-checkbox'),
            createSymlinkBtn: document.getElementById('create-symlink-btn'),
            profilesList: document.getElementById('profiles-list'),
            newProfileBtn: document.getElementById('new-profile-btn'),
            overwriteProfileBtn: document.getElementById('overwrite-profile-btn'),
            loadProfileBtn: document.getElementById('load-profile-btn'),
            reloadFileBtn: document.getElementById('reload-file-btn'),
            renameProfileBtn: document.getElementById('rename-profile-btn'),
            deleteProfileBtn: document.getElementById('delete-profile-btn'),
            saveBtn: document.getElementById('save-btn'),
            cancelBtn: document.getElementById('cancel-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            statusText: document.getElementById('status-text'),
            settingsDialog: document.getElementById('settings-dialog'),
            settingsThemeSelect: document.getElementById('settings-theme-select'),
            settingsLocaleSelect: document.getElementById('settings-locale-select'),
            settingsOkBtn: document.getElementById('settings-ok-btn'),
            settingsCancelBtn: document.getElementById('settings-cancel-btn'),
            profileDialog: document.getElementById('profile-dialog'),
            modalTitle: document.getElementById('modal-title'),
            profileNameInput: document.getElementById('profile-name-input'),
            modalOkBtn: document.getElementById('modal-ok-btn'),
            modalCancelBtn: document.getElementById('modal-cancel-btn'),
            messageDialog: document.getElementById('message-dialog'),
            messageTitle: document.getElementById('message-title'),
            messageText: document.getElementById('message-text'),
            messageOkBtn: document.getElementById('message-ok-btn'),
            bulkActionsPanel: document.getElementById('bulk-actions-panel'),
            bulkSelectEnabledBtn: document.getElementById('bulk-select-enabled-btn'),
            bulkSelectDisabledBtn: document.getElementById('bulk-select-disabled-btn'),
            bulkEnableBtn: document.getElementById('bulk-enable-btn'),
            bulkDisableBtn: document.getElementById('bulk-disable-btn'),
            bulkDeleteBtn: document.getElementById('bulk-delete-btn'),
            bulkClearSelectionBtn: document.getElementById('bulk-clear-selection-btn'),
            bulkSelectionCount: document.getElementById('bulk-selection-count')
        };
        
        // Загружаем настройки
        await this.configManager.loadUserConfig();
        
        // Загружаем локализацию из настроек
        const locale = this.userConfig?.locale || 'en';
        await this.localeManager.loadLocale(locale);
        
        // Применяем локализацию к интерфейсу
        this.applyLocalization();
        
        // Обновляем элементы для выбора языка
        if (this.elements.settingsLocaleSelect) {
            this.elements.settingsLocaleSelect.value = locale;
        }
        
        // Получаем путь по умолчанию
        this.defaultPath = await window.electronAPI.getDefaultPath();
        
        // Применяем настройки
        this.configManager.applyUserConfig();
        
        // Инициализация сервисов и менеджеров
        this.statusManager = new StatusManager(this.elements.statusText, this);
        this.fileService = new FileService((msg) => this.setStatus(msg));
        this.modalManager = new ModalManager(this.elements);
        
        // Инициализация папки профилей
        await this.profileManager.initProfilesDirectory();
        
        // Инициализация сервиса сканирования
        this.modScanService = new ModScanService(this.filePath, (msg) => this.setStatus(msg), this);
        
        // Инициализация рендерера списка модов (создаем после инициализации сервисов)
        this.modListRenderer = new ModListRenderer(
            this.elements,
            this.modEntries,
            {
                onCheckboxChange: (modName) => this.modManager.onCheckboxChange(modName),
                onModSelect: (modName, ctrlKey, shiftKey) => this.modManager.selectMod(modName, ctrlKey, shiftKey),
                onDrop: () => {
                    const searchText = this.elements.searchInput.value;
                    this.modManager.updateModList(searchText);
                },
                getSelectedMods: () => Array.from(this.selectedModNames),
                getLastSelectedIndex: () => this.lastSelectedModIndex,
                setLastSelectedIndex: (index) => { this.lastSelectedModIndex = index; }
            }
        );
        
        // Обработка клика вне списка для очистки выбора
        document.addEventListener('click', (e) => {
            // ИСКЛЮЧАЕМ модальное окно - оно не должно мешать
            // Проверяем и сам элемент, и его родителей
            if (e.target.closest('#profile-dialog') || 
                e.target.closest('.modal') || 
                e.target.closest('.modal-content') ||
                e.target.closest('.modal-body') ||
                e.target.closest('.modal-footer') ||
                e.target.closest('.modal-header')) {
                return; // Не обрабатываем клики по модальному окну
            }
            
            // Если клик не по элементу мода и не по чекбоксу
            if (!e.target.closest('.mod-item') && !e.target.closest('#mods-list')) {
                // Очищаем выбор только если не кликнули по кнопкам массовых действий
                if (!e.target.closest('#bulk-actions-panel') && !e.target.closest('.btn-icon')) {
                    this.modManager.clearSelection();
                }
            }
        });
        
        // Привязка событий
        this.eventBinder = new EventBinder(this.elements, {
            browseFile: () => this.fileManager.browseFile(),
            loadFile: () => this.fileManager.loadFile(),
            onSortChange: () => this.modManager.onSortChange(),
            enableAll: () => this.modManager.enableAll(),
            disableAll: () => this.modManager.disableAll(),
            scanAndUpdate: () => this.modManager.scanAndUpdate(),
            onSearchChange: () => this.modManager.onSearchChange(),
            clearSearch: () => this.modManager.clearSearch(),
            onHideNewModsChange: (checked) => {
                this.hideNewMods = checked;
                const searchText = this.elements.searchInput.value;
                this.modManager.updateModList(searchText);
                this.configManager.saveUserConfig();
            },
            onHideUnusedModsChange: (checked) => {
                this.hideUnusedMods = checked;
                const searchText = this.elements.searchInput.value;
                this.modManager.updateModList(searchText);
                this.configManager.saveUserConfig();
            },
            onHideDeletedModsChange: (checked) => {
                this.hideDeletedMods = checked;
                const searchText = this.elements.searchInput.value;
                this.modManager.updateModList(searchText);
                this.configManager.saveUserConfig();
            },
            createSymlinkForMod: () => this.modManager.createSymlinkForMod(),
            saveCurrentProfile: () => this.profileManager.saveCurrentProfile(),
            overwriteSelectedProfile: () => this.profileManager.overwriteSelectedProfile(),
            loadSelectedProfile: () => this.profileManager.loadSelectedProfile(),
            reloadFile: () => this.fileManager.reloadFile(),
            renameSelectedProfile: () => this.profileManager.renameSelectedProfile(),
            deleteSelectedProfile: () => this.profileManager.deleteSelectedProfile(),
            saveFile: () => this.fileManager.saveFile(),
            openSettings: () => this.settingsManager.openSettings(),
            bulkSelectEnabled: () => this.bulkOperationsManager.bulkSelectEnabled(),
            bulkSelectDisabled: () => this.bulkOperationsManager.bulkSelectDisabled(),
            bulkEnable: () => this.bulkOperationsManager.bulkEnable(),
            bulkDisable: () => this.bulkOperationsManager.bulkDisable(),
            bulkDelete: () => this.bulkOperationsManager.bulkDelete(),
            bulkClearSelection: () => this.modManager.clearSelection()
        });
        
        // Загрузка файла при старте
        await this.fileManager.loadFile();
    }
    
    // Методы для обратной совместимости и делегирования
    onCheckboxChange(modName) {
        this.modManager.onCheckboxChange(modName);
    }
    
    selectMod(modName, ctrlKey = false, shiftKey = false) {
        this.modManager.selectMod(modName, ctrlKey, shiftKey);
    }
    
    updateModListSelection() {
        this.modManager.updateModListSelection();
    }
    
    clearSelection() {
        this.modManager.clearSelection();
    }
    
    updateStatistics() {
        this.statusManager.updateStatistics(this.modEntries);
    }
    
    setStatus(message) {
        this.statusManager.setStatus(message);
    }
    
    showMessage(title, message) {
        return this.uiManager.showMessage(title, message);
    }
    
    showConfirm(message) {
        return this.uiManager.showConfirm(message);
    }
    
    updateBulkActionsPanel() {
        this.uiManager.updateBulkActionsPanel();
    }
    
    // Применение локализации к интерфейсу
    applyLocalization() {
        const t = (key) => this.localeManager.t(key);
        
        // Основные элементы
        if (this.elements.pathInput?.previousElementSibling) {
            this.elements.pathInput.previousElementSibling.textContent = t('ui.file');
        }
        if (this.elements.browseBtn) this.elements.browseBtn.textContent = t('ui.browse');
        if (this.elements.loadBtn) this.elements.loadBtn.textContent = t('ui.load');
        if (this.elements.saveBtn) this.elements.saveBtn.textContent = t('ui.save');
        if (this.elements.cancelBtn) this.elements.cancelBtn.textContent = t('ui.cancelChanges');
        if (this.elements.statusText) this.elements.statusText.textContent = t('ui.ready');
        
        // Кнопки действий
        if (this.elements.enableAllBtn) this.elements.enableAllBtn.title = t('ui.enableAll');
        if (this.elements.disableAllBtn) this.elements.disableAllBtn.title = t('ui.disableAll');
        if (this.elements.reloadFileBtn) this.elements.reloadFileBtn.title = t('ui.reloadFile');
        if (this.elements.scanBtn) this.elements.scanBtn.title = t('ui.scan');
        if (this.elements.settingsBtn) this.elements.settingsBtn.title = t('ui.settings');
        
        // Сортировка
        const sortLabel = document.querySelector('.sort-label');
        if (sortLabel) sortLabel.textContent = t('ui.sort');
        
        if (this.elements.sortSelect) {
            const options = this.elements.sortSelect.options;
            if (options[0]) options[0].textContent = t('ui.sortByFileOrder');
            if (options[1]) options[1].textContent = t('ui.sortByName');
            if (options[2]) options[2].textContent = t('ui.sortByStatus');
            if (options[3]) options[3].textContent = t('ui.sortNewFirst');
        }
        
        // Поиск
        const searchLabel = document.querySelector('.search-label');
        if (searchLabel) searchLabel.textContent = t('ui.search');
        if (this.elements.searchInput) {
            this.elements.searchInput.placeholder = t('ui.searchPlaceholder');
        }
        if (this.elements.clearSearchBtn) this.elements.clearSearchBtn.title = t('ui.clear');
        
        // Чекбоксы
        const hideNewModsSpan = document.querySelector('#hide-new-mods-checkbox')?.nextElementSibling;
        if (hideNewModsSpan) hideNewModsSpan.textContent = t('ui.hideNewMods');
        const hideDeletedModsSpan = document.querySelector('#hide-deleted-mods-checkbox')?.nextElementSibling;
        if (hideDeletedModsSpan) hideDeletedModsSpan.textContent = t('ui.hideDeletedMods');
        const hideUnusedModsSpan = document.querySelector('#hide-unused-mods-checkbox')?.nextElementSibling;
        if (hideUnusedModsSpan) hideUnusedModsSpan.textContent = t('ui.hideUnusedMods');
        
        // Действия
        const addModLabel = document.querySelector('.symlink-frame .section-label');
        if (addModLabel) addModLabel.textContent = t('ui.addMod');
        if (this.elements.createSymlinkBtn) this.elements.createSymlinkBtn.textContent = t('ui.createSymlink');
        
        const actionsLabel = document.querySelector('#bulk-actions-panel .section-label');
        if (actionsLabel) actionsLabel.textContent = t('ui.actions');
        
        if (this.elements.bulkEnableBtn) this.elements.bulkEnableBtn.title = t('ui.enableSelected');
        if (this.elements.bulkDisableBtn) this.elements.bulkDisableBtn.title = t('ui.disableSelected');
        if (this.elements.bulkDeleteBtn) this.elements.bulkDeleteBtn.title = t('ui.deleteSelected');
        if (this.elements.bulkClearSelectionBtn) this.elements.bulkClearSelectionBtn.title = t('ui.clearSelection');
        if (this.elements.bulkSelectEnabledBtn) this.elements.bulkSelectEnabledBtn.title = t('ui.selectEnabled');
        if (this.elements.bulkSelectDisabledBtn) this.elements.bulkSelectDisabledBtn.title = t('ui.selectDisabled');
        
        // Профили
        const profilesLabel = document.querySelector('.profiles-frame .section-label');
        if (profilesLabel) profilesLabel.textContent = t('ui.profiles');
        
        if (this.elements.newProfileBtn) this.elements.newProfileBtn.title = t('ui.newProfile');
        if (this.elements.loadProfileBtn) this.elements.loadProfileBtn.title = t('ui.loadProfile');
        if (this.elements.overwriteProfileBtn) this.elements.overwriteProfileBtn.title = t('ui.overwriteProfile');
        if (this.elements.renameProfileBtn) this.elements.renameProfileBtn.title = t('ui.renameProfile');
        if (this.elements.deleteProfileBtn) this.elements.deleteProfileBtn.title = t('ui.deleteProfile');
        
        // Модальные окна
        if (this.elements.modalTitle) this.elements.modalTitle.textContent = t('ui.enterProfileName');
        if (this.elements.profileNameInput) this.elements.profileNameInput.placeholder = t('ui.profileNamePlaceholder');
        if (this.elements.modalOkBtn) this.elements.modalOkBtn.textContent = t('ui.ok');
        if (this.elements.modalCancelBtn) this.elements.modalCancelBtn.textContent = t('ui.cancel');
        
        if (this.elements.messageTitle) this.elements.messageTitle.textContent = t('ui.message');
        if (this.elements.messageOkBtn) this.elements.messageOkBtn.textContent = t('ui.ok');
        
        const settingsTitle = document.querySelector('#settings-dialog .modal-title');
        if (settingsTitle) settingsTitle.textContent = t('ui.settings');
        const themeLabel = document.getElementById('settings-theme-label');
        if (themeLabel) themeLabel.textContent = t('ui.theme');
        
        if (this.elements.settingsThemeSelect) {
            const themeOptions = this.elements.settingsThemeSelect.options;
            if (themeOptions[0]) themeOptions[0].textContent = t('ui.light');
            if (themeOptions[1]) themeOptions[1].textContent = t('ui.dark');
        }
        
        const localeLabel = document.getElementById('settings-locale-label');
        if (localeLabel) localeLabel.textContent = t('ui.locale');
        
        if (this.elements.settingsLocaleSelect) {
            const localeOptions = this.elements.settingsLocaleSelect.options;
            const langNames = this.localeManager.translations.ui?.languageNames || {};
            
            // Названия языков на их родном языке
            const nativeNames = {
                'en': 'English',
                'ru': 'Русский',
                'de': 'Deutsch',
                'fr': 'Français',
                'it': 'Italiano',
                'pt': 'Português',
                'ko': '한국어',
                'zh': '中文',
                'ja': '日本語'
            };
            
            // Формируем текст для каждого языка: родное название + (название на текущем языке)
            if (localeOptions[0]) {
                const enName = langNames['en'] || 'English';
                localeOptions[0].textContent = `English (${enName})`;
            }
            if (localeOptions[1]) {
                const ruName = langNames['ru'] || 'Russian';
                localeOptions[1].textContent = `${nativeNames['ru']} (${ruName})`;
            }
            if (localeOptions[2]) {
                const deName = langNames['de'] || 'German';
                localeOptions[2].textContent = `${nativeNames['de']} (${deName})`;
            }
            if (localeOptions[3]) {
                const frName = langNames['fr'] || 'French';
                localeOptions[3].textContent = `${nativeNames['fr']} (${frName})`;
            }
            if (localeOptions[4]) {
                const itName = langNames['it'] || 'Italian';
                localeOptions[4].textContent = `${nativeNames['it']} (${itName})`;
            }
            if (localeOptions[5]) {
                const ptName = langNames['pt'] || 'Portuguese';
                localeOptions[5].textContent = `${nativeNames['pt']} (${ptName})`;
            }
            if (localeOptions[6]) {
                const koName = langNames['ko'] || 'Korean';
                localeOptions[6].textContent = `${nativeNames['ko']} (${koName})`;
            }
            if (localeOptions[7]) {
                const zhName = langNames['zh'] || 'Chinese';
                localeOptions[7].textContent = `${nativeNames['zh']} (${zhName})`;
            }
            if (localeOptions[8]) {
                const jaName = langNames['ja'] || 'Japanese';
                localeOptions[8].textContent = `${nativeNames['ja']} (${jaName})`;
            }
        }
        
        if (this.elements.settingsOkBtn) this.elements.settingsOkBtn.textContent = t('ui.ok');
        if (this.elements.settingsCancelBtn) this.elements.settingsCancelBtn.textContent = t('ui.cancel');
    }
    
    // Получить локализованную строку
    t(key, params = {}) {
        return this.localeManager.t(key, params);
    }
}

// Инициализация приложения при загрузке страницы
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ModLoadOrderManager();
});
