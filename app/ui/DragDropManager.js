export class DragDropManager {
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
