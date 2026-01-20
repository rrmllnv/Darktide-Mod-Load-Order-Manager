import { ModEntry } from './models/ModEntry.js';
import { FileService } from './services/FileService.js';
import { ModScanService } from './services/ModScanService.js';
import { ModalManager } from './ui/ModalManager.js';
import { ModListComponent } from './components/mod-list/ModListComponent.js';
import { EventBinder } from './ui/EventBinder.js';
import { StatusManager } from './managers/StatusManager.js';
import { LocaleManager } from './managers/LocaleManager.js';
import { ConfigManager } from './managers/ConfigManager.js';
import { FileManager } from './managers/FileManager.js';
import { UIManager } from './managers/UIManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { ThemeComponent } from './components/theme/ThemeComponent.js';
import { ProfileComponent } from './components/profile/ProfileComponent.js';
import { SearchComponent } from './components/search/SearchComponent.js';
import { BulkOperationsComponent } from './components/bulk-operations/BulkOperationsComponent.js';
import { SettingsComponent } from './components/settings/SettingsComponent.js';
import { FileOperationsComponent } from './components/file-operations/FileOperationsComponent.js';
import { TourComponent } from './components/tour/TourComponent.js';
import { DeveloperComponent } from './components/developer/DeveloperComponent.js';
import { TodosComponent } from './components/todos/TodosComponent.js';
import { NotificationComponent } from './components/notifications/NotificationComponent.js';

class ModLoadOrderManager {
    constructor() {
        this.defaultPath = '';
        this.filePath = '';
        
        this.headerLines = [];
        this.modEntries = [];
        this.selectedModName = '';
        this.selectedModNames = new Set();
        this.lastSelectedModIndex = -1;
        this.hideNewMods = false;
        this.hideUnusedMods = false;
        this.hideNotFoundMods = false;
        
        this.savedState = null;
        this.profilesDir = null;
        this.selectedProfileName = null;
        
        this.userConfig = null;
        
        this.elements = {};
        this.contextMenuModName = null;
        
        this.fileService = null;
        this.modScanService = null;
        this.modalManager = null;
        this.modListComponent = null;
        this.statusManager = null;
        this.eventBinder = null;
        
        this.localeManager = new LocaleManager();
        this.configManager = new ConfigManager(this);
        this.fileManager = new FileManager(this);
        this.uiManager = new UIManager(this);
        this.settingsManager = new SettingsManager(this);
        
        this.themeComponent = new ThemeComponent(this);
        this.profileComponent = new ProfileComponent(this);
        this.modListComponent = new ModListComponent(this);
        this.searchComponent = new SearchComponent(this);
        this.bulkOperationsComponent = new BulkOperationsComponent(this);
        this.settingsComponent = new SettingsComponent(this);
        this.fileOperationsComponent = new FileOperationsComponent(this);
        this.tourComponent = new TourComponent(this);
        this.developerComponent = new DeveloperComponent(this);
        this.todosComponent = new TodosComponent(this);
        this.notificationComponent = new NotificationComponent(this);
        
        this.init();
    }
    
