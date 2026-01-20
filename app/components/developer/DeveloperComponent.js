export class DeveloperComponent {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    constructor(app) {
        this.app = app;
    }
    
    async init() {
        this.bindEvents();
        this.updateLocalization();
        this.updateVisibility();
    }
    
    t(key, params = {}) {
        if (this.app.localeManager) {
            return this.app.localeManager.t(key, params);
        }
        return this.app.t(key, params);
    }
    
    bindEvents() {
        const devSelectAllBtn = document.getElementById('dev-select-all-btn');
        if (devSelectAllBtn) {
            devSelectAllBtn.addEventListener('click', () => {
                if (this.app.modEntries && this.app.modListComponent) {
                    this.app.selectedModNames.clear();
                    this.app.selectedModName = '';
                    this.app.lastSelectedModIndex = -1;
                    
                    this.app.modEntries.forEach(modEntry => {
                        this.app.selectedModNames.add(modEntry.name);
                    });
                    
                    this.app.modListComponent.updateModListSelection();
                    
                    if (this.app.bulkOperationsComponent && this.app.bulkOperationsComponent.updatePanel) {
                        this.app.bulkOperationsComponent.updatePanel();
                    }
                    
                    if (this.app.updateStatistics) {
                        this.app.updateStatistics();
                    }
                }
            });
        }
        
        const devCreateModBtn = document.getElementById('dev-create-mod-btn');
        if (devCreateModBtn) {
            devCreateModBtn.addEventListener('click', async () => {
                if (this.createMod) {
                    await this.createMod();
                }
            });
        }
        
        const devOpenProjectFolderBtn = document.getElementById('dev-open-project-folder-btn');
        if (devOpenProjectFolderBtn) {
            devOpenProjectFolderBtn.addEventListener('click', async () => {
                await this.openProjectFolder();
            });
        }
        
        const devOpenConsoleLogsBtn = document.getElementById('dev-open-console-logs-btn');
        if (devOpenConsoleLogsBtn) {
            devOpenConsoleLogsBtn.addEventListener('click', async () => {
                await this.openConsoleLogs();
            });
        }
        
        const devCopyModBtn = document.getElementById('dev-copy-mod-btn');
        if (devCopyModBtn) {
            devCopyModBtn.addEventListener('click', async () => {
                await this.copySelectedMod();
            });
        }
        
        const devCreateSymlinkBtn = document.getElementById('dev-create-symlink-btn');
        if (devCreateSymlinkBtn) {
            devCreateSymlinkBtn.addEventListener('click', async () => {
                await this.createSymlinkForSelectedMod();
            });
        }
        
        const devCreateBackupBtn = document.getElementById('dev-create-backup-btn');
        if (devCreateBackupBtn) {
            devCreateBackupBtn.addEventListener('click', async () => {
                await this.createBackup();
            });
        }
        
        const devRestoreBackupBtn = document.getElementById('dev-restore-backup-btn');
        if (devRestoreBackupBtn) {
            devRestoreBackupBtn.addEventListener('click', async () => {
                await this.showRestoreBackupDialog();
            });
        }
        
        const backupCancelBtn = document.getElementById('backup-cancel-btn');
        if (backupCancelBtn) {
            backupCancelBtn.addEventListener('click', () => {
                this.hideBackupDialog();
            });
        }
        
        const developerViewBtn = document.getElementById('developer-view-btn');
        if (developerViewBtn) {
            developerViewBtn.addEventListener('click', async () => {
                const isEnabled = this.app.userConfig && this.app.userConfig.developerViewMode;
                await this.toggleDeveloperView(!isEnabled);
            });
        }
    }
    
    async createMod() {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        if (!this.app.userConfig.projectPath) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.projectPathNotSet')
                );
            }
            return;
        }
        
        if (!this.app.modalManager) {
            return;
        }
        
        this.app.modalManager.showModal(this.t('ui.developer.enterModName'), '', async (modName) => {
            if (!modName || !modName.trim()) {
                return;
            }
            
            modName = modName.trim();
            
            if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(modName)) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        this.app.t('messages.developer.invalidModName')
                    );
                }
                return;
            }
            
            try {
                const result = await window.electronAPI.createModStructure(
                    this.app.userConfig.projectPath,
                    modName
                );
                
                if (result.success) {
                    if (this.app.uiManager && this.app.uiManager.showMessage) {
                        await this.app.uiManager.showMessage(
                            this.app.t('messages.common.success'),
                            this.app.t('messages.developer.modCreated', { modName, modPath: result.modPath })
                        );
                    }
                    
                    if (this.app.modScanService && this.app.modEntries) {
                        const scanResult = await this.app.modScanService.scanModsDirectory(
                            this.app.modEntries, 
                            this.app.selectedModName
                        );
                        this.app.selectedModName = scanResult.selectedModName;
                        
                        const createdMod = this.app.modEntries.find(m => m.name === modName);
                        if (createdMod) {
                            createdMod.isNew = true;
                        }
                        
                        if (this.app.modListComponent) {
                            this.app.modListComponent.modEntries = this.app.modEntries;
                            this.app.modListComponent.updateModList();
                        }
                        
                        if (this.app.updateStatistics) {
                            this.app.updateStatistics();
                        }
                    }
                } else {
                    if (this.app.uiManager && this.app.uiManager.showMessage) {
                        await this.app.uiManager.showMessage(
                            this.app.t('messages.common.error'),
                            result.error || this.app.t('messages.developer.modCreationError')
                        );
                    }
                }
            } catch (error) {
                console.error('Error creating mod:', error);
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        error.message || this.app.t('messages.developer.modCreationError')
                    );
                }
            }
        });
    }
    
    updateVisibility() {
        const expertModeFrame = document.querySelector('.expert-mode-frame');
        if (expertModeFrame) {
            if (this.app.userConfig && this.app.userConfig.developerMode) {
                expertModeFrame.style.display = 'block';
            } else {
                expertModeFrame.style.display = 'none';
            }
        }
        
        this.updateDeveloperView();
    }
    
    async toggleDeveloperView(enabled) {
        if (!this.app.userConfig) {
            this.app.userConfig = {};
        }
        
        this.app.userConfig.developerViewMode = enabled;
        await this.app.configManager.saveUserConfig();
        
        this.updateDeveloperView();
        
        if (enabled && (!this.app.userConfig || !this.app.userConfig.projectPath)) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.projectPathNotSet')
                );
            }
            const developerViewBtn = document.getElementById('developer-view-btn');
            if (developerViewBtn) {
                developerViewBtn.classList.remove('active');
                this.app.userConfig.developerViewMode = false;
                await this.app.configManager.saveUserConfig();
                this.updateDeveloperView();
                return;
            }
        }
        
        this.app.selectedModName = '';
        this.app.selectedModNames.clear();
        
        if (this.app.modListComponent) {
            this.app.modListComponent.clearSelection();
        }
        
        if (this.app.todosComponent) {
            this.app.todosComponent.resetTodosCollapse();
        }
        
        if (enabled) {
            this.app.modEntries = [];
        } else {
            if (this.app.filePath && this.app.fileService) {
                try {
                    const parsed = await this.app.fileService.loadFile(this.app.filePath);
                    this.app.headerLines = parsed.headerLines;
                    this.app.modEntries = parsed.modEntries;
                } catch (error) {
                    console.error('Error reloading file:', error);
                }
            }
        }
        
        if (this.app.modScanService && this.app.modEntries) {
            const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, '');
            this.app.selectedModName = scanResult.selectedModName;
            
            if (this.app.modListComponent) {
                this.app.modListComponent.modEntries = this.app.modEntries;
                this.app.modListComponent.updateModList();
            }
            
            if (this.app.updateStatistics) {
                this.app.updateStatistics();
            }
        }
    }
    
    updateDeveloperView() {
        const isEnabled = this.app.userConfig && this.app.userConfig.developerViewMode;
        
        const buttonFrames = document.querySelectorAll('.button-frame');
        buttonFrames.forEach(frame => {
            if (frame.closest('.expert-mode-frame')) {
                return;
            }
            if (frame.classList.contains('dev-create-mod-frame') || frame.classList.contains('dev-sync-mod-frame')) {
                frame.style.display = isEnabled ? '' : 'none';
                return;
            }
            frame.style.display = isEnabled ? 'none' : '';
        });
        
        const bulkActionsPanel = document.getElementById('bulk-actions-panel');
        if (bulkActionsPanel) {
            bulkActionsPanel.style.display = isEnabled ? 'none' : '';
        }
        
        const searchFilters = document.querySelector('.search-filters');
        if (searchFilters) {
            searchFilters.style.display = isEnabled ? 'none' : '';
        }
        
        const profilesFrame = document.querySelector('.profiles-frame');
        if (profilesFrame) {
            profilesFrame.style.display = isEnabled ? 'none' : '';
        }
        
        const todosFrame = document.querySelector('.todos-frame');
        if (todosFrame) {
            todosFrame.style.display = isEnabled ? '' : 'none';
        }
        
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.style.display = isEnabled ? 'none' : '';
        }
        
        const developerViewBtn = document.getElementById('developer-view-btn');
        if (developerViewBtn) {
            if (isEnabled) {
                developerViewBtn.classList.add('active');
            } else {
                developerViewBtn.classList.remove('active');
            }
        }
    }
    
    updateLocalization() {
        const devSelectAllBtn = document.getElementById('dev-select-all-btn');
        if (devSelectAllBtn) {
            devSelectAllBtn.title = this.t('ui.developer.selectAll');
        }
        
        const devCreateModBtn = document.getElementById('dev-create-mod-btn');
        if (devCreateModBtn) {
            devCreateModBtn.title = this.t('ui.developer.createMod');
        }
        
        const devOpenProjectFolderBtn = document.getElementById('dev-open-project-folder-btn');
        if (devOpenProjectFolderBtn) {
            devOpenProjectFolderBtn.title = this.t('ui.developer.openProjectFolder');
        }
        
        const devOpenConsoleLogsBtn = document.getElementById('dev-open-console-logs-btn');
        if (devOpenConsoleLogsBtn) {
            devOpenConsoleLogsBtn.title = this.t('ui.developer.openConsoleLogs');
        }
        
        const devCopyModBtn = document.getElementById('dev-copy-mod-btn');
        if (devCopyModBtn) {
            devCopyModBtn.title = this.t('ui.developer.copyMod');
        }
        
        const devCreateSymlinkBtn = document.getElementById('dev-create-symlink-btn');
        if (devCreateSymlinkBtn) {
            devCreateSymlinkBtn.title = this.t('ui.developer.createSymlink');
        }
        
        const devCreateBackupBtn = document.getElementById('dev-create-backup-btn');
        if (devCreateBackupBtn) {
            devCreateBackupBtn.title = this.t('ui.developer.createBackup');
        }
        
        const devRestoreBackupBtn = document.getElementById('dev-restore-backup-btn');
        if (devRestoreBackupBtn) {
            devRestoreBackupBtn.title = this.t('ui.developer.restoreBackup');
        }
        
        const developerViewBtn = document.getElementById('developer-view-btn');
        if (developerViewBtn) {
            developerViewBtn.title = this.t('ui.developer.devView');
        }
    }
    
    async copySelectedMod() {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        if (!this.app.userConfig.projectPath) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.projectPathNotSet')
                );
            }
            return;
        }
        
        if (!this.app.selectedModName || !this.app.modEntries) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.noModSelected')
                );
            }
            return;
        }
        
        const selectedMod = this.app.modEntries.find(m => m.name === this.app.selectedModName);
        if (!selectedMod) {
            return;
        }
        
        const sourcePath = `${this.app.userConfig.projectPath}\\${selectedMod.name}`;
        const sourceExists = await window.electronAPI.fileExists(sourcePath);
        if (!sourceExists) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.modNotFoundInProject')
                );
            }
            return;
        }
        
        if (!this.app.filePath) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.modLoadOrderFileNotLoaded')
                );
            }
            return;
        }
        
        const modsDir = this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\'));
        const destPath = `${modsDir}\\${selectedMod.name}`;
        
        if (this.app.uiManager && this.app.uiManager.showConfirm) {
            const confirmed = await this.app.uiManager.showConfirm(
                this.app.t('messages.developer.copyModConfirm', { sourcePath, destPath, modName: selectedMod.name })
            );
            if (!confirmed) {
                return;
            }
        }
        
        try {
            const copyResult = await window.electronAPI.copyFolderToMods(sourcePath, modsDir);
            
            if (copyResult.success) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.success'),
                        this.app.t('messages.developer.modCopied', { modName: selectedMod.name })
                    );
                }
                
                if (this.app.modListComponent && this.app.modListComponent.scanAndUpdate) {
                    await this.app.modListComponent.scanAndUpdate();
                }
            } else {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        copyResult.error || this.app.t('messages.developer.modCopyError')
                    );
                }
            }
        } catch (error) {
            console.error('Error copying mod:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || this.app.t('messages.developer.modCopyError')
                );
            }
        }
    }
    
    async createSymlinkForSelectedMod() {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        if (!this.app.userConfig.projectPath) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.projectPathNotSet')
                );
            }
            return;
        }
        
        if (!this.app.selectedModName || !this.app.modEntries) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.noModSelected')
                );
            }
            return;
        }
        
        const selectedMod = this.app.modEntries.find(m => m.name === this.app.selectedModName);
        if (!selectedMod) {
            return;
        }
        
        const targetPath = `${this.app.userConfig.projectPath}\\${selectedMod.name}`;
        const targetExists = await window.electronAPI.fileExists(targetPath);
        if (!targetExists) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.modNotFoundInProject')
                );
            }
            return;
        }
        
        if (!this.app.filePath) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.modLoadOrderFileNotLoaded')
                );
            }
            return;
        }
        
        const modsDir = this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\'));
        const linkPath = `${modsDir}\\${selectedMod.name}`;
        
        if (this.app.uiManager && this.app.uiManager.showConfirm) {
            const confirmed = await this.app.uiManager.showConfirm(
                this.app.t('messages.developer.createSymlinkConfirm', { targetPath, linkPath, modName: selectedMod.name })
            );
            if (!confirmed) {
                return;
            }
        }
        
        try {
            const symlinkResult = await window.electronAPI.createSymlink(linkPath, targetPath);
            
            if (symlinkResult.success) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.success'),
                        this.app.t('messages.developer.symlinkCreated', { modName: selectedMod.name })
                    );
                }
                
                if (this.app.modListComponent && this.app.modListComponent.scanAndUpdate) {
                    await this.app.modListComponent.scanAndUpdate();
                }
            } else {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        symlinkResult.error || this.app.t('messages.developer.symlinkCreationError')
                    );
                }
            }
        } catch (error) {
            console.error('Error creating symlink:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || this.app.t('messages.developer.symlinkCreationError')
                );
            }
        }
    }
    
    async openProjectFolder() {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        if (!this.app.userConfig.projectPath) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.projectPathNotSet')
                );
            }
            return;
        }
        
        try {
            const result = await window.electronAPI.openFolder(this.app.userConfig.projectPath);
            if (!result.success && result.error) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        result.error
                    );
                }
            }
        } catch (error) {
            console.error('Error opening project folder:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || String(error)
                );
            }
        }
    }
    
    async openConsoleLogs() {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        try {
            const result = await window.electronAPI.getConsoleLogsPath();
            if (result.success && result.path) {
                const openResult = await window.electronAPI.openFolder(result.path);
                if (!openResult.success && openResult.error) {
                    if (this.app.uiManager && this.app.uiManager.showMessage) {
                        await this.app.uiManager.showMessage(
                            this.app.t('messages.common.error'),
                            openResult.error
                        );
                    }
                }
            } else {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        result.error || this.app.t('messages.developer.consoleLogsPathError')
                    );
                }
            }
        } catch (error) {
            console.error('Error opening console logs:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || String(error)
                );
            }
        }
    }
    
    async deleteModFolder(modName) {
        let projectPath = null;
        let modPath = null;
        
        if (!modName) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.noModSelected')
                );
            }
            return;
        }
        
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        projectPath = this.app.userConfig && this.app.userConfig.projectPath;
        if (!projectPath || typeof projectPath !== 'string') {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.projectPathNotSet')
                );
            }
            return;
        }
        
        if (!this.app.modEntries || !this.app.modEntries.find(m => m.name === modName)) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    `${this.app.t('messages.developer.modNotFoundInProject')}\n\nMod '${modName}' not found in current mod list.`
                );
            }
            return;
        }
        
        const normalizedProjectPath = projectPath.trim().replace(/[\/\\]+$/, '');
        modPath = normalizedProjectPath + '\\' + modName;
        const isDirectory = await window.electronAPI.checkIsDirectory(modPath);
        
        if (!isDirectory) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    `${this.app.t('messages.developer.modNotFoundInProject')}\n\nMod: ${modName}\nPath: ${modPath}`
                );
            }
            return;
        }
        
        if (this.app.uiManager && this.app.uiManager.showConfirm) {
            const confirmed = await this.app.uiManager.showConfirm(
                this.app.t('messages.developer.deleteModFolderConfirm', { modName, modPath })
            );
            if (!confirmed) {
                return;
            }
        }
        
        try {
            const deleteResult = await window.electronAPI.deleteFolder(modPath);
            
            console.log('Delete result:', deleteResult);
            
            if (deleteResult && deleteResult.success) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.success'),
                        this.app.t('messages.developer.modFolderDeleted', { modName })
                    );
                }
                
                if (this.app.modScanService && this.app.modEntries) {
                    const scanResult = await this.app.modScanService.scanModsDirectory(
                        this.app.modEntries, 
                        this.app.selectedModName
                    );
                    this.app.selectedModName = scanResult.selectedModName;
                    
                    if (this.app.modListComponent) {
                        this.app.modListComponent.modEntries = this.app.modEntries;
                        this.app.modListComponent.updateModList();
                    }
                    
                    if (this.app.updateStatistics) {
                        this.app.updateStatistics();
                    }
                }
            } else {
                console.error('Delete folder error:', deleteResult.error);
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    const errorMessage = deleteResult.error || this.app.t('messages.developer.modFolderDeleteError');
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        `${this.app.t('messages.developer.modFolderDeleteError')}\n\n${errorMessage}\n\nМод: ${modName}\nПуть: ${modPath}`
                    );
                }
            }
        } catch (error) {
            console.error('Error deleting mod folder:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                const errorMessage = error.message || String(error);
                const errorPath = modPath || 'неизвестно';
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    `${this.app.t('messages.developer.modFolderDeleteError')}\n\n${errorMessage}\n\nМод: ${modName}\nПуть: ${errorPath}`
                );
            }
        }
    }
    
    async createBackup() {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        if (!this.app.selectedModName) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.noModSelected')
                );
            }
            return;
        }
        
        const projectPath = this.app.userConfig && this.app.userConfig.projectPath;
        if (!projectPath || typeof projectPath !== 'string') {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.projectPathNotSet')
                );
            }
            return;
        }
        
        const modName = this.app.selectedModName;
        
        if (this.app.uiManager && this.app.uiManager.showConfirm) {
            const confirmed = await this.app.uiManager.showConfirm(
                this.app.t('messages.developer.createBackupConfirm', { modName })
            );
            if (!confirmed) {
                return;
            }
        }
        
        let comment = '';
        if (this.app.modalManager) {
            comment = await new Promise((resolve) => {
                this.app.modalManager.showModal(
                    this.app.t('ui.developer.enterBackupComment'),
                    '',
                    (value) => {
                        resolve(value !== null ? (value ? value.trim() : '') : '');
                    }
                );
            });
        }
        
        try {
            const result = await window.electronAPI.createBackup(projectPath, modName, comment);
            if (result.success) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.success'),
                        this.app.t('messages.developer.backupCreated', { modName, versionName: result.versionName })
                    );
                }
            } else {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        result.error || this.app.t('messages.developer.backupCreationError')
                    );
                }
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || String(error)
                );
            }
        }
    }
    
    async showRestoreBackupDialog(modName = null) {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        const selectedModName = modName || this.app.selectedModName;
        
        if (!selectedModName) {
            await this.showModsWithBackupsDialog();
            return;
        }
        
        const modNameToUse = selectedModName;
        
        try {
            const result = await window.electronAPI.listBackups(modNameToUse);
            if (!result.success) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        result.error || this.app.t('messages.developer.backupListError')
                    );
                }
                return;
            }
            
            const backups = result.backups || [];
            if (backups.length === 0) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.info'),
                        this.app.t('messages.developer.noBackupsFound', { modName: modNameToUse })
                    );
                }
                return;
            }
            
            this.showBackupDialog(modNameToUse, backups);
        } catch (error) {
            console.error('Error listing backups:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || String(error)
                );
            }
        }
    }
    
    async showModsWithBackupsDialog() {
        try {
            const result = await window.electronAPI.listModsWithBackups();
            if (!result.success) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        result.error || this.app.t('messages.developer.backupListError')
                    );
                }
                return;
            }
            
            const mods = result.mods || [];
            if (mods.length === 0) {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.info'),
                        this.app.t('messages.developer.noModsWithBackups')
                    );
                }
                return;
            }
            
            this.showModsWithBackupsDialogContent(mods);
        } catch (error) {
            console.error('Error listing mods with backups:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || String(error)
                );
            }
        }
    }
    
    showModsWithBackupsDialogContent(mods) {
        const backupDialog = document.getElementById('backup-dialog');
        const backupTitle = document.getElementById('backup-title');
        const backupList = document.getElementById('backup-list');
        const backupCancelBtn = document.getElementById('backup-cancel-btn');
        
        if (!backupDialog || !backupTitle || !backupList) {
            return;
        }
        
        backupTitle.textContent = this.app.t('ui.developer.selectModWithBackups');
        if (backupCancelBtn) {
            backupCancelBtn.textContent = this.app.t('ui.common.cancel');
        }
        
        backupList.innerHTML = `
            <div class="backup-search-frame">
                <input type="text" id="backup-mod-search" class="backup-mod-search-input" placeholder="${this.app.t('ui.developer.searchModPlaceholder')}" />
            </div>
            <div id="backup-mods-list" class="backup-mods-list"></div>
        `;
        
        const modsList = document.getElementById('backup-mods-list');
        const searchInput = document.getElementById('backup-mod-search');
        
        const renderModsList = (filteredMods) => {
            modsList.innerHTML = '';
            
            filteredMods.forEach(mod => {
                const modItem = document.createElement('div');
                modItem.className = 'backup-mod-item';
                
                const lastBackupDate = mod.lastBackupDate ? new Date(mod.lastBackupDate).toLocaleString(this.app.localeManager?.currentLocale || 'en') : '';
                
                modItem.innerHTML = `
                    <div class="backup-mod-item-info">
                        <div class="backup-mod-item-name">${this.escapeHtml(mod.modName)}</div>
                        <div class="backup-mod-item-details">
                            ${this.app.t('ui.developer.backupsCount', { count: mod.backupsCount })}${lastBackupDate ? ' • ' + lastBackupDate : ''}
                        </div>
                    </div>
                    <button class="btn btn-primary backup-mod-select-btn" data-mod="${this.escapeHtml(mod.modName)}">
                        ${this.app.t('ui.common.select')}
                    </button>
                `;
                
                const selectBtn = modItem.querySelector('.backup-mod-select-btn');
                selectBtn.addEventListener('click', async () => {
                    await this.showRestoreBackupDialog(mod.modName);
                });
                
                modsList.appendChild(modItem);
            });
        };
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                const filteredMods = mods.filter(mod => 
                    mod.modName.toLowerCase().includes(searchTerm)
                );
                renderModsList(filteredMods);
            });
        }
        
        renderModsList(mods);
        
        backupDialog.style.display = 'flex';
        backupDialog.classList.add('show');
        
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }
    
    showBackupDialog(modName, backups) {
        const backupDialog = document.getElementById('backup-dialog');
        const backupTitle = document.getElementById('backup-title');
        const backupList = document.getElementById('backup-list');
        const backupCancelBtn = document.getElementById('backup-cancel-btn');
        
        if (!backupDialog || !backupTitle || !backupList) {
            return;
        }
        
        backupTitle.textContent = this.app.t('ui.developer.restoreBackup') + ': ' + modName;
        if (backupCancelBtn) {
            backupCancelBtn.textContent = this.app.t('ui.common.cancel');
        }
        backupList.innerHTML = '';
        
        backups.forEach(backup => {
            const backupItem = document.createElement('div');
            backupItem.className = 'backup-item';
            
            const dateTime = backup.versionName.replace(/_/g, ' ').replace(/-/g, ':');
            const formattedDate = dateTime.replace(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3 $4:$5:$6');
            
            const commentHtml = backup.comment ? `<div class="backup-item-comment">${this.escapeHtml(backup.comment)}</div>` : '';
            
            backupItem.innerHTML = `
                <div class="backup-item-info">
                    <div class="backup-item-date">${formattedDate}</div>
                    ${commentHtml}
                    <div class="backup-item-size">${backup.sizeFormatted}</div>
                </div>
                <div class="backup-item-actions">
                    <button class="btn btn-primary backup-restore-btn" data-version="${backup.versionName}">
                        ${this.app.t('ui.developer.restore')}
                    </button>
                    <button class="btn backup-edit-comment-btn" data-version="${backup.versionName}" title="${this.app.t('ui.developer.editComment')}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn backup-delete-btn" data-version="${backup.versionName}" title="${this.app.t('ui.developer.delete')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            const restoreBtn = backupItem.querySelector('.backup-restore-btn');
            restoreBtn.addEventListener('click', async () => {
                await this.restoreBackup(modName, backup.versionName);
            });
            
            const editCommentBtn = backupItem.querySelector('.backup-edit-comment-btn');
            editCommentBtn.addEventListener('click', async () => {
                await this.editBackupComment(modName, backup.versionName, backup.comment || '');
            });
            
            const deleteBtn = backupItem.querySelector('.backup-delete-btn');
            deleteBtn.addEventListener('click', async () => {
                await this.deleteBackup(modName, backup.versionName);
            });
            
            backupList.appendChild(backupItem);
        });
        
        backupDialog.style.display = 'flex';
        backupDialog.classList.add('show');
    }
    
    hideBackupDialog() {
        const backupDialog = document.getElementById('backup-dialog');
        if (backupDialog) {
            backupDialog.style.display = 'none';
            backupDialog.classList.remove('show');
        }
    }
    
    async restoreBackup(modName, versionName) {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        const projectPath = this.app.userConfig && this.app.userConfig.projectPath;
        if (!projectPath || typeof projectPath !== 'string') {
            this.hideBackupDialog();
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    this.app.t('messages.developer.projectPathNotSet')
                );
            }
            return;
        }
        
        this.hideBackupDialog();
        
        if (this.app.uiManager && this.app.uiManager.showConfirm) {
            const confirmed = await this.app.uiManager.showConfirm(
                this.app.t('messages.developer.restoreBackupConfirm', { modName, versionName })
            );
            if (!confirmed) {
                return;
            }
        }
        
        try {
            const result = await window.electronAPI.restoreBackup(projectPath, modName, versionName);
            if (result.success) {
                this.hideBackupDialog();
                
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.success'),
                        this.app.t('messages.developer.backupRestored', { modName, versionName })
                    );
                }
                
                if (this.app.modScanService) {
                    const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, this.app.selectedModName);
                    if (scanResult && this.app.modListComponent) {
                        this.app.modListComponent.updateModList();
                        if (this.app.updateStatistics) {
                            this.app.updateStatistics();
                        }
                    }
                }
            } else {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        result.error || this.app.t('messages.developer.backupRestoreError')
                    );
                }
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || String(error)
                );
            }
        }
    }
    
    async deleteBackup(modName, versionName) {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        if (this.app.uiManager && this.app.uiManager.showConfirm) {
            const confirmed = await this.app.uiManager.showConfirm(
                this.app.t('messages.developer.deleteBackupConfirm', { modName, versionName })
            );
            if (!confirmed) {
                return;
            }
        }
        
        try {
            const result = await window.electronAPI.deleteBackup(modName, versionName);
            if (result.success) {
                this.app.selectedModName = modName;
                
                const listResult = await window.electronAPI.listBackups(modName);
                const remainingBackups = listResult.success && listResult.backups ? listResult.backups.length : 0;
                
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.success'),
                        this.app.t('messages.developer.backupDeleted', { modName, versionName })
                    );
                }
                
                if (remainingBackups > 0) {
                    await this.showRestoreBackupDialog();
                } else {
                    this.hideBackupDialog();
                }
            } else {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        result.error || this.app.t('messages.developer.backupDeleteError')
                    );
                }
            }
        } catch (error) {
            console.error('Error deleting backup:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || String(error)
                );
            }
        }
    }
    
    async editBackupComment(modName, versionName, currentComment) {
        if (!this.app.userConfig || !this.app.userConfig.developerMode) {
            return;
        }
        
        if (!this.app.modalManager) {
            return;
        }
        
        const newComment = await new Promise((resolve) => {
            this.app.modalManager.showModal(
                this.app.t('ui.developer.editBackupComment'),
                currentComment || '',
                (value) => {
                    resolve(value !== null ? (value ? value.trim() : '') : null);
                }
            );
        });
        
        if (newComment === null) {
            return;
        }
        
        try {
            const result = await window.electronAPI.updateBackupComment(modName, versionName, newComment);
            if (result.success) {
                await this.showRestoreBackupDialog(modName);
            } else {
                if (this.app.uiManager && this.app.uiManager.showMessage) {
                    await this.app.uiManager.showMessage(
                        this.app.t('messages.common.error'),
                        result.error || this.app.t('messages.developer.backupCommentUpdateError')
                    );
                }
            }
        } catch (error) {
            console.error('Error updating backup comment:', error);
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    error.message || String(error)
                );
            }
        }
    }
}
