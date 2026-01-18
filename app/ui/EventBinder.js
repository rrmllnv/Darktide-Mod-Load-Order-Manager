export class EventBinder {
    constructor(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.bindAll();
    }
    
    bindAll() {
        this.elements.saveBtn.addEventListener('click', () => this.callbacks.saveFile());
    }
}
