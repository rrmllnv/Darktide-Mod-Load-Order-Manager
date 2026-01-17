// Менеджер работы с файлами
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
            await this.app.configManager.saveUserConfig(); // Сохраняем новый путь
            await this.loadFile();
        }
    }
    
    async loadFile() {
        this.app.filePath = this.app.elements.pathInput.value;
        await this.app.configManager.saveUserConfig(); // Сохраняем путь при загрузке файла
        
        try {
            const parsed = await this.app.fileService.loadFile(this.app.filePath);
            this.app.headerLines = parsed.headerLines;
            this.app.modEntries = parsed.modEntries;
            
            // Обновляем ссылку на modEntries в рендерере
            if (this.app.modListRenderer) {
                this.app.modListRenderer.modEntries = this.app.modEntries;
            }
            
            // Обновляем сервис сканирования с новым путем
            this.app.modScanService = new ModScanService(this.app.filePath, (msg) => this.app.setStatus(msg), this.app);
            
            // Сканирование папки модов для поиска новых модов
            const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, this.app.selectedModName);
            this.app.selectedModName = scanResult.selectedModName;
            
            // Обновляем ссылку на modEntries в рендерере после сканирования
            if (this.app.modListRenderer) {
                this.app.modListRenderer.modEntries = this.app.modEntries;
            }
            
            // Обновление интерфейса
            this.app.modManager.clearSelection(); // Очищаем выбор при загрузке файла
            this.app.modManager.updateModList();
            this.app.updateStatistics();
            
            // Обновляем папку профилей после загрузки файла
            await this.app.profileManager.initProfilesDirectory();
            
        } catch (error) {
            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.fileLoadError')}\n${error.message}`);
            this.app.setStatus(`Ошибка: ${error.message}`);
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
            await this.app.fileService.saveFile(this.app.filePath, this.app.headerLines, this.app.modEntries);
            
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
        // Получаем директорию модов
        const modsDir = this.app.filePath ? this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\')) : '';
        if (!modsDir) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.error'),
                this.app.t('messages.failedToDetermineModsDir')
            );
            return;
        }
        
        // Открываем диалог выбора папки
        const result = await window.electronAPI.selectFolder();
        
        if (!result.success || result.canceled) {
            return;
        }
        
        const selectedFolder = result.folderPath;
        
        // Проверяем, что это папка
        const isDirectory = await window.electronAPI.checkIsDirectory(selectedFolder);
        if (!isDirectory) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.error'),
                this.app.t('messages.dragDropNotFolder') || 'Выберите папку, а не файл'
            );
            return;
        }
        
        // Копируем папку
        try {
            const copyResult = await window.electronAPI.copyFolderToMods(selectedFolder, modsDir);
            
            if (copyResult.success) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.success'),
                    (this.app.t('messages.folderCopied') || 'Папка скопирована: {folderName}').replace('{folderName}', copyResult.folderName)
                );
                
                // Обновляем список модов
                await this.app.modManager.scanAndUpdate();
            } else {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.error'),
                    copyResult.error || (this.app.t('messages.folderCopyError') || 'Ошибка при копировании папки')
                );
            }
        } catch (error) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.error'),
                error.message || (this.app.t('messages.folderCopyError') || 'Ошибка при копировании папки')
            );
        }
    }
}
