// Менеджер UI компонентов
export class UIManager {
    constructor(app) {
        this.app = app;
    }
    
    // Показ сообщения в модальном окне вместо alert
    showMessage(title, message) {
        return new Promise((resolve) => {
            // Восстанавливаем кнопку OK на случай, если она была заменена
            const footer = this.app.elements.messageDialog.querySelector('.modal-footer');
            if (!footer.querySelector('#message-ok-btn')) {
                const saveText = this.app.t('ui.save');
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${saveText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
            } else {
                // Обновляем ссылку на кнопку, если она уже есть
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                // Обновляем текст кнопки на случай изменения языка
                if (this.app.elements.messageOkBtn) {
                    this.app.elements.messageOkBtn.textContent = this.app.t('ui.save');
                }
            }
            
            this.app.elements.messageTitle.textContent = title || this.app.t('ui.message');
            this.app.elements.messageText.textContent = message;
            this.app.elements.messageDialog.classList.add('show');
            
            // Удаляем старые обработчики, если есть
            const newOkBtn = this.app.elements.messageOkBtn.cloneNode(true);
            this.app.elements.messageOkBtn.parentNode.replaceChild(newOkBtn, this.app.elements.messageOkBtn);
            this.app.elements.messageOkBtn = newOkBtn;
            
            const handleOk = () => {
                this.app.elements.messageDialog.classList.remove('show');
                this.app.elements.messageOkBtn.removeEventListener('click', handleOk);
                resolve();
            };
            
            this.app.elements.messageOkBtn.addEventListener('click', handleOk);
        });
    }
    
    // Показ подтверждения в модальном окне вместо confirm
    showConfirm(message) {
        return new Promise((resolve) => {
            this.app.elements.messageTitle.textContent = this.app.t('ui.confirmation');
            this.app.elements.messageText.textContent = message;
            
            // Заменяем кнопку OK на две кнопки Да/Нет
            const footer = this.app.elements.messageDialog.querySelector('.modal-footer');
            footer.innerHTML = `
                <button id="confirm-yes-btn" class="btn btn-primary">${this.app.t('ui.yes')}</button>
                <button id="confirm-no-btn" class="btn">${this.app.t('ui.no')}</button>
            `;
            
            this.app.elements.messageDialog.classList.add('show');
            
            const yesBtn = document.getElementById('confirm-yes-btn');
            const noBtn = document.getElementById('confirm-no-btn');
            
            const handleYes = () => {
                this.app.elements.messageDialog.classList.remove('show');
                // Восстанавливаем кнопку OK
                const saveText = this.app.t('ui.save');
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${saveText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
                resolve(true);
            };
            
            const handleNo = () => {
                this.app.elements.messageDialog.classList.remove('show');
                // Восстанавливаем кнопку OK
                const saveText = this.app.t('ui.save');
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${saveText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
                resolve(false);
            };
            
            yesBtn.addEventListener('click', handleYes);
            noBtn.addEventListener('click', handleNo);
        });
    }
    
    // Обновление панели массовых действий
    updateBulkActionsPanel() {
        if (!this.app.elements.bulkActionsPanel) {
            return;
        }
        
        const count = this.app.selectedModNames.size;
        const hasSelection = count >= 1;
        
        // Обновляем текст счетчика
        if (this.app.elements.bulkSelectionCount) {
            if (count === 0) {
                this.app.elements.bulkSelectionCount.textContent = this.app.t('ui.noModsSelected');
            } else {
                let modText;
                if (count === 1) {
                    modText = this.app.t('ui.modSelected');
                } else if (count < 5) {
                    modText = this.app.t('ui.modsSelected');
                } else {
                    modText = this.app.t('ui.modsSelectedMany');
                }
                this.app.elements.bulkSelectionCount.textContent = `${count} ${modText}`;
            }
        }
        
        // Делаем кнопки активными/неактивными в зависимости от выбора
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
        
        // Добавляем/убираем класс для визуального отображения неактивного состояния
        if (hasSelection) {
            this.app.elements.bulkActionsPanel.classList.remove('disabled');
        } else {
            this.app.elements.bulkActionsPanel.classList.add('disabled');
        }
    }
}
