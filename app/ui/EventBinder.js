export class EventBinder {
    constructor(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.bindAll();
    }
    
    bindAll() {
        this.elements.browseBtn.addEventListener('click', () => this.callbacks.browseFile());
        
        if (this.elements.openFileBtn) {
            this.elements.openFileBtn.addEventListener('click', async () => {
                if (this.callbacks.openFile) {
                    await this.callbacks.openFile();
                }
            });
        }
        
        if (this.elements.openModsFolderBtn) {
            this.elements.openModsFolderBtn.addEventListener('click', async () => {
                if (this.callbacks.openModsFolder) {
                    await this.callbacks.openModsFolder();
                }
            });
        }
        
        
        this.elements.saveBtn.addEventListener('click', () => this.callbacks.saveFile());
        
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.callbacks.openSettings());
        }
        
        if (this.elements.bulkEnableBtn) {
            this.elements.bulkEnableBtn.addEventListener('click', () => this.callbacks.bulkEnable());
        }
        if (this.elements.bulkDisableBtn) {
            this.elements.bulkDisableBtn.addEventListener('click', () => this.callbacks.bulkDisable());
        }
        if (this.elements.bulkDeleteBtn) {
            this.elements.bulkDeleteBtn.addEventListener('click', () => this.callbacks.bulkDelete());
        }
    }
}