    async init() {
        this.elements = {
            pathInput: document.getElementById('path-input'),
            browseBtn: document.getElementById('browse-btn'),
            openFileBtn: document.getElementById('open-file-btn'),
            openModsFolderBtn: document.getElementById('open-mods-folder-btn'),
            sortSelect: document.getElementById('sort-select'),
            launchDtkitBtn: document.getElementById('launch-dtkit-btn'),
            enableAllBtn: document.getElementById('enable-all-btn'),
            disableAllBtn: document.getElementById('disable-all-btn'),
            scanBtn: document.getElementById('scan-btn'),
            modsList: document.getElementById('mods-list'),
            searchInput: document.getElementById('search-input'),
            clearSearchBtn: document.getElementById('clear-search-btn'),
            hideNewModsCheckbox: document.getElementById('hide-new-mods-checkbox'),
            hideUnusedModsCheckbox: document.getElementById('hide-unused-mods-checkbox'),
            hideNotFoundModsCheckbox: document.getElementById('hide-not-found-mods-checkbox'),
            addModFolderBtn: document.getElementById('add-mod-folder-btn'),
            addModBtn: document.getElementById('add-mod-btn'),
            addModDropdown: document.getElementById('add-mod-dropdown'),
            profilesList: document.getElementById('profiles-list'),
            newProfileBtn: document.getElementById('new-profile-btn'),
            overwriteProfileBtn: document.getElementById('overwrite-profile-btn'),
            loadProfileBtn: document.getElementById('load-profile-btn'),
            reloadFileBtn: document.getElementById('reload-file-btn'),
            renameProfileBtn: document.getElementById('rename-profile-btn'),
            deleteProfileBtn: document.getElementById('delete-profile-btn'),
            saveBtn: document.getElementById('save-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            statusText: document.getElementById('status-text'),
            contextMenu: document.getElementById('mod-context-menu'),
            contextMenuNormal: document.getElementById('context-menu-normal'),
            contextMenuDeveloper: document.getElementById('context-menu-developer'),
            contextMenuEnable: document.getElementById('context-menu-enable'),
            contextMenuDisable: document.getElementById('context-menu-disable'),
            contextMenuCopy: document.getElementById('context-menu-copy'),
            contextMenuDelete: document.getElementById('context-menu-delete'),
            contextMenuDeleteFolder: document.getElementById('context-menu-delete-folder'),
            contextMenuDevCopyName: document.getElementById('context-menu-dev-copy-name'),
            contextMenuDevDeleteFolder: document.getElementById('context-menu-dev-delete-folder'),
            settingsDialog: document.getElementById('settings-dialog'),
            settingsThemeSelect: document.getElementById('settings-theme-select'),
            settingsLocaleSelect: document.getElementById('settings-locale-select'),
            languageSelectionSelect: document.getElementById('language-selection-select'),
            settingsOkBtn: document.getElementById('settings-ok-btn'),
            settingsCancelBtn: document.getElementById('settings-cancel-btn'),
            inputDialog: document.getElementById('input-dialog'),
            modalTitle: document.getElementById('modal-title'),
            modalInputName: document.getElementById('modal-input-name'),
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
            bulkSelectionCount: document.getElementById('bulk-selection-count'),
            dragDropOverlay: document.getElementById('drag-drop-overlay')
        };
        
        await this.configManager.loadUserConfig();
        
        await this.themeComponent.init();
        
        let locale = this.userConfig?.locale || 'en';
        const localeSelected = this.userConfig?.localeSelected !== undefined ? this.userConfig.localeSelected : false;
        
        if (!localeSelected) {
            const selectedLocale = await this.uiManager.showLanguageSelection();
            locale = selectedLocale;
            this.userConfig.locale = locale;
            this.userConfig.localeSelected = true;
            await this.configManager.saveUserConfig();
        }
        
        await this.localeManager.loadLocale(locale);
        
        if (this.themeComponent) {
            await this.themeComponent.updateThemeSelectLabels();
        }
        
        await this.applyLocalization();
        
        if (this.elements.settingsLocaleSelect) {
            this.elements.settingsLocaleSelect.value = locale;
        }
        
        this.defaultPath = await window.electronAPI.getDefaultPath();
        
        await this.configManager.applyUserConfig();
        
        this.statusManager = new StatusManager(this.elements.statusText, this);
        this.fileService = new FileService((msg) => this.setStatus(msg));
        this.modalManager = new ModalManager(this.elements);
        
        if (this.profileComponent) {
            await this.profileComponent.init();
        }
        
        if (this.notificationComponent) {
            await this.notificationComponent.init();
        }
        
        this.modScanService = new ModScanService(this.filePath, (msg) => this.setStatus(msg), this);
        
        if (this.modListComponent) {
            await this.modListComponent.init();
            this.modListComponent.modEntries = this.modEntries;
        }
        
        if (this.searchComponent) {
            await this.searchComponent.init();
        }
        
        if (this.bulkOperationsComponent) {
            await this.bulkOperationsComponent.init();
        }
        
        if (this.settingsComponent) {
            await this.settingsComponent.init();
        }
        
        if (this.fileOperationsComponent) {
            await this.fileOperationsComponent.init();
        }
        
        if (this.developerComponent) {
            await this.developerComponent.init();
        }
        
        if (this.todosComponent) {
            await this.todosComponent.init();
        }
        
        this.initPanelResizer();
        
        document.addEventListener('click', (e) => {
            const target = e.target;
            const isModal = target.classList.contains('modal') || target.closest('.modal');
            const isModalContent = target.closest('.modal-content');
            const isModalBody = target.closest('.modal-body');
            const isModalFooter = target.closest('.modal-footer');
            const isModalHeader = target.closest('.modal-header');
            const isInputDialog = target.closest('#input-dialog');
            const isMessageDialog = target.closest('#message-dialog');
            const isConfirmCheckboxesDialog = target.closest('#confirm-checkboxes-dialog');
            const isBackupDialog = target.closest('#backup-dialog');
            const isLanguageDialog = target.closest('#language-selection-dialog');
            const isModalButton = target.closest('.modal-footer button') || 
                                 target.closest('.modal-header button') ||
                                 target.closest('#message-ok-btn') ||
                                 target.closest('#confirm-yes-btn') ||
                                 target.closest('#confirm-no-btn') ||
                                 target.closest('#confirm-checkboxes-yes-btn') ||
                                 target.closest('#confirm-checkboxes-no-btn');
            
            const anyModalOpen = document.querySelector('.modal.show');
            
            if (isModal || isModalContent || isModalBody || 
                isModalFooter || isModalHeader || isInputDialog ||
                isMessageDialog || isConfirmCheckboxesDialog || 
                isBackupDialog || isLanguageDialog || isModalButton || anyModalOpen) {
                return;
            }
            
            if (!e.target.closest('.mod-item') && !e.target.closest('#mods-list')) {
                const isBulkActions = e.target.closest('#bulk-actions-panel');
                const isTodosFrame = e.target.closest('.todos-frame');
                const isDeveloperViewBtn = e.target.closest('#developer-view-btn');
                const isOtherBtnIcon = e.target.closest('.btn-icon') && !isDeveloperViewBtn;
                const isTodoAction = e.target.closest('.todo-actions') || 
                                    e.target.closest('.todo-edit') || 
                                    e.target.closest('.todo-delete') ||
                                    e.target.closest('.todo-checkbox') ||
                                    e.target.closest('.todo-item');
                
                if (!isBulkActions && !isOtherBtnIcon && !isTodosFrame && !isTodoAction) {
                    this.modListComponent.clearSelection();
                }
            }
            
            if (!e.target.closest('#mod-context-menu')) {
                if (e.target.closest('.mod-item')) {
                    const clickedModItem = e.target.closest('.mod-item');
                    const modNameElement = clickedModItem.querySelector('.mod-name');
                    if (modNameElement && modNameElement.textContent !== this.contextMenuModName) {
                        this.hideContextMenu();
                    }
                } else {
                    this.hideContextMenu();
                }
            }
        });
        
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('#mod-context-menu') && !e.target.closest('.mod-item')) {
                this.hideContextMenu();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.contextMenu && this.elements.contextMenu.classList.contains('show')) {
                this.hideContextMenu();
            }
        });
        
        if (this.elements.contextMenuEnable) {
            this.elements.contextMenuEnable.addEventListener('click', () => {
                if (this.contextMenuModName) {
                    this.modListComponent.enableMod(this.contextMenuModName);
                    this.hideContextMenu();
                }
            });
        }
        
        if (this.elements.contextMenuDisable) {
            this.elements.contextMenuDisable.addEventListener('click', () => {
                if (this.contextMenuModName) {
                    this.modListComponent.disableMod(this.contextMenuModName);
                    this.hideContextMenu();
                }
            });
        }
        
        if (this.elements.contextMenuCopy) {
            this.elements.contextMenuCopy.addEventListener('click', () => {
                if (this.contextMenuModName) {
                    this.modListComponent.copyModName(this.contextMenuModName);
                    this.hideContextMenu();
                }
            });
        }
        
        if (this.elements.contextMenuDelete) {
            this.elements.contextMenuDelete.addEventListener('click', async () => {
                if (this.contextMenuModName) {
                    const modName = this.contextMenuModName;
                    this.hideContextMenu();
                    await this.modListComponent.deleteMod(modName);
                }
            });
        }
        
        if (this.elements.contextMenuDeleteFolder) {
            this.elements.contextMenuDeleteFolder.addEventListener('click', async () => {
                const modName = this.contextMenuModName;
                if (modName && this.modListComponent) {
                    this.hideContextMenu();
                    await this.modListComponent.deleteModFolder(modName);
                }
            });
        }
        
        if (this.elements.contextMenuDevCopyName) {
            this.elements.contextMenuDevCopyName.addEventListener('click', () => {
                if (this.contextMenuModName && this.modListComponent) {
                    this.modListComponent.copyModName(this.contextMenuModName);
                    this.hideContextMenu();
                }
            });
        }
        
        if (this.elements.contextMenuDevDeleteFolder) {
            this.elements.contextMenuDevDeleteFolder.addEventListener('click', async () => {
                const modName = this.contextMenuModName;
                if (modName && this.developerComponent) {
                    this.hideContextMenu();
                    await this.developerComponent.deleteModFolder(modName);
                }
            });
        }
        
        this.eventBinder = new EventBinder(this.elements, {
            saveFile: () => this.fileManager.saveFile()
        });
        
        if (this.filePath) {
            await this.fileManager.loadFile();
        }
        await this.fileManager.updateOpenFileButton();
        this.fileManager.updateSaveButton();
        
        if (this.tourComponent) {
            await this.tourComponent.init();
            if (this.tourComponent.shouldShowTour() && this.filePath) {

                await this.uiManager.showMessage(
                    this.t('messages.common.welcome'),
                    this.t('messages.common.welcomeFileFound')
                );

                setTimeout(() => {
                    this.tourComponent.startTour();
                }, 300);
            }
        }
        
        this.initFileSystemDragDrop();
    }
    
    initFileSystemDragDrop() {
        const overlay = this.elements.dragDropOverlay;
        if (!overlay) return;
        
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (e.dataTransfer.types.includes('Files')) {
                overlay.classList.add('show');
            }
        });
        
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!e.relatedTarget || !document.contains(e.relatedTarget)) {
                overlay.classList.remove('show');
            }
        });
        
        document.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            overlay.classList.remove('show');
            
            const files = Array.from(e.dataTransfer.files);
            
            if (files.length === 0) {
                return;
            }
            
            const droppedItem = files[0];
            
            if (!droppedItem || !droppedItem.path) {
                await this.uiManager.showMessage(
                    this.t('messages.common.error'),
                    this.t('messages.common.dragDropNotFolder') || 'Drag a folder, not a file'
                );
                return;
            }
            
            const isDirectory = await window.electronAPI.checkIsDirectory(droppedItem.path);
            
            if (!isDirectory) {
                await this.uiManager.showMessage(
                    this.t('messages.common.error'),
                    this.t('messages.common.dragDropNotFolder') || 'Drag a folder, not a file'
                );
                return;
            }
            
            const modsDir = this.filePath ? this.filePath.substring(0, this.filePath.lastIndexOf('\\')) : '';
            if (!modsDir) {
                await this.uiManager.showMessage(
                    this.t('messages.common.error'),
                    this.t('messages.common.failedToDetermineModsDir')
                );
                return;
            }
            
            try {
                const result = await window.electronAPI.copyFolderToMods(droppedItem.path, modsDir);
                
                if (result.success) {
                    await this.uiManager.showMessage(
                        this.t('messages.common.success'),
                        (this.t('messages.common.folderCopied') || 'Folder copied: {folderName}').replace('{folderName}', result.folderName)
                    );
                    
                    await this.modListComponent.scanAndUpdate();
                } else {
                    await this.uiManager.showMessage(
                        this.t('messages.common.error'),
                        result.error || (this.t('messages.common.folderCopyError') || 'Error copying folder')
                    );
                }
            } catch (error) {
                await this.uiManager.showMessage(
                    this.t('messages.common.error'),
                    error.message || (this.t('messages.common.folderCopyError') || 'Error copying folder')
                );
            }
        });
    }
    
    onCheckboxChange(modName) {
        this.modListComponent.onCheckboxChange(modName);
    }
    
    selectMod(modName, ctrlKey = false, shiftKey = false) {
        this.modListComponent.selectMod(modName, ctrlKey, shiftKey);
    }
    
    updateModListSelection() {
        this.modListComponent.updateModListSelection();
    }
    
    updateStatistics() {
        this.statusManager.updateStatistics(this.modEntries, this.selectedModNames);
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
        if (this.bulkOperationsComponent && this.bulkOperationsComponent.updatePanel) {
            this.bulkOperationsComponent.updatePanel();
        }
    }
    
    initPanelResizer() {
        const resizer = document.getElementById('panel-resizer');
        const rightContainer = document.querySelector('.right-container');
        
        if (!resizer || !rightContainer) {
            return;
        }
        
        if (this.userConfig && this.userConfig.rightPanelWidth !== undefined) {
            rightContainer.style.width = this.userConfig.rightPanelWidth + 'px';
            this.rightPanelWidth = this.userConfig.rightPanelWidth;
        } else {
            this.rightPanelWidth = 300;
        }
        
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = rightContainer.offsetWidth;
            resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) {
                return;
            }
            
            const diff = startX - e.clientX;
            const newWidth = startWidth + diff;
            const minWidth = 250;
            
            const mainContainer = document.querySelector('.main-container');
            const leftPanel = document.querySelector('.left-panel');
            const resizerWidth = 4;
            const containerPadding = 20;
            
            if (mainContainer && leftPanel) {
                const containerWidth = mainContainer.offsetWidth;
                const leftPanelMinWidth = parseInt(window.getComputedStyle(leftPanel).minWidth) || 570;
                const maxWidth = containerWidth - leftPanelMinWidth - resizerWidth - containerPadding;
                
                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    rightContainer.style.width = newWidth + 'px';
                    this.rightPanelWidth = newWidth;
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                if (this.configManager) {
                    this.configManager.saveUserConfig();
                }
            }
        });
        
        const adjustRightPanelWidth = () => {
            const mainContainer = document.querySelector('.main-container');
            const leftPanel = document.querySelector('.left-panel');
            const resizerWidth = 4;
            const containerPadding = 20;
            
            if (!mainContainer || !leftPanel || !rightContainer) {
                return;
            }
            
            const containerWidth = mainContainer.offsetWidth;
            const leftPanelMinWidth = parseInt(window.getComputedStyle(leftPanel).minWidth) || 570;
            const currentRightWidth = parseInt(rightContainer.style.width) || rightContainer.offsetWidth || 300;
            const maxWidth = containerWidth - leftPanelMinWidth - resizerWidth - containerPadding;
            const minWidth = 250;
            
            if (currentRightWidth > maxWidth) {
                const newWidth = Math.max(minWidth, maxWidth);
                rightContainer.style.width = newWidth + 'px';
                this.rightPanelWidth = newWidth;
                if (this.configManager) {
                    this.configManager.saveUserConfig();
                }
            } else if (currentRightWidth < minWidth) {
                rightContainer.style.width = minWidth + 'px';
                this.rightPanelWidth = minWidth;
                if (this.configManager) {
                    this.configManager.saveUserConfig();
                }
            }
        };
        
        window.addEventListener('resize', adjustRightPanelWidth);
        
        setTimeout(adjustRightPanelWidth, 100);
    }
    
    async applyLocalization() {
        const t = (key) => this.localeManager.t(key);
        
        if (this.elements.pathInput?.previousElementSibling) {
            this.elements.pathInput.previousElementSibling.textContent = t('ui.common.file');
        }
        if (this.elements.saveBtn) this.elements.saveBtn.textContent = t('ui.common.save');
        if (this.elements.statusText) this.elements.statusText.textContent = t('ui.common.ready');
        
        if (this.elements.enableAllBtn) this.elements.enableAllBtn.title = t('ui.common.enableAll');
        if (this.elements.disableAllBtn) this.elements.disableAllBtn.title = t('ui.common.disableAll');
        if (this.elements.scanBtn) this.elements.scanBtn.title = t('ui.common.scan');
        
        if (this.elements.sortSelect) {
            this.elements.sortSelect.title = t('ui.common.sort');
            
            const options = this.elements.sortSelect.options;
            if (options[0]) options[0].textContent = t('ui.common.sortByFileOrder');
            if (options[1]) options[1].textContent = t('ui.common.sortByName');
            if (options[2]) options[2].textContent = t('ui.common.sortByStatus');
            if (options[3]) options[3].textContent = t('ui.common.sortNewFirst');
        }
        
        if (this.searchComponent && this.searchComponent.updateLocalization) {
            this.searchComponent.updateLocalization();
        }
        
        if (this.modListComponent && this.modListComponent.updateLocalization) {
            this.modListComponent.updateLocalization();
        }
        
        if (this.bulkOperationsComponent && this.bulkOperationsComponent.updateLocalization) {
            this.bulkOperationsComponent.updateLocalization();
        }
        
        if (this.settingsComponent && this.settingsComponent.updateLocalization) {
            this.settingsComponent.updateLocalization();
        }
        
        if (this.fileOperationsComponent && this.fileOperationsComponent.updateLocalization) {
            this.fileOperationsComponent.updateLocalization();
        }
        
        if (this.developerComponent && this.developerComponent.updateLocalization) {
            this.developerComponent.updateLocalization();
        }
        
        if (this.todosComponent && this.todosComponent.updateLocalization) {
            this.todosComponent.updateLocalization();
        }
        
        if (this.elements.modalOkBtn) this.elements.modalOkBtn.textContent = t('ui.common.save');
        if (this.elements.modalCancelBtn) this.elements.modalCancelBtn.textContent = t('ui.common.cancel');
        
        if (this.elements.messageTitle) this.elements.messageTitle.textContent = t('ui.common.message');
        if (this.elements.messageOkBtn) this.elements.messageOkBtn.textContent = t('ui.common.save');
        
        const settingsTitle = document.querySelector('#settings-dialog .modal-title');
        if (settingsTitle) settingsTitle.textContent = t('ui.settings.settings');
        const themeLabel = document.getElementById('settings-theme-label');
        if (themeLabel) themeLabel.textContent = t('ui.settings.theme');
        
        const localeLabel = document.getElementById('settings-locale-label');
        if (localeLabel) localeLabel.textContent = t('ui.settings.locale');
        
        const updateLanguageSelectOptions = (selectElement) => {
            if (!selectElement) return;
            
            const options = selectElement.options;
            if (!options || options.length === 0) return;
            
            const langNames = this.localeManager.translations?.ui?.common?.languageNames || {};
            
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
            
            const languageCodes = ['en', 'ru', 'de', 'fr', 'it', 'pt', 'ko', 'zh', 'ja'];
            
            for (let i = 0; i < languageCodes.length && i < options.length; i++) {
                const langCode = languageCodes[i];
                const option = options[i];
                if (!option) continue;
                
                const nativeName = nativeNames[langCode];
                const localizedName = langNames[langCode];
                
                if (localizedName) {
                    option.textContent = `${nativeName} (${localizedName})`;
                } else {
                    option.textContent = nativeName;
                }
            }
        };
        
        updateLanguageSelectOptions(this.elements.settingsLocaleSelect);
        updateLanguageSelectOptions(this.elements.languageSelectionSelect);
        
        if (this.elements.settingsOkBtn) this.elements.settingsOkBtn.textContent = t('ui.settings.save');
        if (this.elements.settingsCancelBtn) this.elements.settingsCancelBtn.textContent = t('ui.settings.cancel');
        
        const dragDropText = document.getElementById('drag-drop-text');
        if (dragDropText) dragDropText.textContent = t('ui.common.dragDropText');
    }
    
    t(key, params = {}) {
        return this.localeManager.t(key, params);
    }
    
    showContextMenu(modName, x, y) {
        if (!this.elements.contextMenu) {
            return;
        }
        
        this.contextMenuModName = modName;
        
        const modEntry = this.modEntries.find(m => m.name === modName);
        if (!modEntry) {
            return;
        }
        
        const isDeveloperViewMode = this.userConfig && this.userConfig.developerViewMode;
        
        if (isDeveloperViewMode) {
            if (this.elements.contextMenuNormal) {
                this.elements.contextMenuNormal.style.display = 'none';
            }
            if (this.elements.contextMenuDeveloper) {
                this.elements.contextMenuDeveloper.style.display = 'block';
            }
            
            if (this.elements.contextMenuDevCopyName && this.elements.contextMenuDevCopyName.querySelector('span')) {
                this.elements.contextMenuDevCopyName.querySelector('span').textContent = this.t('ui.common.contextMenuCopyName');
            }
            if (this.elements.contextMenuDevDeleteFolder && this.elements.contextMenuDevDeleteFolder.querySelector('span')) {
                this.elements.contextMenuDevDeleteFolder.querySelector('span').textContent = this.t('ui.developer.deleteModFolder');
            }
        } else {
            if (this.elements.contextMenuNormal) {
                this.elements.contextMenuNormal.style.display = 'block';
            }
            if (this.elements.contextMenuDeveloper) {
                this.elements.contextMenuDeveloper.style.display = 'none';
            }
            
            if (this.elements.contextMenuEnable) {
                this.elements.contextMenuEnable.style.display = modEntry.enabled ? 'none' : 'block';
            }
            
            if (this.elements.contextMenuDisable) {
                this.elements.contextMenuDisable.style.display = modEntry.enabled ? 'block' : 'none';
            }
            
            if (this.elements.contextMenuEnable && this.elements.contextMenuEnable.querySelector('span')) {
                this.elements.contextMenuEnable.querySelector('span').textContent = this.t('ui.common.contextMenuEnable');
            }
            if (this.elements.contextMenuDisable && this.elements.contextMenuDisable.querySelector('span')) {
                this.elements.contextMenuDisable.querySelector('span').textContent = this.t('ui.common.contextMenuDisable');
            }
            if (this.elements.contextMenuCopy && this.elements.contextMenuCopy.querySelector('span')) {
                this.elements.contextMenuCopy.querySelector('span').textContent = this.t('ui.common.contextMenuCopyName');
            }
            if (this.elements.contextMenuDelete && this.elements.contextMenuDelete.querySelector('span')) {
                this.elements.contextMenuDelete.querySelector('span').textContent = this.t('ui.common.contextMenuDeleteFromFile');
            }
            if (this.elements.contextMenuDeleteFolder && this.elements.contextMenuDeleteFolder.querySelector('span')) {
                this.elements.contextMenuDeleteFolder.querySelector('span').textContent = this.t('ui.common.contextMenuDeleteFolder');
            }
        }
        
        this.elements.contextMenu.style.left = `${x}px`;
        this.elements.contextMenu.style.top = `${y}px`;
        this.elements.contextMenu.classList.add('show');
        
        const menuRect = this.elements.contextMenu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let adjustedX = x;
        let adjustedY = y;
        
        if (menuRect.right > windowWidth) {
            adjustedX = windowWidth - menuRect.width - 5;
        }
        
        if (menuRect.bottom > windowHeight) {
            adjustedY = windowHeight - menuRect.height - 5;
        }
        
        if (adjustedX !== x || adjustedY !== y) {
            this.elements.contextMenu.style.left = `${adjustedX}px`;
            this.elements.contextMenu.style.top = `${adjustedY}px`;
        }
    }
    
    hideContextMenu() {
        if (this.elements.contextMenu) {
            this.elements.contextMenu.classList.remove('show');
        }
        this.contextMenuModName = null;
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ModLoadOrderManager();
});
