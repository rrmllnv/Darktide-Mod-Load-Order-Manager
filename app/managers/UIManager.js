export class UIManager {
    constructor(app) {
        this.app = app;
    }
    
    showMessage(title, message) {
        return new Promise((resolve) => {
            const isError = title === this.app.t('messages.error') || 
                           title === 'Error' ||
                           title?.toLowerCase().includes('error');
            
            const isSuccess = title === this.app.t('messages.success') || 
                             title === 'Success' ||
                             title?.toLowerCase().includes('success');
            
            const isInfo = title === this.app.t('messages.info') || 
                          title === 'Info' ||
                          title?.toLowerCase().includes('info');
            
            const buttonText = this.app.t('ui.close');
            
            const footer = this.app.elements.messageDialog.querySelector('.modal-footer');
            if (!footer.querySelector('#message-ok-btn')) {
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${buttonText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
            } else {
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                if (this.app.elements.messageOkBtn) {
                    this.app.elements.messageOkBtn.textContent = buttonText;
                }
            }
            
            this.app.elements.messageTitle.textContent = title || this.app.t('ui.message');
            this.app.elements.messageText.textContent = message;
            this.app.elements.messageDialog.classList.add('show');
            
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
    
    showConfirm(message) {
        return new Promise((resolve) => {
            this.app.elements.messageTitle.textContent = this.app.t('ui.confirmation');
            this.app.elements.messageText.textContent = message;
            
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
                const saveText = this.app.t('ui.save');
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${saveText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
                resolve(true);
            };
            
            const handleNo = () => {
                this.app.elements.messageDialog.classList.remove('show');
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
    
    updateBulkActionsPanel() {
        if (!this.app.elements.bulkActionsPanel) {
            return;
        }
        
        const count = this.app.selectedModNames.size;
        const hasSelection = count >= 1;
        
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
}
