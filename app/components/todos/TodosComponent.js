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
        this.bindEvents();
        await this.loadTodos();
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
                this.renderTodos();
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
        
        if (modName) {
            this.currentModName = modName;
            try {
                const result = await window.electronAPI.loadTodos(this.todosDir, modName);
                if (result.success) {
                    this.todos = (result.todos || []).map(todo => ({
                        ...todo,
                        modName: todo.modName || modName
                    }));
                    
                    this.todos.sort((a, b) => {
                        const dateA = new Date(a.created || 0);
                        const dateB = new Date(b.created || 0);
                        return dateB - dateA;
                    });
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
                this.app.t('messages.common.error'),
                'Please select a mod first'
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
                    this.app.t('messages.common.error'),
                    `Failed to add todo: ${result.error}`
                );
            }
        } catch (error) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.common.error'),
                `Failed to add todo: ${error.message}`
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
                    this.app.t('messages.common.error'),
                    `Failed to update todo: ${result.error}`
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
                this.app.t('messages.common.error'),
                `Failed to update todo: ${error.message}`
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
        
        try {
            const result = await window.electronAPI.deleteTodo(this.todosDir, modName, todoId);
            if (result.success) {
                await this.loadTodos();
            } else {
                await this.app.uiManager.showMessage(
                    this.app.t('messages.common.error'),
                    `Failed to delete todo: ${result.error}`
                );
            }
        } catch (error) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.common.error'),
                `Failed to delete todo: ${error.message}`
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
                    this.app.t('messages.common.error'),
                    `Failed to update todo: ${result.error}`
                );
                this.editingTodoId = null;
                this.renderTodos();
            }
        } catch (error) {
            await this.app.uiManager.showMessage(
                this.app.t('messages.common.error'),
                `Failed to update todo: ${error.message}`
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
        
        todosList.innerHTML = '';
        
        let todosToShow = this.todos;
        
        if (this.showOnlyActive) {
            todosToShow = this.todos.filter(t => !t.completed);
        }
        
        if (todosToShow.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'todos-empty';
            emptyMessage.textContent = 'No todos';
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
                
                const todoText = document.createElement('div');
                todoText.className = 'todo-text';
                todoText.textContent = todo.text;
                
                const todoActions = document.createElement('div');
                todoActions.className = 'todo-actions';
                
                const todoEdit = document.createElement('div');
                todoEdit.className = 'todo-edit';
                todoEdit.innerHTML = '<i class="fas fa-edit"></i>';
                todoEdit.title = 'Edit';
                todoEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.startEditing(todo.id);
                });
                
                const todoDelete = document.createElement('div');
                todoDelete.className = 'todo-delete';
                todoDelete.innerHTML = '<i class="fas fa-trash"></i>';
                todoDelete.title = 'Delete';
                todoDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteTodo(todo.id);
                });
                
                todoActions.appendChild(todoEdit);
                todoActions.appendChild(todoDelete);
                
                todoItem.appendChild(todoCheckbox);
                todoItem.appendChild(todoText);
                todoItem.appendChild(todoActions);
                
                todosList.appendChild(todoItem);
                
                setTimeout(() => {
                    const lineHeight = parseFloat(getComputedStyle(todoText).lineHeight) || 14;
                    const maxHeight = lineHeight * 3;
                    const needsCollapse = todoText.scrollHeight > maxHeight;
                    
                    const isExpanded = this.expandedTodos.has(todo.id);
                    
                    if (needsCollapse && !isExpanded) {
                        todoText.classList.add('todo-text-collapsed');
                    }
                    
                    if (needsCollapse) {
                        todoText.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (e.target === todoText || todoText.contains(e.target)) {
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
                    }
                    
                    todoText.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        this.startEditing(todo.id);
                    });
                }, 0);
            }
        });
    }
    
    async onModSelectionChanged() {
        await this.loadTodos();
    }
}
