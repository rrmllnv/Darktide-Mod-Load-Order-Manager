export class TodosComponent {
    constructor(app) {
        this.app = app;
        this.todosDir = null;
        this.todos = [];
        this.currentModName = null;
        this.showOnlyActive = false;
        this.editingTodoId = null;
        this.expandedTodos = new Set();
    }
    
    async init() {
        await this.initTodosDirectory();
        this.loadState();
        this.bindEvents();
        await this.loadTodos();
        this.updateLocalization();
    }
    
    loadState() {
        if (this.app.userConfig && this.app.userConfig.todosShowOnlyActive !== undefined) {
            this.showOnlyActive = this.app.userConfig.todosShowOnlyActive;
            const todosFilterActive = document.getElementById('todos-filter-active');
            if (todosFilterActive) {
                todosFilterActive.checked = this.showOnlyActive;
            }
        }
    }
    
    updateLocalization() {
        const todosLabel = document.querySelector('.todos-frame .section-label');
        if (todosLabel) {
            todosLabel.textContent = this.t('ui.todos.todos');
        }
        
        const filterLabel = document.querySelector('#todos-filter-active')?.parentElement?.querySelector('span');
        if (filterLabel) {
            filterLabel.textContent = this.t('ui.todos.showOnlyActive');
        }

        const todosInput = document.getElementById('todos-input');
        if (todosInput) {
            todosInput.placeholder = this.t('ui.todos.addNewTodo');
        }
        
        this.updateSortLabel();
    }
    
    updateSortLabel() {
        const sortLabel = document.getElementById('todos-sort-label');
        if (!sortLabel) {
            return;
        }
        
        const modName = this.app.selectedModName || '';
        if (modName) {
            sortLabel.textContent = this.t('ui.todos.customOrder');
        } else {
            sortLabel.textContent = this.t('ui.todos.recentFirst');
        }
    }
    
    t(key, params = {}) {
        if (this.app.localeManager) {
            return this.app.localeManager.t(key, params);
        }
        return this.app.t(key, params);
    }
    
    async initTodosDirectory() {
        try {
            const result = await window.electronAPI.getTodosDirectory();
            if (result.success) {
                this.todosDir = result.path;
            }
        } catch (error) {
            console.error('Error initializing todos directory:', error);
        }
    }
    
    bindEvents() {
        const todosInput = document.getElementById('todos-input');
        if (todosInput) {
            this.setupAutoResize(todosInput);
            todosInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.addTodo();
                }
            });
        }
        
        const todosFilterActive = document.getElementById('todos-filter-active');
        if (todosFilterActive) {
            todosFilterActive.addEventListener('change', () => {
                this.showOnlyActive = todosFilterActive.checked;
                if (this.app.todosShowOnlyActive !== undefined) {
                    this.app.todosShowOnlyActive = this.showOnlyActive;
                } else {
                    this.app.todosShowOnlyActive = this.showOnlyActive;
                }
                if (this.app.configManager) {
                    this.app.configManager.saveUserConfig();
                }
                this.renderTodos();
            });
        }
        
        const todosList = document.getElementById('todos-list');
        if (todosList) {
            todosList.addEventListener('click', (e) => {
                const todoItem = e.target.closest('.todo-item');
                if (!todoItem) {
                    return;
                }
                
                if (e.target.closest('.todo-checkbox') || e.target.closest('.todo-actions')) {
                    return;
                }
                
                const todoId = todoItem.getAttribute('data-todo-id');
                if (!todoId) {
                    return;
                }
                
                const todo = this.todos.find(t => t.id === todoId);
                if (!todo) {
                    return;
                }
                
                const todoText = todoItem.querySelector('.todo-text');
                if (!todoText) {
                    return;
                }
                
                e.stopPropagation();
                
                const isActive = todoText.classList.contains('active');
                if (isActive) {
                    todoText.classList.remove('active');
                } else {
                    const allActiveTexts = todosList.querySelectorAll('.todo-text.active');
                    allActiveTexts.forEach(text => text.classList.remove('active'));
                    todoText.classList.add('active');
                }
                
                const lineHeight = parseFloat(getComputedStyle(todoText).lineHeight) || 14;
                const maxHeight = lineHeight * 3;
                const needsCollapse = todoText.scrollHeight > maxHeight;
                
                if (needsCollapse) {
                    const wasCollapsed = todoText.classList.contains('todo-text-collapsed');
                    
                    if (wasCollapsed) {
                        this.collapseAllTodos();
                        this.expandedTodos.add(todo.id);
                        todoText.classList.remove('todo-text-collapsed');
                    } else {
                        this.expandedTodos.delete(todo.id);
                        todoText.classList.add('todo-text-collapsed');
                    }
                }
            });
            
            todosList.addEventListener('dblclick', (e) => {
                const todoText = e.target.closest('.todo-text');
                if (!todoText) {
                    return;
                }
                
                const todoItem = todoText.closest('.todo-item');
                if (!todoItem) {
                    return;
                }
                
                const todoId = todoItem.getAttribute('data-todo-id');
                if (!todoId) {
                    return;
                }
                
                e.stopPropagation();
                this.startEditing(todoId);
            });
        }
    }
    
    async loadTodos() {
        if (!this.todosDir) {
            await this.initTodosDirectory();
        }
        
        if (!this.todosDir) {
            return;
        }
        
        const modName = this.app.selectedModName || '';
        
        this.updateSortLabel();
        
        if (modName) {
            this.currentModName = modName;
            try {
                const result = await window.electronAPI.loadTodos(this.todosDir, modName);
                if (result.success) {
                    this.todos = (result.todos || []).map(todo => ({
                        ...todo,
                        modName: todo.modName || modName
                    }));
                } else {
                    this.todos = [];
                }
            } catch (error) {
                console.error('Error loading todos:', error);
                this.todos = [];
            }
        } else {
            this.currentModName = null;
            try {
                const result = await window.electronAPI.loadAllTodos(this.todosDir);
                if (result.success) {
                    const allTodos = result.allTodos || [];
                    const todosByMod = {};
                    
                    allTodos.forEach(todo => {
                        const modName = todo.modName || '';
                        if (!todosByMod[modName]) {
                            todosByMod[modName] = [];
                        }
                        todosByMod[modName].push(todo);
                    });
                    
                    Object.keys(todosByMod).forEach(modName => {
                        todosByMod[modName].sort((a, b) => {
                            const dateA = new Date(a.created || 0);
                            const dateB = new Date(b.created || 0);
                            return dateB - dateA;
                        });
                    });
                    
                    const sortedMods = Object.keys(todosByMod).sort((a, b) => {
                        const todosA = todosByMod[a];
                        const todosB = todosByMod[b];
                        const dateA = todosA.length > 0 ? new Date(todosA[0].created || 0) : 0;
                        const dateB = todosB.length > 0 ? new Date(todosB[0].created || 0) : 0;
                        return dateB - dateA;
                    });
                    
                    this.todos = [];
                    for (const modName of sortedMods) {
                        this.todos.push(...todosByMod[modName]);
                        if (this.todos.length >= 10) {
                            this.todos = this.todos.slice(0, 10);
                            break;
                        }
                    }
                } else {
                    this.todos = [];
                }
            } catch (error) {
                console.error('Error loading all todos:', error);
                this.todos = [];
            }
        }
        
        this.renderTodos();
    }
    
    setupAutoResize(textarea) {
        if (!textarea) {
            return;
        }
        
        const adjustHeight = () => {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            if (scrollHeight > 0) {
                textarea.style.height = scrollHeight + 'px';
            }
        };
        
        textarea.addEventListener('input', adjustHeight);
        
        requestAnimationFrame(() => {
            adjustHeight();
        });
    }
    
    async addTodo() {
        const todosInput = document.getElementById('todos-input');
        if (!todosInput) {
            return;
        }
        
        const text = todosInput.value.trim();
        if (!text) {
            todosInput.style.height = 'auto';
            return;
        }
        
        if (!this.todosDir) {
            await this.initTodosDirectory();
        }
        
        if (!this.todosDir) {
            return;
        }
        
        const modName = this.app.selectedModName || '';
        
        if (!modName) {
            await this.app.uiManager.showMessage(
                this.t('messages.common.error'),
                this.t('ui.todos.pleaseSelectMod')
            );
            return;
        }
        
        const newTodo = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            created: new Date().toISOString(),
            modName: modName
        };
        
        try {
            const result = await window.electronAPI.addTodo(this.todosDir, modName, newTodo);
            if (result.success) {
                todosInput.value = '';
                todosInput.style.height = 'auto';
                await this.loadTodos();
            } else {
                await this.app.uiManager.showMessage(
                    this.t('messages.common.error'),
                    this.t('messages.todos.failedToAddTodo', { error: result.error })
                );
            }
        } catch (error) {
            await this.app.uiManager.showMessage(
                this.t('messages.common.error'),
                this.t('messages.todos.failedToAddTodo', { error: error.message })
            );
        }
    }
    
    async toggleTodo(todoId) {
        if (!this.todosDir) {
            await this.initTodosDirectory();
        }
        
        if (!this.todosDir) {
            return;
        }
        
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) {
            return;
        }
        
        const modName = todo.modName || this.app.selectedModName || '';
        
        if (!modName) {
            return;
        }
        
        const newCompletedState = !todo.completed;
        todo.completed = newCompletedState;
        
        const todoItem = document.querySelector(`[data-todo-id="${todoId}"]`);
        if (todoItem) {
            const checkbox = todoItem.querySelector('.todo-checkbox');
            const todoText = todoItem.querySelector('.todo-text');
            
            if (checkbox) {
                checkbox.innerHTML = newCompletedState ? '<i class="fas fa-check"></i>' : '';
            }
            
            if (todoText) {
                if (newCompletedState) {
                    todoItem.classList.add('completed');
                } else {
                    todoItem.classList.remove('completed');
                }
            }
        }
        
        try {
            const result = await window.electronAPI.updateTodo(this.todosDir, modName, todoId, todo);
            if (!result.success) {
                todo.completed = !newCompletedState;
                
                if (todoItem) {
                    const checkbox = todoItem.querySelector('.todo-checkbox');
                    const todoText = todoItem.querySelector('.todo-text');
                    
                    if (checkbox) {
                        checkbox.innerHTML = !newCompletedState ? '<i class="fas fa-check"></i>' : '';
                    }
                    
                    if (todoText) {
                        if (!newCompletedState) {
                            todoItem.classList.add('completed');
                        } else {
                            todoItem.classList.remove('completed');
                        }
                    }
                }
                
                await this.app.uiManager.showMessage(
                    this.t('messages.common.error'),
                    this.t('messages.todos.failedToUpdateTodo', { error: result.error })
                );
            }
        } catch (error) {
            todo.completed = !newCompletedState;
            
            if (todoItem) {
                const checkbox = todoItem.querySelector('.todo-checkbox');
                const todoText = todoItem.querySelector('.todo-text');
                
                if (checkbox) {
                    checkbox.innerHTML = !newCompletedState ? '<i class="fas fa-check"></i>' : '';
                }
                
                if (todoText) {
                    if (!newCompletedState) {
                        todoItem.classList.add('completed');
                    } else {
                        todoItem.classList.remove('completed');
                    }
                }
            }
            
            await this.app.uiManager.showMessage(
                this.t('messages.common.error'),
                this.t('messages.todos.failedToUpdateTodo', { error: error.message })
            );
        }
    }
    
    async deleteTodo(todoId) {
        if (!this.todosDir) {
            await this.initTodosDirectory();
        }
        
        if (!this.todosDir) {
            return;
        }
        
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) {
            return;
        }
        
        const modName = todo.modName || this.app.selectedModName || '';
        
        if (!modName) {
            return;
        }
        
        const confirmed = await this.app.uiManager.showConfirm(this.t('messages.todos.confirmDelete'));
        if (!confirmed) {
            return;
        }
        
        try {
            const result = await window.electronAPI.deleteTodo(this.todosDir, modName, todoId);
            if (result.success) {
                await this.loadTodos();
            } else {
                await this.app.uiManager.showMessage(
                    this.t('messages.common.error'),
                    this.t('messages.todos.failedToDeleteTodo', { error: result.error })
                );
            }
        } catch (error) {
            await this.app.uiManager.showMessage(
                this.t('messages.common.error'),
                this.t('messages.todos.failedToDeleteTodo', { error: error.message })
            );
        }
    }
    
    startEditing(todoId) {
        this.editingTodoId = todoId;
        this.renderTodos();
    }
    
    async saveEdit(todoId, newText) {
        if (!newText || !newText.trim()) {
            this.editingTodoId = null;
            this.renderTodos();
            return;
        }
        
        if (!this.todosDir) {
            await this.initTodosDirectory();
        }
        
        if (!this.todosDir) {
            return;
        }
        
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) {
            this.editingTodoId = null;
            this.renderTodos();
            return;
        }
        
        const modName = todo.modName || this.app.selectedModName || '';
        
        if (!modName) {
            this.editingTodoId = null;
            this.renderTodos();
            return;
        }
        
        todo.text = newText.trim();
        
        try {
            const result = await window.electronAPI.updateTodo(this.todosDir, modName, todoId, todo);
            if (result.success) {
                this.editingTodoId = null;
                await this.loadTodos();
            } else {
                await this.app.uiManager.showMessage(
                    this.t('messages.common.error'),
                    this.t('messages.todos.failedToUpdateTodo', { error: result.error })
                );
                this.editingTodoId = null;
                this.renderTodos();
            }
        } catch (error) {
            await this.app.uiManager.showMessage(
                this.t('messages.common.error'),
                this.t('messages.todos.failedToUpdateTodo', { error: error.message })
            );
            this.editingTodoId = null;
            this.renderTodos();
        }
    }
    
    cancelEdit() {
        this.editingTodoId = null;
        this.renderTodos();
    }
    
    collapseAllTodos() {
        const todosList = document.getElementById('todos-list');
        if (!todosList) {
            return;
        }
        
        const allTodoTexts = todosList.querySelectorAll('.todo-text');
        allTodoTexts.forEach(textElement => {
            if (!textElement.classList.contains('todo-text-collapsed')) {
                const todoItem = textElement.closest('.todo-item');
                if (todoItem) {
                    const todoId = todoItem.getAttribute('data-todo-id');
                    if (todoId) {
                        this.expandedTodos.delete(todoId);
                        textElement.classList.add('todo-text-collapsed');
                    }
                }
            }
        });
    }
    
    renderTodos() {
        const todosList = document.getElementById('todos-list');
        if (!todosList) {
            return;
        }
        
        const activeTodoIds = new Set();
        const allActiveTexts = todosList.querySelectorAll('.todo-text.active');
        allActiveTexts.forEach(textElement => {
            const todoItem = textElement.closest('.todo-item');
            if (todoItem) {
                const todoId = todoItem.getAttribute('data-todo-id');
                if (todoId) {
                    activeTodoIds.add(todoId);
                }
            }
        });
        
        todosList.innerHTML = '';
        
        let todosToShow = this.todos;
        
        if (this.showOnlyActive) {
            todosToShow = this.todos.filter(t => !t.completed);
        }
        
        if (todosToShow.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'todos-empty';
            emptyMessage.textContent = this.t('ui.todos.noTodos');
            todosList.appendChild(emptyMessage);
            return;
        }
        
        let lastModName = null;
        const isModSelected = !!this.app.selectedModName;
        
        todosToShow.forEach((todo, index) => {
            const todoModName = todo.modName || '';
            const showModHeader = !isModSelected && todoModName && todoModName !== lastModName;
            
            if (showModHeader) {
                const modHeader = document.createElement('div');
                modHeader.className = 'todo-mod-header';
                modHeader.textContent = todoModName;
                todosList.appendChild(modHeader);
                lastModName = todoModName;
            }
            
                const todoItem = document.createElement('div');
                todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
                todoItem.setAttribute('data-todo-id', todo.id);
                
                const modName = this.app.selectedModName || '';
                if (modName) {
                    todoItem.draggable = true;
                } else {
                    todoItem.draggable = false;
                }
            
            if (this.editingTodoId === todo.id) {
                const editInput = document.createElement('textarea');
                editInput.className = 'todo-edit-input';
                editInput.value = todo.text;
                editInput.rows = 1;
                
                editInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.saveEdit(todo.id, editInput.value);
                    } else if (e.key === 'Escape') {
                        this.cancelEdit();
                    }
                });
                editInput.addEventListener('blur', () => {
                    this.saveEdit(todo.id, editInput.value);
                });
                
                todoItem.appendChild(editInput);
                todosList.appendChild(todoItem);
                
                this.setupAutoResize(editInput);
                
                setTimeout(() => {
                    editInput.focus();
                    editInput.select();
                    
                    requestAnimationFrame(() => {
                        editInput.style.height = 'auto';
                        const scrollHeight = editInput.scrollHeight;
                        if (scrollHeight > 0) {
                            editInput.style.height = scrollHeight + 'px';
                        }
                    });
                }, 0);
            } else {
                const todoCheckbox = document.createElement('div');
                todoCheckbox.className = 'todo-checkbox';
                todoCheckbox.innerHTML = todo.completed ? '<i class="fas fa-check"></i>' : '';
                todoCheckbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleTodo(todo.id);
                });
                
                const todoTextWrapper = document.createElement('div');
                todoTextWrapper.className = 'todo-text-wrapper';
                
                const todoText = document.createElement('div');
                todoText.className = 'todo-text';
                todoText.textContent = todo.text;
                
                const todoActions = document.createElement('div');
                todoActions.className = 'todo-actions';
                
                const todoEdit = document.createElement('div');
                todoEdit.className = 'todo-edit';
                todoEdit.innerHTML = '<i class="fas fa-edit"></i>';
                todoEdit.title = this.t('ui.todos.edit');
                todoEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.startEditing(todo.id);
                });
                
                const todoDelete = document.createElement('div');
                todoDelete.className = 'todo-delete';
                todoDelete.innerHTML = '<i class="fas fa-trash"></i>';
                todoDelete.title = this.t('ui.todos.delete');
                todoDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteTodo(todo.id);
                });
                
                const todoDrag = document.createElement('div');
                todoDrag.className = 'todo-drag';
                todoDrag.innerHTML = '<i class="fas fa-grip-vertical"></i>';
                todoDrag.title = this.t('ui.todos.dragToReorder');
                todoDrag.style.cursor = 'grab';
                
                todoActions.appendChild(todoEdit);
                todoActions.appendChild(todoDelete);
                if (modName) {
                    todoActions.appendChild(todoDrag);
                }
                
                todoTextWrapper.appendChild(todoText);
                todoTextWrapper.appendChild(todoActions);
                
                todoItem.appendChild(todoCheckbox);
                todoItem.appendChild(todoTextWrapper);
                
                todosList.appendChild(todoItem);
                
                if (activeTodoIds.has(todo.id)) {
                    todoText.classList.add('active');
                }
                
                if (modName) {
                    this.attachDragDrop(todoItem, todo, index);
                }
                
                setTimeout(() => {
                    const lineHeight = parseFloat(getComputedStyle(todoText).lineHeight) || 14;
                    const maxHeight = lineHeight * 3;
                    const needsCollapse = todoText.scrollHeight > maxHeight;
                    
                    const isExpanded = this.expandedTodos.has(todo.id);
                    
                    if (needsCollapse && !isExpanded) {
                        todoText.classList.add('todo-text-collapsed');
                    }
                }, 0);
            }
        });
    }
    
    async onModSelectionChanged() {
        this.updateSortLabel();
        await this.loadTodos();
    }
    
    attachDragDrop(todoItem, todo, index) {
        todoItem.addEventListener('dragstart', (e) => {
            todoItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', todo.id);
            e.dataTransfer.setData('todo-index', index.toString());
        });
        
        todoItem.addEventListener('dragend', (e) => {
            todoItem.classList.remove('dragging');
            const todosList = document.getElementById('todos-list');
            if (todosList) {
                todosList.querySelectorAll('.todo-item.drag-over').forEach(item => {
                    item.classList.remove('drag-over');
                });
            }
        });
        
        todoItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const draggingItem = document.querySelector('.todo-item.dragging');
            if (draggingItem && draggingItem !== todoItem) {
                const todosList = document.getElementById('todos-list');
                if (!todosList) {
                    return;
                }
                
                const allItems = Array.from(todosList.querySelectorAll('.todo-item'));
                const draggingIndex = allItems.indexOf(draggingItem);
                const currentIndex = allItems.indexOf(todoItem);
                
                allItems.forEach(item => item.classList.remove('drag-over'));
                
                if (draggingIndex !== currentIndex) {
                    todoItem.classList.add('drag-over');
                }
            }
        });
        
        todoItem.addEventListener('dragleave', (e) => {
            todoItem.classList.remove('drag-over');
        });
        
        todoItem.addEventListener('drop', async (e) => {
            e.preventDefault();
            todoItem.classList.remove('drag-over');
            
            const draggedTodoId = e.dataTransfer.getData('text/plain');
            if (!draggedTodoId || draggedTodoId === todo.id) {
                return;
            }
            
            const todosList = document.getElementById('todos-list');
            if (!todosList) {
                return;
            }
            
            const allItems = Array.from(todosList.querySelectorAll('.todo-item'));
            const draggedItem = allItems.find(item => item.getAttribute('data-todo-id') === draggedTodoId);
            const targetItem = allItems.find(item => item.getAttribute('data-todo-id') === todo.id);
            
            if (!draggedItem || !targetItem) {
                return;
            }
            
            const draggedIndex = allItems.indexOf(draggedItem);
            const targetIndex = allItems.indexOf(targetItem);
            
            if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
                return;
            }
            
            if (draggedIndex < targetIndex) {
                targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
            } else {
                targetItem.parentNode.insertBefore(draggedItem, targetItem);
            }
            
            const domOrder = Array.from(todosList.querySelectorAll('.todo-item'))
                .map(item => item.getAttribute('data-todo-id'))
                .filter(id => id);
            
            const todosMap = new Map(this.todos.map(t => [t.id, t]));
            this.todos = domOrder.map(id => todosMap.get(id)).filter(Boolean);
            
            await this.saveTodosOrder();
        });
    }
    
    async saveTodosOrder() {
        if (!this.todosDir || !this.app.selectedModName) {
            return;
        }
        
        const modName = this.app.selectedModName;
        
        try {
            const todosToSave = this.todos.filter(t => t.modName === modName);
            
            if (todosToSave.length === 0) {
                return;
            }
            
            const saveResult = await window.electronAPI.updateTodosFile(this.todosDir, modName, todosToSave);
            if (!saveResult.success) {
                console.error('Error saving todos order:', saveResult.error);
            }
        } catch (error) {
            console.error('Error saving todos order:', error);
        }
    }
}
