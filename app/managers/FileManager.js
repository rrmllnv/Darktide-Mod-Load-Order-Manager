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
            this.app.modScanService = new ModScanService(this.app.filePath, (msg) => this.app.setStatus(msg));
            
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
            await this.app.uiManager.showMessage('Ошибка', `Не удалось загрузить файл:\n${error.message}`);
            this.app.setStatus(`Ошибка: ${error.message}`);
        }
    }
    
    async saveFile() {
        if (this.app.modEntries.length === 0) {
            await this.app.uiManager.showMessage('Ошибка', 'Нет модов для сохранения');
            return;
        }
        
        try {
            await this.app.fileService.saveFile(this.app.filePath, this.app.headerLines, this.app.modEntries);
            
            await this.app.uiManager.showMessage('Успех', 'Файл успешно сохранен!');
            this.app.setStatus('Файл сохранен');
            
            await this.loadFile();
            
        } catch (error) {
            await this.app.uiManager.showMessage('Ошибка', `Не удалось сохранить файл:\n${error.message}`);
            this.app.setStatus(`Ошибка сохранения: ${error.message}`);
        }
    }
    
    async reloadFile() {
        const confirmed = await this.app.uiManager.showConfirm('Вернуться к исходному состоянию файла?\n\nВсе несохраненные изменения будут потеряны.');
        if (confirmed) {
            await this.loadFile();
            this.app.setStatus('Файл перезагружен. Состояние восстановлено из файла.');
        }
    }
}
