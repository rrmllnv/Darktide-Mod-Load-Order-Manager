import { Sorter } from '../utils/Sorter.js';
import { DragDropManager } from './DragDropManager.js';

export class ModListRenderer {
    constructor(elements, modEntries, callbacks, app = null) {
        this.elements = elements;
        this._modEntries = Array.isArray(modEntries) ? modEntries : [];
        this.callbacks = callbacks;
        this.app = app;
        this.filteredModEntries = [];
        this.dragDropManager = new DragDropManager(
            this._modEntries,
            elements.modsList,
            callbacks.onDrop
        );
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
    
    updateModList(filterText = null, hideNewMods = false, hideUnusedMods = false, hideNotFoundMods = false, selectedModName = '', selectedModNames = null) {
        if (!selectedModNames || !(selectedModNames instanceof Set)) {
            selectedModNames = new Set();
        }
        
        if (!Array.isArray(this._modEntries)) {
            console.error('_modEntries is not an array:', this._modEntries);
            this._modEntries = [];
        }
        
        this.elements.modsList.innerHTML = '';
        
        if (filterText === null) {
            filterText = this.elements.searchInput.value;
        }
        
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
        
        const currentSort = this.elements.sortSelect.value;
        this.filteredModEntries = Sorter.sortMods(filtered, currentSort);
        
        if (!this.elements.modsList) {
            console.error('modsList element not found');
            return;
        }
        
        this.filteredModEntries.forEach((modEntry, index) => {
            if (!modEntry || !modEntry.name) {
                console.warn('Invalid modEntry at index', index, modEntry);
                return;
            }
            const isSelected = selectedModNames.has(modEntry.name) || modEntry.name === selectedModName;
            const modItem = this.createModItem(modEntry, selectedModName, currentSort, index, isSelected);
            if (modItem) {
                this.elements.modsList.appendChild(modItem);
            }
        });
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
            if (this.callbacks.onCheckboxChange) {
                this.callbacks.onCheckboxChange(modEntry.name);
            }
        });
        
        const modName = document.createElement('span');
        modName.className = 'mod-name';
        modName.textContent = modEntry.name;
        
        let newLabel = null;
        if (modEntry.isNew) {
            newLabel = document.createElement('span');
            newLabel.className = 'mod-new-label';
            if (this.app && this.app.t) {
                newLabel.textContent = this.app.t('ui.flagNew');
            } else {
                newLabel.textContent = '[NEW]';
            }
        }
        
        let notFoundLabel = null;
        if (modEntry.isNotFound) {
            notFoundLabel = document.createElement('span');
            notFoundLabel.className = 'mod-not-found-label';
            if (this.app && this.app.t) {
                notFoundLabel.textContent = this.app.t('ui.flagNotFound');
            } else {
                notFoundLabel.textContent = '[NOT FOUND]';
            }
        }
        
        let symlinkLabel = null;
        if (modEntry.isSymlink) {
            symlinkLabel = document.createElement('span');
            symlinkLabel.className = 'mod-symlink-label';
            if (this.app && this.app.t) {
                symlinkLabel.textContent = this.app.t('ui.flagSymlink');
            } else {
                symlinkLabel.textContent = '[SYMLINK]';
            }
        }
        
        const status = document.createElement('span');
        status.className = `mod-status ${modEntry.enabled ? 'enabled' : 'disabled'}`;
        status.textContent = modEntry.enabled ? '✓' : '✗';
        
        modItem.addEventListener('click', (e) => {
            if (e.target !== checkbox && !modItem.classList.contains('dragging')) {
                if (this.callbacks.onModSelect) {
                    const ctrlKey = e.ctrlKey || e.metaKey;
                    const shiftKey = e.shiftKey;
                    this.callbacks.onModSelect(modEntry.name, ctrlKey, shiftKey);
                }
            }
        });
        
        modItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.callbacks.onModContextMenu) {
                this.callbacks.onModContextMenu(modEntry.name, e.clientX, e.clientY);
            }
        });
        
        this.dragDropManager.attachDragDrop(modItem, modEntry, index, currentSort);
        
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
}
