export class EventBinder {
    constructor(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.bindAll();
    }
    
    bindAll() {
        this.elements.browseBtn.addEventListener('click', () => this.callbacks.browseFile());
        
        if (this.elements.launchDtkitBtn) {
            this.elements.launchDtkitBtn.addEventListener('click', () => this.callbacks.launchDtkitPatch());
        }
        
        this.elements.sortSelect.addEventListener('change', () => this.callbacks.onSortChange());
        
        this.elements.enableAllBtn.addEventListener('click', () => this.callbacks.enableAll());
        this.elements.disableAllBtn.addEventListener('click', () => this.callbacks.disableAll());
        this.elements.scanBtn.addEventListener('click', () => this.callbacks.scanAndUpdate());
        
        if (this.elements.bulkSelectEnabledBtn) {
            this.elements.bulkSelectEnabledBtn.addEventListener('click', () => this.callbacks.bulkSelectEnabled());
        }
        if (this.elements.bulkSelectDisabledBtn) {
            this.elements.bulkSelectDisabledBtn.addEventListener('click', () => this.callbacks.bulkSelectDisabled());
        }
        
        this.elements.searchInput.addEventListener('input', () => this.callbacks.onSearchChange());
        this.elements.clearSearchBtn.addEventListener('click', () => this.callbacks.clearSearch());
        
        this.elements.hideNewModsCheckbox.addEventListener('change', () => {
            this.callbacks.onHideNewModsChange(this.elements.hideNewModsCheckbox.checked);
        });
        
        this.elements.hideUnusedModsCheckbox.addEventListener('change', () => {
            this.callbacks.onHideUnusedModsChange(this.elements.hideUnusedModsCheckbox.checked);
        });
        
        if (this.elements.hideNotFoundModsCheckbox) {
            this.elements.hideNotFoundModsCheckbox.addEventListener('change', () => {
                this.callbacks.onHideNotFoundModsChange(this.elements.hideNotFoundModsCheckbox.checked);
            });
        }
        
        if (this.elements.addModBtn) {
            this.elements.addModBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.elements.addModDropdown) {
                    this.elements.addModDropdown.classList.toggle('show');
                }
            });
        }
        
        document.addEventListener('click', (e) => {
            if (this.elements.addModDropdown && 
                !this.elements.addModDropdown.contains(e.target) && 
                !this.elements.addModBtn?.contains(e.target)) {
                this.elements.addModDropdown.classList.remove('show');
            }
        });
        
        if (this.elements.addModFolderBtn) {
            this.elements.addModFolderBtn.addEventListener('click', () => {
                if (this.elements.addModDropdown) {
                    this.elements.addModDropdown.classList.remove('show');
                }
                this.callbacks.addModFolder();
            });
        }
        
        if (this.elements.createSymlinkBtn) {
            this.elements.createSymlinkBtn.addEventListener('click', () => {
                if (this.elements.addModDropdown) {
                    this.elements.addModDropdown.classList.remove('show');
                }
                this.callbacks.createSymlinkForMod();
            });
        }
        
        this.elements.newProfileBtn.addEventListener('click', () => this.callbacks.saveCurrentProfile());
        this.elements.overwriteProfileBtn.addEventListener('click', () => this.callbacks.overwriteSelectedProfile());
        this.elements.loadProfileBtn.addEventListener('click', () => this.callbacks.loadSelectedProfile());
        this.elements.reloadFileBtn.addEventListener('click', () => this.callbacks.reloadFile());
        this.elements.renameProfileBtn.addEventListener('click', () => this.callbacks.renameSelectedProfile());
        this.elements.deleteProfileBtn.addEventListener('click', () => this.callbacks.deleteSelectedProfile());
        
        this.elements.saveBtn.addEventListener('click', () => this.callbacks.saveFile());
        this.elements.cancelBtn.addEventListener('click', () => this.callbacks.loadFile());
        
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
        if (this.elements.bulkClearSelectionBtn) {
            this.elements.bulkClearSelectionBtn.addEventListener('click', () => this.callbacks.bulkClearSelection());
        }
    }
}
