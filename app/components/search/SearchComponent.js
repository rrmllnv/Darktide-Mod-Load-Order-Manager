export class SearchComponent {
    constructor(app) {
        this.app = app;
        this.locales = {};
    }
    
    async init() {
        this.loadStyles();
        await this.loadLocales();
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
    
    async loadLocales() {
        const currentLocale = this.app.localeManager ? this.app.localeManager.getCurrentLocale() || 'en' : 'en';
        await this.loadLocale(currentLocale);
    }
    
    async loadLocale(locale) {
        if (this.locales[locale]) {
            return this.locales[locale];
        }
        
        try {
            const response = await fetch(`components/search/locales/${locale}.json`);
            if (response.ok) {
                this.locales[locale] = await response.json();
                return this.locales[locale];
            } else {
                if (locale !== 'en') {
                    return await this.loadLocale('en');
                }
            }
        } catch (error) {
            console.warn(`Failed to load search locale ${locale}:`, error);
            if (locale !== 'en') {
                return await this.loadLocale('en');
            }
        }
        
        return null;
    }
    
    t(key, params = {}) {
        const currentLocale = this.app.localeManager ? this.app.localeManager.getCurrentLocale() || 'en' : 'en';
        const localeData = this.locales[currentLocale] || this.locales['en'] || {};
        
        const keys = key.split('.');
        let value = localeData;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return this.app.t(key, params);
            }
        }
        
        if (typeof value !== 'string') {
            return this.app.t(key, params);
        }
        
        if (Object.keys(params).length > 0) {
            return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }
        
        return value;
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
            searchLabel.textContent = this.t('ui.search');
        }
        
        if (this.app.elements.searchInput) {
            this.app.elements.searchInput.placeholder = this.t('ui.searchPlaceholder');
        }
        
        if (this.app.elements.clearSearchBtn) {
            this.app.elements.clearSearchBtn.title = this.t('ui.clear');
        }
        
        const hideNewModsSpan = document.querySelector('#hide-new-mods-checkbox')?.nextElementSibling;
        if (hideNewModsSpan) {
            hideNewModsSpan.textContent = this.t('ui.hideNewMods');
        }
        
        const hideNotFoundModsSpan = document.querySelector('#hide-not-found-mods-checkbox')?.nextElementSibling;
        if (hideNotFoundModsSpan) {
            hideNotFoundModsSpan.textContent = this.t('ui.hideNotFoundMods');
        }
        
        const hideUnusedModsSpan = document.querySelector('#hide-unused-mods-checkbox')?.nextElementSibling;
        if (hideUnusedModsSpan) {
            hideUnusedModsSpan.textContent = this.t('ui.hideUnusedMods');
        }
    }
}
