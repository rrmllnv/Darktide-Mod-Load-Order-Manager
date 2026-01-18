import { Sorter } from '../../utils/Sorter.js';

class DragDropManager {
    constructor(modEntries, modsListElement, onDropCallback) {
        this.modEntries = modEntries;
        this.modsListElement = modsListElement;
        this.onDropCallback = onDropCallback;
        
        this.setupParentHandlers();
    }
    
    setupParentHandlers() {
        const canvasFrame = this.modsListElement.closest('.canvas-frame');
        if (canvasFrame) {
            canvasFrame.addEventListener('dragover', (e) => {
                if (document.querySelector('.mod-item.dragging')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }
            });
            
            canvasFrame.addEventListener('dragenter', (e) => {
                if (document.querySelector('.mod-item.dragging')) {
                    e.preventDefault();
                }
            });
        }
        
        this.modsListElement.addEventListener('dragover', (e) => {
            if (document.querySelector('.mod-item.dragging')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });
    }
    
    updateModEntries(modEntries) {
        this.modEntries = modEntries;
    }
    
    attachDragDrop(modItem, modEntry, index, currentSort) {
        if (currentSort === 'fileOrder') {
            modItem.draggable = true;
            modItem.setAttribute('data-mod-name', modEntry.name);
            
            modItem.addEventListener('dragstart', (e) => {
                modItem.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', modEntry.name);
                e.dataTransfer.setData('mod-index', index.toString());
            });
            
            modItem.addEventListener('dragend', (e) => {
                modItem.classList.remove('dragging');
                document.querySelectorAll('.mod-item.drag-over').forEach(item => {
                    item.classList.remove('drag-over');
                });
            });
            
            modItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const draggingItem = document.querySelector('.mod-item.dragging');
                if (draggingItem && draggingItem !== modItem) {
                    const allItems = Array.from(this.modsListElement.querySelectorAll('.mod-item'));
                    const draggingIndex = allItems.indexOf(draggingItem);
                    const currentIndex = allItems.indexOf(modItem);
                    
                    allItems.forEach(item => item.classList.remove('drag-over'));
                    
                    if (draggingIndex < currentIndex) {
                        modItem.classList.add('drag-over');
                    } else if (draggingIndex > currentIndex) {
                        modItem.classList.add('drag-over');
                    }
                }
            });
            
            modItem.addEventListener('dragleave', (e) => {
                modItem.classList.remove('drag-over');
            });
            
            modItem.addEventListener('drop', (e) => {
                e.preventDefault();
                modItem.classList.remove('drag-over');
                
                const draggedModName = e.dataTransfer.getData('text/plain');
                if (!draggedModName || draggedModName === modEntry.name) {
                    return;
                }
                
                const draggedMod = this.modEntries.find(m => m.name === draggedModName);
                if (!draggedMod) {
                    return;
                }
                
                const targetMod = modEntry;
                
                const sortedMods = [...this.modEntries].sort((a, b) => a.orderIndex - b.orderIndex);
                const draggedIndex = sortedMods.findIndex(m => m.name === draggedModName);
                const targetIndex = sortedMods.findIndex(m => m.name === targetMod.name);
                
                if (draggedIndex === -1 || targetIndex === -1) {
                    return;
                }
                
                if (draggedIndex < targetIndex) {
                    for (let i = draggedIndex + 1; i <= targetIndex; i++) {
                        sortedMods[i].orderIndex = sortedMods[i].orderIndex - 1;
                    }
                    draggedMod.orderIndex = targetIndex;
                } else {
                    for (let i = targetIndex; i < draggedIndex; i++) {
                        sortedMods[i].orderIndex = sortedMods[i].orderIndex + 1;
                    }
                    draggedMod.orderIndex = targetIndex;
                }
                
                if (this.onDropCallback) {
                    this.onDropCallback();
                }
            });
        } else {
            modItem.draggable = false;
        }
    }
}

export class ModListComponent {
    constructor(app) {
        this.app = app;
        this._modEntries = [];
        this.filteredModEntries = [];
        this.locales = {};
        this.dragDropManager = null;
    }
    
    async init() {
        this.loadStyles();
        await this.loadLocales();
        
        if (this.app.elements && this.app.elements.modsList) {
            this.dragDropManager = new DragDropManager(
                this._modEntries,
                this.app.elements.modsList,
                () => {
                    this.updateModList();
                }
            );
        }
        
        this.bindEvents();
    }
    
