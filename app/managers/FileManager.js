import { ModScanService } from '../services/ModScanService.js';

export class FileManager {
    constructor(app) {
        this.app = app;
    }
    
    async browseFile() {
        if (this.app.tourComponent && this.app.tourComponent.isActive && this.app.tourComponent.isBrowseTour) {
            this.app.tourComponent.endTour(true);
        }
        
        const result = await window.electronAPI.selectFile(this.app.filePath);
        if (result.success && !result.canceled) {
            this.app.filePath = result.filePath;
            this.app.elements.pathInput.value = this.app.filePath;
            await this.app.configManager.saveUserConfig();
            this.updateSaveButton();
            await this.loadFile();
            await this.updateOpenFileButton();
            
            if (this.app.tourComponent) {
                if (!this.app.tourComponent.elements) {
                    await this.app.tourComponent.init();
                }
                
                if (this.app.tourComponent.isActive) {
                    this.app.tourComponent.isActive = false;
                }
                
                if (this.app.tourComponent.shouldShowTour()) {
                    // Показываем приветственное окно перед началом тура
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.welcome'),
                        this.app.t('messages.common.welcomeFileFound')
                    );
                    // После закрытия приветственного окна запускаем тур
                    setTimeout(() => {
                        this.app.tourComponent.startTour();
                    }, 300);
                }
            }
        }
    }
    
    async openFile() {
        if (!this.app.filePath) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), this.app.t('messages.common.filePathNotSet'));
            return;
        }
        
        const result = await window.electronAPI.openFile(this.app.filePath);
        if (!result.success) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), result.error || this.app.t('messages.common.failedToOpenFile'));
        }
    }
    
    async openModsFolder() {
        if (!this.app.filePath) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), this.app.t('messages.common.filePathNotSet'));
            return;
        }
        
        const modsDir = this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\'));
        if (!modsDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), this.app.t('messages.common.failedToDetermineModsDir'));
            return;
        }
        
        const result = await window.electronAPI.openFolder(modsDir);
        if (!result.success) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), result.error || this.app.t('messages.common.failedToOpenFolder'));
        }
    }
    
    async updateOpenFileButton() {
        if (this.app.elements.openFileBtn) {
            if (this.app.filePath) {
                const fileExists = await window.electronAPI.fileExists(this.app.filePath);
                this.app.elements.openFileBtn.style.display = fileExists ? 'inline-block' : 'none';
            } else {
                this.app.elements.openFileBtn.style.display = 'none';
            }
        }
        
        if (this.app.elements.openModsFolderBtn) {
            if (this.app.filePath) {
                const fileExists = await window.electronAPI.fileExists(this.app.filePath);
                this.app.elements.openModsFolderBtn.style.display = fileExists ? 'inline-block' : 'none';
            } else {
                this.app.elements.openModsFolderBtn.style.display = 'none';
            }
        }
    }
    
    updateSaveButton() {
        if (this.app.elements.saveBtn) {
            this.app.elements.saveBtn.disabled = !this.app.filePath || this.app.filePath.trim() === '';
        }
    }
    
    async loadFile() {
        this.app.filePath = this.app.elements.pathInput.value;
        await this.app.configManager.saveUserConfig();
        
        this.updateSaveButton();
        await this.updateOpenFileButton();
        
        try {
            const parsed = await this.app.fileService.loadFile(this.app.filePath);
            this.app.headerLines = parsed.headerLines;
 
            this.app.gameModEntries = parsed.modEntries;
            
        if (this.app.modListComponent) {
            this.app.modListComponent.modEntries = this.app.modEntries;
        }
            
            this.app.modScanService = new ModScanService(this.app.filePath, (msg) => this.app.setStatus(msg), this.app);
            
            const scanResult = await this.app.modScanService.scanGameModsDirectory(this.app.gameModEntries, this.app.selectedModName);
            this.app.selectedModName = scanResult.selectedModName;
            
        if (this.app.modListComponent) {
            this.app.modListComponent.modEntries = this.app.modEntries;
        }
            
            this.app.modListComponent.clearSelection();
            this.app.modListComponent.updateModList();
            this.app.updateStatistics();
            
            if (this.app.developerComponent && this.app.developerComponent.updateDeveloperView) {
                const shouldScan = this.app.userConfig && this.app.userConfig.developerViewMode;
                await this.app.developerComponent.updateDeveloperView(shouldScan);
            }
            
            if (this.app.profileComponent) {
                await this.app.profileComponent.initProfilesDirectory();
            }
            
            if (this.app.todosComponent && this.app.todosComponent.onModSelectionChanged) {
                await this.app.todosComponent.onModSelectionChanged();
            }
            
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), `${this.app.t('messages.common.fileLoadError')}\n${error.message}`);
            this.app.setStatus(`Error: ${error.message}`);
        }
    }
    
    async saveFile() {
        if (!this.app.filePath) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), this.app.t('messages.common.filePathNotSet'));
            return;
        }
        
        const fileExists = await window.electronAPI.fileExists(this.app.filePath);
        if (!fileExists) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.common.error'),
                this.app.t('messages.common.fileNotFoundCannotSave')
            );
            return;
        }
        
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.common.saveConfirm'));
        if (!confirmed) {
            return;
        }
        
        try {
            const currentSort = this.app.elements.sortSelect ? this.app.elements.sortSelect.value : null;
            let sortedModEntries = null;
            // Сохраняем только моды игры (gameModEntries), так как файл mod_load_order.txt относится к игре
            if (currentSort && this.app.gameModEntries.length > 0) {
                const { Sorter } = await import('../utils/Sorter.js');
                sortedModEntries = Sorter.sortMods([...this.app.gameModEntries], currentSort);
            }
            await this.app.fileService.saveFile(this.app.filePath, this.app.headerLines, this.app.gameModEntries, sortedModEntries);
            
            await this.loadFile();
            
            this.app.setStatus(this.app.t('messages.common.fileSavedStatus'));
            if (this.app.notificationComponent) {
                this.app.notificationComponent.show('success', this.app.t('messages.common.fileSaved'));
            }
            
        } catch (error) {
            this.app.setStatus(`${this.app.t('messages.common.saveError')} ${error.message}`);
            if (this.app.notificationComponent) {
                this.app.notificationComponent.show('error', `${this.app.t('messages.common.fileSaveError')}\n${error.message}`);
            }
        }
    }
    
    async reloadFile() {
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.common.reloadConfirm'));
        if (confirmed) {
            await this.loadFile();
            this.app.setStatus(this.app.t('messages.common.fileReloaded'));
            
            if (this.app.notificationComponent) {
                this.app.notificationComponent.show('success', this.app.t('messages.common.fileReloaded'));
            }
        }
    }
    
    async addModFolder() {
        const modsDir = this.app.filePath ? this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\')) : '';
        if (!modsDir) {
            if (this.app.notificationComponent) {
                this.app.notificationComponent.show('error', this.app.t('messages.common.failedToDetermineModsDir'));
            }
            return;
        }
        
        const result = await window.electronAPI.selectFolder();
        
        if (!result.success || result.canceled) {
            return;
        }
        
        const selectedFolder = result.folderPath;
        
        const isDirectory = await window.electronAPI.checkIsDirectory(selectedFolder);
        if (!isDirectory) {
            if (this.app.notificationComponent) {
                this.app.notificationComponent.show('error', this.app.t('messages.common.dragDropNotFolder') || 'Select a folder, not a file');
            }
            return;
        }
        
        try {
            const copyResult = await window.electronAPI.copyFolderToMods(selectedFolder, modsDir);
            
            if (copyResult.success) {
                const message = (this.app.t('messages.common.folderCopied') || 'Folder copied: {folderName}').replace('{folderName}', copyResult.folderName);
                if (this.app.notificationComponent) {
                    this.app.notificationComponent.show('success', message);
                }
                
                await this.app.modListComponent.scanAndUpdate();
            } else {
                if (this.app.notificationComponent) {
                    this.app.notificationComponent.show('error', copyResult.error || (this.app.t('messages.common.folderCopyError') || 'Error copying folder'));
                }
            }
        } catch (error) {
            if (this.app.notificationComponent) {
                this.app.notificationComponent.show('error', error.message || (this.app.t('messages.common.folderCopyError') || 'Error copying folder'));
            }
        }
    }
    
    async launchDtkitPatch() {
        if (!this.app.filePath) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), this.app.t('messages.common.filePathNotSet') || 'File path not set');
            return;
        }
        
        const modsDir = this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\'));
        if (!modsDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), this.app.t('messages.common.failedToDetermineModsDir'));
            return;
        }
        
        const gameDir = modsDir.substring(0, modsDir.lastIndexOf('\\'));
        if (!gameDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), this.app.t('messages.common.failedToDetermineGameDir') || 'Failed to determine game directory');
            return;
        }
        
        try {
            const result = await window.electronAPI.launchDtkitPatch(gameDir);
            if (!result.success) {
                await this.app.uiManager.showMessage(this.app.t('messages.common.error'), result.error || this.app.t('messages.common.launchDtkitPatchError') || 'Error launching application');
            }
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.common.error'), error.message || this.app.t('messages.common.launchDtkitPatchError') || 'Error launching application');
        }
    }
}
