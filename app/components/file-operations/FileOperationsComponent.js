export class FileOperationsComponent {
    constructor(app) {
        this.app = app;
    }
    
    async init() {
        this.loadStyles();
        this.bindEvents();
        this.updateLocalization();
    }
    
    loadStyles() {
        const existingLink = document.querySelector('link[data-file-operations-style="file-operations.css"]');
        if (existingLink) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'components/file-operations/styles/file-operations.css';
        link.setAttribute('data-file-operations-style', 'file-operations.css');
        
        const baseLink = document.querySelector('link[href="styles/base.css"]');
        if (baseLink && baseLink.nextSibling) {
            baseLink.parentNode.insertBefore(link, baseLink.nextSibling);
        } else {
            document.head.appendChild(link);
        }
    }
    
    t(key, params = {}) {
        if (this.app.localeManager) {
            return this.app.localeManager.t(key, params);
        }
        return this.app.t(key, params);
    }
    
    bindEvents() {
        if (this.app.elements.browseBtn) {
            this.app.elements.browseBtn.addEventListener('click', () => {
                if (this.app.fileManager && this.app.fileManager.browseFile) {
                    this.app.fileManager.browseFile();
                }
            });
        }
        
        if (this.app.elements.openFileBtn) {
            this.app.elements.openFileBtn.addEventListener('click', async () => {
                if (this.app.fileManager && this.app.fileManager.openFile) {
                    await this.app.fileManager.openFile();
                }
            });
        }
        
        if (this.app.elements.openModsFolderBtn) {
            this.app.elements.openModsFolderBtn.addEventListener('click', async () => {
                if (this.app.fileManager && this.app.fileManager.openModsFolder) {
                    await this.app.fileManager.openModsFolder();
                }
            });
        }
        
        if (this.app.elements.reloadFileBtn) {
            this.app.elements.reloadFileBtn.addEventListener('click', async () => {
                if (this.app.fileManager && this.app.fileManager.reloadFile) {
                    await this.app.fileManager.reloadFile();
                }
            });
        }
        
        if (this.app.elements.addModBtn) {
            this.app.elements.addModBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.app.elements.addModDropdown) {
                    this.app.elements.addModDropdown.classList.toggle('show');
                }
            });
        }
        
        document.addEventListener('click', (e) => {
            if (this.app.elements.addModDropdown && 
                !this.app.elements.addModDropdown.contains(e.target) && 
                !this.app.elements.addModBtn?.contains(e.target)) {
                this.app.elements.addModDropdown.classList.remove('show');
            }
        });
        
        if (this.app.elements.addModFolderBtn) {
            this.app.elements.addModFolderBtn.addEventListener('click', async () => {
                if (this.app.elements.addModDropdown) {
                    this.app.elements.addModDropdown.classList.remove('show');
                }
                if (this.app.fileManager && this.app.fileManager.addModFolder) {
                    await this.app.fileManager.addModFolder();
                }
            });
        }
        
        if (this.app.elements.launchDtkitBtn) {
            this.app.elements.launchDtkitBtn.addEventListener('click', async () => {
                if (this.app.fileManager && this.app.fileManager.launchDtkitPatch) {
                    await this.app.fileManager.launchDtkitPatch();
                }
            });
        }
    }
    
    updateLocalization() {
        if (this.app.elements.browseBtn) {
            this.app.elements.browseBtn.textContent = this.t('ui.fileOperations.browse');
        }
        
        if (this.app.elements.openFileBtn) {
            this.app.elements.openFileBtn.title = this.t('ui.fileOperations.openFile');
        }
        
        if (this.app.elements.openModsFolderBtn) {
            this.app.elements.openModsFolderBtn.title = this.t('ui.fileOperations.openModsFolder');
        }
        
        if (this.app.elements.reloadFileBtn) {
            this.app.elements.reloadFileBtn.title = this.t('ui.fileOperations.reloadFile');
        }
        
        if (this.app.elements.addModBtn) {
            this.app.elements.addModBtn.title = this.t('ui.fileOperations.addMod');
        }
        
        if (this.app.elements.addModFolderBtn) {
            const span = this.app.elements.addModFolderBtn.querySelector('span');
            if (span) {
                span.textContent = this.t('ui.fileOperations.addModFolder');
            }
        }
        
        if (this.app.elements.launchDtkitBtn) {
            this.app.elements.launchDtkitBtn.title = this.t('ui.fileOperations.launchDtkitPatch');
        }
    }
}
