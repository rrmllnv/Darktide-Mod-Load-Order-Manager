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
        const developerBtn = document.getElementById('developer-btn');
        if (developerBtn) {
            developerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('developer-dropdown');
                if (dropdown) {
                    dropdown.classList.toggle('show');
                }
            });
        }
        
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('developer-dropdown');
            const developerBtn = document.getElementById('developer-btn');
            if (dropdown && 
                !dropdown.contains(e.target) && 
                !developerBtn?.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        const createModBtn = document.getElementById('create-mod-btn');
        if (createModBtn) {
            createModBtn.addEventListener('click', async () => {
                const dropdown = document.getElementById('developer-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
                if (this.createMod) {
                    await this.createMod();
                }
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
    }
    
    updateLocalization() {
        const developerBtn = document.getElementById('developer-btn');
        if (developerBtn) {
            developerBtn.title = this.t('ui.developer.tools');
        }
        
        const createModBtn = document.getElementById('create-mod-btn');
        if (createModBtn) {
            const span = createModBtn.querySelector('span');
            if (span) {
                span.textContent = this.t('ui.developer.createMod');
            }
        }
    }
}
