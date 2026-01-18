export class FileOperationsComponent {
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
    
    async loadLocales() {
        const currentLocale = this.app.localeManager ? this.app.localeManager.getCurrentLocale() || 'en' : 'en';
        await this.loadLocale(currentLocale);
    }
    
    async loadLocale(locale) {
        if (this.locales[locale]) {
            return this.locales[locale];
        }
        
        try {
            const response = await fetch(`components/file-operations/locales/${locale}.json`);
            if (response.ok) {
                this.locales[locale] = await response.json();
                return this.locales[locale];
            } else {
                if (locale !== 'en') {
                    return await this.loadLocale('en');
                }
            }
        } catch (error) {
            console.warn(`Failed to load file-operations locale ${locale}:`, error);
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
            this.app.elements.browseBtn.textContent = this.t('ui.browse');
        }
        
        if (this.app.elements.openFileBtn) {
            this.app.elements.openFileBtn.title = this.t('ui.openFile');
        }
        
        if (this.app.elements.openModsFolderBtn) {
            this.app.elements.openModsFolderBtn.title = this.t('ui.openModsFolder');
        }
        
        if (this.app.elements.reloadFileBtn) {
            this.app.elements.reloadFileBtn.title = this.t('ui.reloadFile');
        }
        
        if (this.app.elements.addModBtn) {
            this.app.elements.addModBtn.title = this.t('ui.addMod');
        }
        
        if (this.app.elements.addModFolderBtn) {
            const span = this.app.elements.addModFolderBtn.querySelector('span');
            if (span) {
                span.textContent = this.t('ui.addModFolder');
            }
        }
        
        if (this.app.elements.launchDtkitBtn) {
            this.app.elements.launchDtkitBtn.title = this.t('ui.launchDtkitPatch');
        }
    }
}
