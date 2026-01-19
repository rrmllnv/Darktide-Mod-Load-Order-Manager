export class DeveloperComponent {
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
        
        if (enabled && !this.app.userConfig.projectPath) {
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
        
        const infoPanel = document.querySelector('.info-panel');
        if (infoPanel) {
            infoPanel.style.display = isEnabled ? 'none' : '';
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
        
        const devCopyModBtn = document.getElementById('dev-copy-mod-btn');
        if (devCopyModBtn) {
            devCopyModBtn.title = this.t('ui.developer.copyMod');
        }
        
        const devCreateSymlinkBtn = document.getElementById('dev-create-symlink-btn');
        if (devCreateSymlinkBtn) {
            devCreateSymlinkBtn.title = this.t('ui.developer.createSymlink');
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
}
