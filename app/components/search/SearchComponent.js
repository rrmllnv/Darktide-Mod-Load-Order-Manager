export class SearchComponent {
    constructor(app) {
        this.app = app;
    }
    
    async init() {
        this.bindEvents();
        this.updateLocalization();
    }
    
    t(key, params = {}) {
        if (this.app.localeManager) {
            return this.app.localeManager.t(key, params);
        }
        return this.app.t(key, params);
    }
    
    bindEvents() {
        if (this.app.elements.searchInput) {
            this.app.elements.searchInput.addEventListener('input', () => {
                this.onSearchChange();
            });
        }
        
        if (this.app.elements.clearSearchBtn) {
            this.app.elements.clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        if (this.app.elements.hideNewModsCheckbox) {
            this.app.elements.hideNewModsCheckbox.addEventListener('change', () => {
                this.app.hideNewMods = this.app.elements.hideNewModsCheckbox.checked;
                if (this.app.configManager) {
                    this.app.configManager.saveUserConfig();
                }
                if (this.app.modListComponent) {
                    this.app.modListComponent.updateModList();
                }
            });
        }
        
        if (this.app.elements.hideUnusedModsCheckbox) {
            this.app.elements.hideUnusedModsCheckbox.addEventListener('change', () => {
                this.app.hideUnusedMods = this.app.elements.hideUnusedModsCheckbox.checked;
                if (this.app.configManager) {
                    this.app.configManager.saveUserConfig();
                }
                if (this.app.modListComponent) {
                    this.app.modListComponent.updateModList();
                }
            });
        }
        
        if (this.app.elements.hideNotFoundModsCheckbox) {
            this.app.elements.hideNotFoundModsCheckbox.addEventListener('change', () => {
                this.app.hideNotFoundMods = this.app.elements.hideNotFoundModsCheckbox.checked;
                if (this.app.configManager) {
                    this.app.configManager.saveUserConfig();
                }
                if (this.app.modListComponent) {
                    this.app.modListComponent.updateModList();
                }
            });
        }
    }
    
    onSearchChange() {
        if (this.app.modListComponent) {
            const searchText = this.app.elements.searchInput ? this.app.elements.searchInput.value : '';
            this.app.modListComponent.updateModList(searchText);
        }
        
        if (this.app.todosComponent && !this.app.selectedModName) {
            this.app.todosComponent.loadTodos();
        }
    }
    
    clearSearch() {
        if (this.app.elements.searchInput) {
            this.app.elements.searchInput.value = '';
        }
        if (this.app.modListComponent) {
            this.app.modListComponent.updateModList();
        }
        if (this.app.todosComponent && !this.app.selectedModName) {
            this.app.todosComponent.loadTodos();
        }
    }
    
    getSearchText() {
        return this.app.elements.searchInput ? this.app.elements.searchInput.value : '';
    }
    
    applySettings() {
        if (!this.app.userConfig) {
            return;
        }
        
        if (this.app.userConfig.hideNewMods !== undefined) {
            this.app.hideNewMods = this.app.userConfig.hideNewMods;
            if (this.app.elements.hideNewModsCheckbox) {
                this.app.elements.hideNewModsCheckbox.checked = this.app.hideNewMods;
            }
        }
        
        if (this.app.userConfig.hideNotFoundMods !== undefined) {
            this.app.hideNotFoundMods = this.app.userConfig.hideNotFoundMods;
            if (this.app.elements.hideNotFoundModsCheckbox) {
                this.app.elements.hideNotFoundModsCheckbox.checked = this.app.hideNotFoundMods;
            }
        }
        
        if (this.app.userConfig.hideUnusedMods !== undefined) {
            this.app.hideUnusedMods = this.app.userConfig.hideUnusedMods;
            if (this.app.elements.hideUnusedModsCheckbox) {
                this.app.elements.hideUnusedModsCheckbox.checked = this.app.hideUnusedMods;
            }
        }
    }
    
    updateLocalization() {
        const searchLabel = document.querySelector('.search-label');
        if (searchLabel) {
            searchLabel.textContent = this.t('ui.search.search');
        }
        
        if (this.app.elements.searchInput) {
            this.app.elements.searchInput.placeholder = this.t('ui.search.searchPlaceholder');
        }
        
        if (this.app.elements.clearSearchBtn) {
            this.app.elements.clearSearchBtn.title = this.t('ui.search.clear');
        }
        
        const hideNewModsLabel = document.querySelector('#hide-new-mods-checkbox')?.parentElement?.querySelector('.switch-label');
        if (hideNewModsLabel) {
            hideNewModsLabel.textContent = this.t('ui.search.hideNewMods');
        }
        
        const hideNotFoundModsLabel = document.querySelector('#hide-not-found-mods-checkbox')?.parentElement?.querySelector('.switch-label');
        if (hideNotFoundModsLabel) {
            hideNotFoundModsLabel.textContent = this.t('ui.search.hideNotFoundMods');
        }
        
        const hideUnusedModsLabel = document.querySelector('#hide-unused-mods-checkbox')?.parentElement?.querySelector('.switch-label');
        if (hideUnusedModsLabel) {
            hideUnusedModsLabel.textContent = this.t('ui.search.hideUnusedMods');
        }
    }
}
