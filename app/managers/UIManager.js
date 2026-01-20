export class UIManager {
    constructor(app) {
        this.app = app;
    }
    
    showMessage(title, message) {
        return new Promise((resolve) => {
            const isError = title === this.app.t('messages.common.error') || 
                           title === 'Error' ||
                           title?.toLowerCase().includes('error');
            
            const isSuccess = title === this.app.t('messages.common.success') || 
                             title === 'Success' ||
                             title?.toLowerCase().includes('success');
            
            const isInfo = title === this.app.t('messages.common.info') || 
                          title === 'Info' ||
                          title?.toLowerCase().includes('info');
            
            const buttonText = this.app.t('ui.common.close');
            
            const body = this.app.elements.messageDialog.querySelector('.modal-body');
            const footer = this.app.elements.messageDialog.querySelector('.modal-footer');
            
            if (body) {
                body.innerHTML = '<div id="message-text" class="message-text"></div>';
            }
            
            const messageTextElement = document.getElementById('message-text');
            if (messageTextElement) {
                this.app.elements.messageText = messageTextElement;
            }
            
            if (!footer.querySelector('#message-ok-btn')) {
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${buttonText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
            } else {
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                if (this.app.elements.messageOkBtn) {
                    this.app.elements.messageOkBtn.textContent = buttonText;
                }
            }
            
            this.app.elements.messageTitle.textContent = title || this.app.t('ui.common.message');
            if (this.app.elements.messageText) {
                this.app.elements.messageText.textContent = message;
            } else if (messageTextElement) {
                messageTextElement.textContent = message;
            }
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
            this.app.elements.messageTitle.textContent = this.app.t('ui.common.confirmation');
            this.app.elements.messageText.textContent = message;
            
            const footer = this.app.elements.messageDialog.querySelector('.modal-footer');
            footer.innerHTML = `
                <button id="confirm-yes-btn" class="btn btn-primary">${this.app.t('ui.common.yes')}</button>
                <button id="confirm-no-btn" class="btn">${this.app.t('ui.common.no')}</button>
            `;
            
            this.app.elements.messageDialog.classList.add('show');
            
            const yesBtn = document.getElementById('confirm-yes-btn');
            const noBtn = document.getElementById('confirm-no-btn');
            
            const handleYes = () => {
                this.app.elements.messageDialog.classList.remove('show');
                const saveText = this.app.t('ui.common.save');
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${saveText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
                resolve(true);
            };
            
            const handleNo = () => {
                this.app.elements.messageDialog.classList.remove('show');
                const saveText = this.app.t('ui.common.save');
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
    
    showConfirmWithCheckboxes(message, checkboxes) {
        return new Promise((resolve) => {
            this.app.elements.messageTitle.textContent = this.app.t('ui.common.confirmation');
            
            const body = this.app.elements.messageDialog.querySelector('.modal-body');
            const footer = this.app.elements.messageDialog.querySelector('.modal-footer');
            
            let messageHtml = `<div class="message-text">${message}</div>`;
            messageHtml += '<div class="confirm-checkboxes">';
            
            const checkboxStates = {};
            checkboxes.forEach((checkbox, index) => {
                const checkboxId = `confirm-checkbox-${index}`;
                checkboxStates[checkboxId] = { key: checkbox.key, checked: false };
                messageHtml += `
                    <label class="confirm-checkbox-label">
                        <input type="checkbox" id="${checkboxId}" class="confirm-checkbox">
                        <span>${checkbox.label}</span>
                    </label>
                `;
            });
            
            messageHtml += '</div>';
            body.innerHTML = messageHtml;
            
            footer.innerHTML = `
                <button id="confirm-yes-btn" class="btn btn-primary">${this.app.t('ui.common.delete')}</button>
                <button id="confirm-no-btn" class="btn">${this.app.t('ui.common.cancel')}</button>
            `;
            
            this.app.elements.messageDialog.classList.add('show');
            
            const yesBtn = document.getElementById('confirm-yes-btn');
            const noBtn = document.getElementById('confirm-no-btn');
            
            const handleYes = () => {
                const result = {};
                checkboxes.forEach((checkbox, index) => {
                    const checkboxId = `confirm-checkbox-${index}`;
                    const checkboxElement = document.getElementById(checkboxId);
                    result[checkbox.key] = checkboxElement ? checkboxElement.checked : false;
                });
                
                this.app.elements.messageDialog.classList.remove('show');
                body.innerHTML = '<div id="message-text" class="message-text"></div>';
                const saveText = this.app.t('ui.common.save');
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${saveText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
                resolve(result);
            };
            
            const handleNo = () => {
                this.app.elements.messageDialog.classList.remove('show');
                body.innerHTML = '<div id="message-text" class="message-text"></div>';
                const saveText = this.app.t('ui.common.save');
                footer.innerHTML = `<button id="message-ok-btn" class="btn btn-primary">${saveText}</button>`;
                this.app.elements.messageOkBtn = document.getElementById('message-ok-btn');
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
                resolve(null);
            };
            
            yesBtn.addEventListener('click', handleYes);
            noBtn.addEventListener('click', handleNo);
        });
    }
    
    showLanguageSelection() {
        return new Promise((resolve) => {
            const dialog = document.getElementById('language-selection-dialog');
            const title = document.getElementById('language-selection-title');
            const text = document.getElementById('language-selection-text');
            const select = document.getElementById('language-selection-select');
            const okBtn = document.getElementById('language-selection-ok-btn');
            
            if (!dialog || !title || !text || !select || !okBtn) {
                resolve('en');
                return;
            }
            
            const detectSystemLanguage = () => {
                const systemLang = navigator.language || navigator.userLanguage || 'en';
                const langMap = {
                    'en': 'en',
                    'ru': 'ru',
                    'de': 'de',
                    'fr': 'fr',
                    'it': 'it',
                    'pt': 'pt',
                    'ko': 'ko',
                    'zh': 'zh',
                    'zh-CN': 'zh',
                    'zh-TW': 'zh',
                    'ja': 'ja'
                };
                
                const langCode = systemLang.split('-')[0].toLowerCase();
                return langMap[langCode] || langMap[systemLang] || 'en';
            };
            
            const detectedLang = detectSystemLanguage();
            select.value = detectedLang;
            
            title.textContent = 'Select Language';
            text.textContent = 'Please select your preferred language:';
            okBtn.textContent = 'Continue';
            
            dialog.classList.add('show');
            
            const handleOk = () => {
                const selectedLocale = select.value || 'en';
                dialog.classList.remove('show');
                okBtn.removeEventListener('click', handleOk);
                resolve(selectedLocale);
            };
            
            okBtn.addEventListener('click', handleOk);
            
            select.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOk();
                }
            });
        });
    }
}
