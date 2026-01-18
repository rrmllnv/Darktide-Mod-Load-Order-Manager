import { ModScanService } from '../services/ModScanService.js';

export class FileManager {
    constructor(app) {
        this.app = app;
    }
    
    async browseFile() {
        const result = await window.electronAPI.selectFile(this.app.filePath);
        if (result.success && !result.canceled) {
            this.app.filePath = result.filePath;
            this.app.elements.pathInput.value = this.app.filePath;
            await this.app.configManager.saveUserConfig();
            await this.loadFile();
            await this.updateOpenFileButton();
        }
    }
    
    async openFile() {
        if (!this.app.filePath) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.filePathNotSet'));
            return;
        }
        
        const result = await window.electronAPI.openFile(this.app.filePath);
        if (!result.success) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), result.error || this.app.t('messages.failedToOpenFile'));
        }
    }
    
    async openModsFolder() {
        if (!this.app.filePath) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.filePathNotSet'));
            return;
        }
        
        const modsDir = this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\'));
        if (!modsDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineModsDir'));
            return;
        }
        
        const result = await window.electronAPI.openFolder(modsDir);
        if (!result.success) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), result.error || this.app.t('messages.failedToOpenFolder'));
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
    }
    
    async loadFile() {
        this.app.filePath = this.app.elements.pathInput.value;
        await this.app.configManager.saveUserConfig();
        
        await this.updateOpenFileButton();
        
        try {
            const parsed = await this.app.fileService.loadFile(this.app.filePath);
            this.app.headerLines = parsed.headerLines;
            this.app.modEntries = parsed.modEntries;
            
            if (this.app.modListRenderer) {
                this.app.modListRenderer.modEntries = this.app.modEntries;
            }
            
            this.app.modScanService = new ModScanService(this.app.filePath, (msg) => this.app.setStatus(msg), this.app);
            
            const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, this.app.selectedModName);
            this.app.selectedModName = scanResult.selectedModName;
            
            if (this.app.modListRenderer) {
                this.app.modListRenderer.modEntries = this.app.modEntries;
            }
            
            this.app.modManager.clearSelection();
            this.app.modManager.updateModList();
            this.app.updateStatistics();
            
            await this.app.profileManager.initProfilesDirectory();
            
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.fileLoadError')}\n${error.message}`);
            this.app.setStatus(`Error: ${error.message}`);
        }
    }
    
    async saveFile() {
        if (this.app.modEntries.length === 0) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.noModsToSave'));
            return;
        }
        
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.saveConfirm'));
        if (!confirmed) {
            return;
        }
        
        try {
            const currentSort = this.app.elements.sortSelect ? this.app.elements.sortSelect.value : null;
            let sortedModEntries = null;
            if (currentSort && this.app.modEntries.length > 0) {
                const { Sorter } = await import('../utils/Sorter.js');
                sortedModEntries = Sorter.sortMods([...this.app.modEntries], currentSort);
            }
            await this.app.fileService.saveFile(this.app.filePath, this.app.headerLines, this.app.modEntries, sortedModEntries);
            
            await this.app.uiManager.showMessage(this.app.t('messages.success'), this.app.t('messages.fileSaved'));
            this.app.setStatus(this.app.t('messages.fileSavedStatus'));
            
            await this.loadFile();
            
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.fileSaveError')}\n${error.message}`);
            this.app.setStatus(`${this.app.t('messages.saveError')} ${error.message}`);
        }
    }
    
    async reloadFile() {
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.reloadConfirm'));
        if (confirmed) {
            await this.loadFile();
            this.app.setStatus(this.app.t('messages.fileReloaded'));
        }
    }
    
    async addModFolder() {
        const modsDir = this.app.filePath ? this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\')) : '';
        if (!modsDir) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.error'),
                this.app.t('messages.failedToDetermineModsDir')
            );
            return;
        }
        
        const result = await window.electronAPI.selectFolder();
        
        if (!result.success || result.canceled) {
            return;
        }
        
        const selectedFolder = result.folderPath;
        
        const isDirectory = await window.electronAPI.checkIsDirectory(selectedFolder);
        if (!isDirectory) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.error'),
                this.app.t('messages.dragDropNotFolder') || 'Select a folder, not a file'
            );
            return;
        }
        
        try {
            const copyResult = await window.electronAPI.copyFolderToMods(selectedFolder, modsDir);
            
            if (copyResult.success) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.success'),
                    (this.app.t('messages.folderCopied') || 'Folder copied: {folderName}').replace('{folderName}', copyResult.folderName)
                );
                
                await this.app.modManager.scanAndUpdate();
            } else {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.error'),
                    copyResult.error || (this.app.t('messages.folderCopyError') || 'Error copying folder')
                );
            }
        } catch (error) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.error'),
                error.message || (this.app.t('messages.folderCopyError') || 'Error copying folder')
            );
        }
    }
    
    async launchDtkitPatch() {
        if (!this.app.filePath) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.filePathNotSet') || 'File path not set');
            return;
        }
        
        const modsDir = this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\'));
        if (!modsDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineModsDir'));
            return;
        }
        
        const gameDir = modsDir.substring(0, modsDir.lastIndexOf('\\'));
        if (!gameDir) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineGameDir') || 'Failed to determine game directory');
            return;
        }
        
        try {
            const result = await window.electronAPI.launchDtkitPatch(gameDir);
            if (!result.success) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), result.error || this.app.t('messages.launchDtkitPatchError') || 'Error launching application');
            }
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), error.message || this.app.t('messages.launchDtkitPatchError') || 'Error launching application');
        }
    }
}
