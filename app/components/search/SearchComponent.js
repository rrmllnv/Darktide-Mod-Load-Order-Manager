export class SearchComponent {
    constructor(app) {
        this.app = app;
    }
    
    async init() {
        this.loadStyles();
        this.bindEvents();
        this.updateLocalization();
    }
    
    loadStyles() {
        const existingLink = document.querySelector('link[data-search-style="search.css"]');
        if (existingLink) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'components/search/styles/search.css';
        link.setAttribute('data-search-style', 'search.css');
        
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
    }
    
    clearSearch() {
        if (this.app.elements.searchInput) {
            this.app.elements.searchInput.value = '';
        }
        if (this.app.modListComponent) {
            this.app.modListComponent.updateModList();
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
        
        const hideNewModsSpan = document.querySelector('#hide-new-mods-checkbox')?.nextElementSibling;
        if (hideNewModsSpan) {
            hideNewModsSpan.textContent = this.t('ui.search.hideNewMods');
        }
        
        const hideNotFoundModsSpan = document.querySelector('#hide-not-found-mods-checkbox')?.nextElementSibling;
        if (hideNotFoundModsSpan) {
            hideNotFoundModsSpan.textContent = this.t('ui.search.hideNotFoundMods');
        }
        
        const hideUnusedModsSpan = document.querySelector('#hide-unused-mods-checkbox')?.nextElementSibling;
        if (hideUnusedModsSpan) {
            hideUnusedModsSpan.textContent = this.t('ui.search.hideUnusedMods');
        }
    }
}
