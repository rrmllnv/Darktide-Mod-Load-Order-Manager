export class ModalManager {
    constructor(elements) {
        this.elements = elements;
        this.modalCallback = null;
        this.init();
    }
    
    init() {
        this.elements.modalOkBtn.addEventListener('click', () => this.handleModalOk());
        this.elements.modalCancelBtn.addEventListener('click', () => this.handleModalCancel());
        
        this.elements.modalInputName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleModalOk();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.handleModalCancel();
            }
        });
    }
    
    showModal(title, defaultValue = '', callback) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalInputName.value = defaultValue || '';
        this.modalCallback = callback;
        this.elements.inputDialog.classList.add('show');
    }
    
    hideModal() {
        this.elements.inputDialog.classList.remove('show');
        this.elements.modalInputName.value = '';
        this.modalCallback = null;
    }
    
    handleModalOk() {
        const value = this.elements.modalInputName.value.trim();
        const callback = this.modalCallback;
        this.hideModal();
        if (callback) {
            callback(value);
        }
    }
    
    handleModalCancel() {
        const callback = this.modalCallback;
        this.hideModal();
        if (callback) {
            callback(null);
        }
    }
}
