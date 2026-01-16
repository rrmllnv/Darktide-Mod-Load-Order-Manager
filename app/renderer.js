// Импорты модулей
import { ModEntry } from './models/ModEntry.js';
import { FileService } from './services/FileService.js';
import { ProfileService } from './services/ProfileService.js';
import { ModScanService } from './services/ModScanService.js';
import { ModalManager } from './ui/ModalManager.js';
import { ModListRenderer } from './ui/ModListRenderer.js';
import { EventBinder } from './ui/EventBinder.js';
import { StatusManager } from './utils/StatusManager.js';
import { ConfigManager } from './managers/ConfigManager.js';
import { FileManager } from './managers/FileManager.js';
import { ProfileManager } from './managers/ProfileManager.js';
import { ModManager } from './managers/ModManager.js';
import { UIManager } from './managers/UIManager.js';
import { BulkOperationsManager } from './managers/BulkOperationsManager.js';

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
        this.configManager = new ConfigManager(this);
        this.fileManager = new FileManager(this);
        this.profileManager = new ProfileManager(this);
        this.modManager = new ModManager(this);
        this.uiManager = new UIManager(this);
        this.bulkOperationsManager = new BulkOperationsManager(this);
        
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
            statusText: document.getElementById('status-text'),
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
        
        // Получаем путь по умолчанию
        this.defaultPath = await window.electronAPI.getDefaultPath();
        
        // Применяем настройки
        this.configManager.applyUserConfig();
        
        // Инициализация сервисов и менеджеров
        this.statusManager = new StatusManager(this.elements.statusText);
        this.fileService = new FileService((msg) => this.setStatus(msg));
        this.modalManager = new ModalManager(this.elements);
        
        // Инициализация папки профилей
        await this.profileManager.initProfilesDirectory();
        
        // Инициализация сервиса сканирования
        this.modScanService = new ModScanService(this.filePath, (msg) => this.setStatus(msg));
        
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
}

// Инициализация приложения при загрузке страницы
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ModLoadOrderManager();
});
