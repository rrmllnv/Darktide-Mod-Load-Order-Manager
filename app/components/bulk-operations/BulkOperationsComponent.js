export class BulkOperationsComponent {
    constructor(app) {
        this.app = app;
        this.locales = {};
    }
    
    async init() {
        this.loadStyles();
        await this.loadLocales();
        this.bindEvents();
        this.updateLocalization();
        this.updatePanel();
    }
    
    loadStyles() {
        const existingLink = document.querySelector('link[data-bulk-operations-style="bulk-operations.css"]');
        if (existingLink) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'components/bulk-operations/styles/bulk-operations.css';
        link.setAttribute('data-bulk-operations-style', 'bulk-operations.css');
        
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
            const response = await fetch(`components/bulk-operations/locales/${locale}.json`);
            if (response.ok) {
                this.locales[locale] = await response.json();
                return this.locales[locale];
            } else {
                if (locale !== 'en') {
                    return await this.loadLocale('en');
                }
            }
        } catch (error) {
            console.warn(`Failed to load bulk-operations locale ${locale}:`, error);
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
        if (this.app.elements.bulkEnableBtn) {
            this.app.elements.bulkEnableBtn.addEventListener('click', () => {
                this.bulkEnable();
            });
        }
        
        if (this.app.elements.bulkDisableBtn) {
            this.app.elements.bulkDisableBtn.addEventListener('click', () => {
                this.bulkDisable();
            });
        }
        
        if (this.app.elements.bulkDeleteBtn) {
            this.app.elements.bulkDeleteBtn.addEventListener('click', () => {
                this.bulkDelete();
            });
        }
        
        if (this.app.elements.bulkClearSelectionBtn) {
            this.app.elements.bulkClearSelectionBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }
        
        if (this.app.elements.bulkSelectEnabledBtn) {
            this.app.elements.bulkSelectEnabledBtn.addEventListener('click', () => {
                this.bulkSelectEnabled();
            });
        }
        
        if (this.app.elements.bulkSelectDisabledBtn) {
            this.app.elements.bulkSelectDisabledBtn.addEventListener('click', () => {
                this.bulkSelectDisabled();
            });
        }
    }
    
    bulkSelectEnabled() {
        this.app.selectedModNames.clear();
        this.app.selectedModName = '';
        this.app.lastSelectedModIndex = -1;
        
        this.app.modEntries.forEach(modEntry => {
            if (modEntry.enabled) {
                this.app.selectedModNames.add(modEntry.name);
            }
        });
        
        if (this.app.modListComponent) {
            this.app.modListComponent.updateModListSelection();
        }
        
        this.updatePanel();
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
    }
    
    bulkSelectDisabled() {
        this.app.selectedModNames.clear();
        this.app.selectedModName = '';
        this.app.lastSelectedModIndex = -1;
        
        this.app.modEntries.forEach(modEntry => {
            if (!modEntry.enabled) {
                this.app.selectedModNames.add(modEntry.name);
            }
        });
        
        if (this.app.modListComponent) {
            this.app.modListComponent.updateModListSelection();
        }
        
        this.updatePanel();
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
    }
    
    bulkEnable() {
        const selected = Array.from(this.app.selectedModNames);
        if (selected.length === 0) {
            return;
        }
        
        selected.forEach(modName => {
            const modEntry = this.app.modEntries.find(m => m.name === modName);
            if (modEntry) {
                modEntry.enabled = true;
                if (modEntry.checkbox) {
                    modEntry.checkbox.checked = true;
                }
                if (modEntry.statusElement) {
                    modEntry.statusElement.textContent = '✓';
                    modEntry.statusElement.className = 'mod-status enabled';
                }
            }
        });
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
        if (this.app.setStatus) {
            this.app.setStatus(this.app.t('status.modsEnabled', { count: selected.length }));
        }
    }
    
    bulkDisable() {
        const selected = Array.from(this.app.selectedModNames);
        if (selected.length === 0) {
            return;
        }
        
        selected.forEach(modName => {
            const modEntry = this.app.modEntries.find(m => m.name === modName);
            if (modEntry) {
                modEntry.enabled = false;
                if (modEntry.checkbox) {
                    modEntry.checkbox.checked = false;
                }
                if (modEntry.statusElement) {
                    modEntry.statusElement.textContent = '✗';
                    modEntry.statusElement.className = 'mod-status disabled';
                }
            }
        });
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
        if (this.app.setStatus) {
            this.app.setStatus(this.app.t('status.modsDisabled', { count: selected.length }));
        }
    }
    
    async bulkDelete() {
        const selected = Array.from(this.app.selectedModNames);
        if (selected.length === 0) {
            return;
        }
        
        const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.deleteModsConfirm', { count: selected.length }));
        if (!confirmed) {
            return;
        }
        
        selected.forEach(modName => {
            const modIndex = this.app.modEntries.findIndex(m => m.name === modName);
            if (modIndex !== -1) {
                this.app.modEntries.splice(modIndex, 1);
            }
        });
        
        if (this.app.modListComponent) {
            this.app.modListComponent.modEntries = this.app.modEntries;
            this.app.modListComponent.clearSelection();
            this.app.modListComponent.updateModList();
        }
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
        if (this.app.setStatus) {
            this.app.setStatus(this.app.t('status.modsDeleted', { count: selected.length }));
        }
    }
    
    clearSelection() {
        if (this.app.modListComponent) {
            this.app.modListComponent.clearSelection();
        }
        this.updatePanel();
    }
    
    updatePanel() {
        if (!this.app.elements.bulkActionsPanel) {
            return;
        }
        
        const count = this.app.selectedModNames.size;
        const hasSelection = count >= 1;
        
        if (this.app.elements.bulkSelectionCount) {
            if (count === 0) {
                this.app.elements.bulkSelectionCount.textContent = this.t('ui.noModsSelected');
            } else {
                let modText;
                if (count === 1) {
                    modText = this.t('ui.modSelected');
                } else if (count < 5) {
                    modText = this.t('ui.modsSelected');
                } else {
                    modText = this.t('ui.modsSelectedMany');
                }
                this.app.elements.bulkSelectionCount.textContent = `${count} ${modText}`;
            }
        }
        
        if (this.app.elements.bulkEnableBtn) {
            this.app.elements.bulkEnableBtn.disabled = !hasSelection;
        }
        if (this.app.elements.bulkDisableBtn) {
            this.app.elements.bulkDisableBtn.disabled = !hasSelection;
        }
        if (this.app.elements.bulkDeleteBtn) {
            this.app.elements.bulkDeleteBtn.disabled = !hasSelection;
        }
        if (this.app.elements.bulkClearSelectionBtn) {
            this.app.elements.bulkClearSelectionBtn.disabled = !hasSelection;
        }
        
        if (hasSelection) {
            this.app.elements.bulkActionsPanel.classList.remove('disabled');
        } else {
            this.app.elements.bulkActionsPanel.classList.add('disabled');
        }
    }
    
    updateLocalization() {
        const actionsLabel = document.querySelector('#bulk-actions-panel .section-label');
        if (actionsLabel) {
            actionsLabel.textContent = this.t('ui.actions');
        }
        
        if (this.app.elements.bulkEnableBtn) {
            this.app.elements.bulkEnableBtn.title = this.t('ui.enableSelected');
        }
        
        if (this.app.elements.bulkDisableBtn) {
            this.app.elements.bulkDisableBtn.title = this.t('ui.disableSelected');
        }
        
        if (this.app.elements.bulkDeleteBtn) {
            this.app.elements.bulkDeleteBtn.title = this.t('ui.deleteSelected');
        }
        
        if (this.app.elements.bulkClearSelectionBtn) {
            this.app.elements.bulkClearSelectionBtn.title = this.t('ui.clearSelection');
        }
        
        if (this.app.elements.bulkSelectEnabledBtn) {
            this.app.elements.bulkSelectEnabledBtn.title = this.t('ui.selectEnabled');
        }
        
        if (this.app.elements.bulkSelectDisabledBtn) {
            this.app.elements.bulkSelectDisabledBtn.title = this.t('ui.selectDisabled');
        }
    }
}