    bindEvents() {
        if (this.app.elements.sortSelect) {
            this.app.elements.sortSelect.addEventListener('change', () => {
                this.onSortChange();
            });
        }
        
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
        
        if (this.app.elements.enableAllBtn) {
            this.app.elements.enableAllBtn.addEventListener('click', () => {
                this.enableAll();
            });
        }
        
        if (this.app.elements.disableAllBtn) {
            this.app.elements.disableAllBtn.addEventListener('click', () => {
                this.disableAll();
            });
        }
    }
    
    loadStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'components/mod-list/styles/mod-list.css';
        link.setAttribute('data-mod-list-style', 'mod-list.css');
        
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
            const response = await fetch(`components/mod-list/locales/${locale}.json`);
            if (response.ok) {
                this.locales[locale] = await response.json();
                return this.locales[locale];
            } else {
                if (locale !== 'en') {
                    return await this.loadLocale('en');
                }
            }
        } catch (error) {
            console.warn(`Failed to load mod-list locale ${locale}:`, error);
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
    
    set modEntries(value) {
        this._modEntries = Array.isArray(value) ? value : [];
        if (this.dragDropManager) {
            this.dragDropManager.updateModEntries(this._modEntries);
        }
    }
    
    get modEntries() {
        return this._modEntries;
    }
    
    updateModList(filterText = null) {
        if (filterText === null) {
            filterText = this.app.elements.searchInput ? this.app.elements.searchInput.value : '';
        }
        
        const hideNewMods = this.app.hideNewMods || false;
        const hideUnusedMods = this.app.hideUnusedMods || false;
        const hideNotFoundMods = this.app.hideNotFoundMods || false;
        const selectedModName = this.app.selectedModName || '';
        const selectedModNames = this.app.selectedModNames || new Set();
        
        if (!Array.isArray(this._modEntries)) {
            console.error('_modEntries is not an array:', this._modEntries);
            this._modEntries = [];
        }
        
        if (!this.app.elements || !this.app.elements.modsList) {
            console.error('modsList element not found');
            return;
        }
        
        this.app.elements.modsList.innerHTML = '';
        
        let filtered;
        if (filterText) {
            const filterLower = filterText.toLowerCase();
            filtered = this._modEntries.filter(mod => 
                mod && mod.name && mod.name.toLowerCase().includes(filterLower)
            );
        } else {
            filtered = [...this._modEntries].filter(mod => mod && mod.name);
        }
        
        if (hideNewMods) {
            filtered = filtered.filter(mod => !mod.isNew);
        }
        
        if (hideUnusedMods) {
            filtered = filtered.filter(mod => mod.enabled);
        }
        
        if (hideNotFoundMods) {
            filtered = filtered.filter(mod => !mod.isNotFound);
        }
        
        const currentSort = this.app.elements.sortSelect ? this.app.elements.sortSelect.value : 'fileOrder';
        this.filteredModEntries = Sorter.sortMods(filtered, currentSort);
        
        this.filteredModEntries.forEach((modEntry, index) => {
            if (!modEntry || !modEntry.name) {
                console.warn('Invalid modEntry at index', index, modEntry);
                return;
            }
            const isSelected = selectedModNames.has(modEntry.name) || modEntry.name === selectedModName;
            const modItem = this.createModItem(modEntry, selectedModName, currentSort, index, isSelected);
            if (modItem) {
                this.app.elements.modsList.appendChild(modItem);
            }
        });
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
        
        if (this.app.uiManager && this.app.uiManager.updateBulkActionsPanel) {
            this.app.uiManager.updateBulkActionsPanel();
        }
    }
    
    onSortChange() {
        const searchText = this.app.elements.searchInput ? this.app.elements.searchInput.value : '';
        this.updateModList(searchText);
    }
    
    onSearchChange() {
        const searchText = this.app.elements.searchInput ? this.app.elements.searchInput.value : '';
        this.updateModList(searchText);
    }
    
    clearSearch() {
        if (this.app.elements.searchInput) {
            this.app.elements.searchInput.value = '';
        }
        this.updateModList();
    }
    
    onCheckboxChange(modName) {
        const modEntry = this._modEntries.find(m => m.name === modName);
        if (modEntry && modEntry.statusElement) {
            modEntry.statusElement.textContent = modEntry.enabled ? '✓' : '✗';
            modEntry.statusElement.className = `mod-status ${modEntry.enabled ? 'enabled' : 'disabled'}`;
        }
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
        
        if (this.app.selectedModName === modName) {
            this.selectMod(modName);
        }
    }
    
    selectMod(modName, ctrlKey = false, shiftKey = false) {
        const currentIndex = this.filteredModEntries.findIndex(m => m.name === modName);
        
        if (shiftKey && this.app.lastSelectedModIndex !== -1) {
            const startIndex = Math.min(this.app.lastSelectedModIndex, currentIndex);
            const endIndex = Math.max(this.app.lastSelectedModIndex, currentIndex);
            
            for (let i = startIndex; i <= endIndex; i++) {
                if (this.filteredModEntries[i]) {
                    this.app.selectedModNames.add(this.filteredModEntries[i].name);
                }
            }
        } else if (ctrlKey) {
            if (this.app.selectedModNames.has(modName)) {
                this.app.selectedModNames.delete(modName);
            } else {
                this.app.selectedModNames.add(modName);
            }
        } else {
            this.app.selectedModNames.clear();
            this.app.selectedModNames.add(modName);
            this.app.selectedModName = modName;
        }
        
        if (currentIndex !== -1) {
            this.app.lastSelectedModIndex = currentIndex;
        }
        
        this.updateModListSelection();
        
        if (this.app.selectedModNames.size === 1) {
            const singleMod = Array.from(this.app.selectedModNames)[0];
            this.app.selectedModName = singleMod;
        } else {
            this.app.selectedModName = '';
        }
        
        if (this.app.uiManager && this.app.uiManager.updateBulkActionsPanel) {
            this.app.uiManager.updateBulkActionsPanel();
        }
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
    }
    
    updateModListSelection() {
        this._modEntries.forEach(modEntry => {
            if (modEntry.modItem) {
                if (this.app.selectedModNames.has(modEntry.name)) {
                    modEntry.modItem.classList.add('selected');
                } else {
                    modEntry.modItem.classList.remove('selected');
                }
            }
        });
    }
    
    clearSelection() {
        this.app.selectedModNames.clear();
        this.app.selectedModName = '';
        this.app.lastSelectedModIndex = -1;
        this.updateModListSelection();
        
        if (this.app.uiManager && this.app.uiManager.updateBulkActionsPanel) {
            this.app.uiManager.updateBulkActionsPanel();
        }
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
    }
    
    enableAll() {
        this._modEntries.forEach(modEntry => {
            modEntry.enabled = true;
            if (modEntry.checkbox) {
                modEntry.checkbox.checked = true;
            }
            if (modEntry.statusElement) {
                modEntry.statusElement.textContent = '✓';
                modEntry.statusElement.className = 'mod-status enabled';
            }
        });
        const searchText = this.app.elements.searchInput ? this.app.elements.searchInput.value : '';
        this.updateModList(searchText);
    }
    
    disableAll() {
        this._modEntries.forEach(modEntry => {
            modEntry.enabled = false;
            if (modEntry.checkbox) {
                modEntry.checkbox.checked = false;
            }
            if (modEntry.statusElement) {
                modEntry.statusElement.textContent = '✗';
                modEntry.statusElement.className = 'mod-status disabled';
            }
        });
        const searchText = this.app.elements.searchInput ? this.app.elements.searchInput.value : '';
        this.updateModList(searchText);
    }
    
    createModItem(modEntry, selectedModName, currentSort, index, isSelected = false) {
        const modItem = document.createElement('div');
        modItem.className = 'mod-item';
        if (isSelected) {
            modItem.classList.add('selected');
        }
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = modEntry.enabled;
        checkbox.addEventListener('change', () => {
            modEntry.enabled = checkbox.checked;
            this.onCheckboxChange(modEntry.name);
        });
        
        const modName = document.createElement('span');
        modName.className = 'mod-name';
        modName.textContent = modEntry.name;
        
        let newLabel = null;
        if (modEntry.isNew) {
            newLabel = document.createElement('span');
            newLabel.className = 'mod-new-label';
            newLabel.textContent = this.t('ui.flagNew');
        }
        
        let notFoundLabel = null;
        if (modEntry.isNotFound) {
            notFoundLabel = document.createElement('span');
            notFoundLabel.className = 'mod-not-found-label';
            notFoundLabel.textContent = this.t('ui.flagNotFound');
        }
        
        let symlinkLabel = null;
        if (modEntry.isSymlink) {
            symlinkLabel = document.createElement('span');
            symlinkLabel.className = 'mod-symlink-label';
            symlinkLabel.textContent = this.t('ui.flagSymlink');
        }
        
        const status = document.createElement('span');
        status.className = `mod-status ${modEntry.enabled ? 'enabled' : 'disabled'}`;
        status.textContent = modEntry.enabled ? '✓' : '✗';
        
        modItem.addEventListener('click', (e) => {
            if (e.target !== checkbox && !modItem.classList.contains('dragging')) {
                const ctrlKey = e.ctrlKey || e.metaKey;
                const shiftKey = e.shiftKey;
                this.selectMod(modEntry.name, ctrlKey, shiftKey);
            }
        });
        
        modItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.app.showContextMenu) {
                this.app.showContextMenu(modEntry.name, e.clientX, e.clientY);
            }
        });
        
        if (this.dragDropManager) {
            this.dragDropManager.attachDragDrop(modItem, modEntry, index, currentSort);
        }
        
        modItem.appendChild(checkbox);
        modItem.appendChild(modName);
        
        if (symlinkLabel) {
            modItem.appendChild(symlinkLabel);
        }
        if (notFoundLabel) {
            modItem.appendChild(notFoundLabel);
        }
        if (newLabel) {
            modItem.appendChild(newLabel);
        }
        modItem.appendChild(status);
        
        modEntry.checkbox = checkbox;
        modEntry.statusElement = status;
        modEntry.modItem = modItem;
        
        return modItem;
    }
    
    async scanAndUpdate() {
        const scanResult = await this.app.modScanService.scanModsDirectory(this.app.modEntries, this.app.selectedModName);
        this.app.selectedModName = scanResult.selectedModName;
        
        this.modEntries = this.app.modEntries;
        
        if (scanResult.removed > 0) {
            const currentSelected = Array.from(this.app.selectedModNames);
            currentSelected.forEach(modName => {
                if (!this.app.modEntries.find(m => m.name === modName)) {
                    this.app.selectedModNames.delete(modName);
                }
            });
        }
        
        this.updateModList();
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
        
        let message = '';
        const parts = [];
        
        if (scanResult.added > 0) {
            parts.push(`${this.app.t('messages.scanNewMods')} ${scanResult.added}`);
        }
        if (scanResult.removed > 0) {
            parts.push(`${this.app.t('messages.scanRemovedMods')} ${scanResult.removed}`);
        }
        if (scanResult.deleted > 0) {
            parts.push(`${this.app.t('messages.scanDeletedMods')} ${scanResult.deleted}`);
        }
        if (scanResult.restored > 0) {
            parts.push(`${this.app.t('messages.scanRestoredMods')} ${scanResult.restored}`);
        }
        
        if (parts.length > 0) {
            message = parts.join('\n');
        } else {
            message = this.app.t('messages.scanNoChanges');
        }
        
        if (this.app.uiManager && this.app.uiManager.showMessage) {
            this.app.uiManager.showMessage(this.app.t('messages.info'), message);
        }
    }
    
    async createSymlinkForMod() {
        const modsDir = this.app.filePath.substring(0, this.app.filePath.lastIndexOf('\\'));
        if (!modsDir) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.failedToDetermineModsDir'));
            }
            return;
        }
        
        const result = await window.electronAPI.selectFolder('');
        if (!result.success || result.canceled) {
            return;
        }
        
        const targetPath = result.folderPath;
        
        const targetExists = await window.electronAPI.fileExists(targetPath);
        if (!targetExists) {
            if (this.app.uiManager && this.app.uiManager.showMessage) {
                await this.app.uiManager.showMessage(this.app.t('messages.error'), this.app.t('messages.selectedFolderNotExists'));
            }
            return;
        }
        
        const pathParts = targetPath.split('\\');
        const defaultModName = pathParts[pathParts.length - 1];
        
        if (this.app.modalManager && this.app.modalManager.showModal) {
            this.app.modalManager.showModal(this.app.t('ui.enterModName'), defaultModName, async (modName) => {
                if (!modName || !modName.trim()) {
                    return;
                }
                
                const cleanModName = modName.trim();
                const linkPath = modsDir + '\\' + cleanModName;
                
                if (this.app.uiManager && this.app.uiManager.showConfirm) {
                    const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.createSymlinkConfirm', { targetPath, linkPath, modName: cleanModName }));
                    if (!confirmed) {
                        return;
                    }
                }
                
                try {
                    const symlinkResult = await window.electronAPI.createSymlink(linkPath, targetPath);
                    if (!symlinkResult.success) {
                        if (this.app.uiManager && this.app.uiManager.showMessage) {
                            await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.failedToCreateSymlink')}\n${symlinkResult.error}`);
                        }
                        return;
                    }
                    
                    if (this.app.uiManager && this.app.uiManager.showMessage) {
                        await this.app.uiManager.showMessage('Success', `Symbolic link created successfully!\n\n${linkPath} -> ${targetPath}`);
                    }
                    if (this.app.setStatus) {
                        this.app.setStatus(this.app.t('status.symlinkCreated', { modName: cleanModName }));
                    }
                    
                    await this.scanAndUpdate();
                } catch (error) {
                    if (this.app.uiManager && this.app.uiManager.showMessage) {
                        await this.app.uiManager.showMessage(this.app.t('messages.error'), `${this.app.t('messages.symlinkCreationError')}\n${error.message}`);
                    }
                }
            });
        }
    }
    
    enableMod(modName) {
        const modEntry = this._modEntries.find(m => m.name === modName);
        if (modEntry) {
            modEntry.enabled = true;
            if (modEntry.checkbox) {
                modEntry.checkbox.checked = true;
            }
            if (modEntry.statusElement) {
                modEntry.statusElement.textContent = '✓';
                modEntry.statusElement.className = 'mod-status enabled';
            }
            if (this.app.updateStatistics) {
                this.app.updateStatistics();
            }
        }
    }
    
    disableMod(modName) {
        const modEntry = this._modEntries.find(m => m.name === modName);
        if (modEntry) {
            modEntry.enabled = false;
            if (modEntry.checkbox) {
                modEntry.checkbox.checked = false;
            }
            if (modEntry.statusElement) {
                modEntry.statusElement.textContent = '✗';
                modEntry.statusElement.className = 'mod-status disabled';
            }
            if (this.app.updateStatistics) {
                this.app.updateStatistics();
            }
        }
    }
    
    copyModName(modName) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(modName).then(() => {
                if (this.app.setStatus) {
                    this.app.setStatus(this.app.t('status.modNameCopied', { modName }));
                }
            }).catch(() => {
                const textArea = document.createElement('textarea');
                textArea.value = modName;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    if (this.app.setStatus) {
                        this.app.setStatus(this.app.t('status.modNameCopied', { modName }));
                    }
                } catch (err) {
                    if (this.app.setStatus) {
                        this.app.setStatus(this.app.t('status.copyError'));
                    }
                }
                document.body.removeChild(textArea);
            });
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = modName;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                if (this.app.setStatus) {
                    this.app.setStatus(this.app.t('status.modNameCopied', { modName }));
                }
            } catch (err) {
                if (this.app.setStatus) {
                    this.app.setStatus(this.app.t('status.copyError'));
                }
            }
            document.body.removeChild(textArea);
        }
    }
    
    async deleteMod(modName) {
        if (this.app.uiManager && this.app.uiManager.showConfirm) {
            const confirmed = await this.app.uiManager.showConfirm(this.app.t('messages.deleteModConfirm', { modName }));
            if (!confirmed) {
                return;
            }
        }
        
        const modIndex = this._modEntries.findIndex(m => m.name === modName);
        if (modIndex !== -1) {
            this._modEntries.splice(modIndex, 1);
            this.app.modEntries = this._modEntries;
        }
        
        if (this.app.selectedModNames.has(modName)) {
            this.app.selectedModNames.delete(modName);
        }
        
        if (this.app.selectedModName === modName) {
            this.app.selectedModName = '';
        }
        
        this.modEntries = this._modEntries;
        this.updateModList();
        
        if (this.app.updateStatistics) {
            this.app.updateStatistics();
        }
        
        if (this.app.setStatus) {
            this.app.setStatus(this.app.t('status.modDeleted', { modName }));
        }
    }
}
