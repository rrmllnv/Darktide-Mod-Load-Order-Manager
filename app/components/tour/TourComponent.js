import { ConfigManager } from '../../managers/ConfigManager.js';

export class TourComponent {
    constructor(app) {
        this.app = app;
        this.currentStep = 0;
        this.steps = [];
        this.isActive = false;
        this.isBrowseTour = false;
    }
    
    t(key, params = {}) {
        if (this.app.localeManager) {
            return this.app.localeManager.t(key, params);
        }
        return this.app.t(key, params);
    }
    
    async init() {
        this.elements = {
            tourOverlay: document.getElementById('tour-overlay'),
            tourTooltip: document.getElementById('tour-tooltip'),
            tourTitle: document.getElementById('tour-title'),
            tourDescription: document.getElementById('tour-description'),
            tourFooter: document.getElementById('tour-footer'),
            tourPrevBtn: document.getElementById('tour-prev-btn'),
            tourNextBtn: document.getElementById('tour-next-btn'),
            tourSkipBtn: document.getElementById('tour-skip-btn')
        };
        
        if (this.elements.tourOverlay && !document.getElementById('tour-highlight')) {
            const highlight = document.createElement('div');
            highlight.id = 'tour-highlight';
            highlight.className = 'tour-highlight';
            this.elements.tourOverlay.appendChild(highlight);
        }
        
        this.setupSteps();
        this.bindEvents();
    }
    
    setupSteps() {
        this.steps = [
            {
                selector: '#browse-btn',
                titleKey: 'tour.steps.selectFile.title',
                descriptionKey: 'tour.steps.selectFile.description',
                position: 'bottom'
            },
            {
                selector: '#mods-list',
                titleKey: 'tour.steps.modsList.title',
                descriptionKey: 'tour.steps.modsList.description',
                position: 'right'
            },
            {
                selector: '#enable-all-btn',
                titleKey: 'tour.steps.enableDisable.title',
                descriptionKey: 'tour.steps.enableDisable.description',
                position: 'bottom'
            },
            {
                selector: '#search-input',
                titleKey: 'tour.steps.search.title',
                descriptionKey: 'tour.steps.search.description',
                position: 'bottom'
            },
            {
                selector: '#profiles-list',
                titleKey: 'tour.steps.profiles.title',
                descriptionKey: 'tour.steps.profiles.description',
                position: 'left'
            },
            {
                selector: '#save-btn',
                titleKey: 'tour.steps.save.title',
                descriptionKey: 'tour.steps.save.description',
                position: 'top'
            }
        ];
    }
    
    getStepData(step) {
        return {
            selector: step.selector,
            title: this.t(step.titleKey),
            description: this.t(step.descriptionKey),
            position: step.position
        };
    }
    
    bindEvents() {
        if (this.elements.tourNextBtn) {
            this.elements.tourNextBtn.addEventListener('click', () => this.nextStep());
        }
        
        if (this.elements.tourPrevBtn) {
            this.elements.tourPrevBtn.addEventListener('click', () => this.prevStep());
        }
        
        if (this.elements.tourSkipBtn) {
            this.elements.tourSkipBtn.addEventListener('click', () => this.skipTour());
        }
        
        if (this.elements.tourOverlay) {
            this.elements.tourOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.tourOverlay) {
                    this.skipTour();
                }
            });
        }
    }
    
    async startTour() {
        if (this.isActive) {
            return;
        }
        
        this.currentStep = 0;
        this.isActive = true;
        this.isBrowseTour = false;
        await this.showStep(0);
    }
    
    async startBrowseTour() {
        if (this.isActive) {
            return;
        }
        
        if (!this.elements || !this.elements.tourOverlay) {
            await this.init();
        }
        
        this.isActive = true;
        this.isBrowseTour = true;
        const browseStep = this.steps.find(step => step.selector === '#browse-btn');
        
        if (!browseStep) {
            return;
        }
        
        const step = this.getStepData(browseStep);
        const element = document.querySelector(step.selector);
        
        if (!element) {
            return;
        }
        
        this.scrollToElement(element);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const rect = element.getBoundingClientRect();
        
        this.highlightElement(element, rect);
        this.positionTooltip(rect, step.position, 0);
        
        this.elements.tourTitle.textContent = step.title;
        this.elements.tourDescription.textContent = step.description;
        
        if (this.elements.tourPrevBtn) {
            this.elements.tourPrevBtn.style.display = 'none';
        }
        
        if (this.elements.tourNextBtn) {
            this.elements.tourNextBtn.textContent = this.t('tour.finish');
        }
        
        if (this.elements.tourSkipBtn) {
            this.elements.tourSkipBtn.textContent = this.t('tour.skip');
        }
        
        this.elements.tourOverlay.classList.add('show');
        this.elements.tourTooltip.classList.add('show');
        
        const handleFinish = () => {
            this.endTour();
        };
        
        if (this.elements.tourNextBtn) {
            const newNextBtn = this.elements.tourNextBtn.cloneNode(true);
            this.elements.tourNextBtn.parentNode.replaceChild(newNextBtn, this.elements.tourNextBtn);
            this.elements.tourNextBtn = newNextBtn;
            this.elements.tourNextBtn.addEventListener('click', handleFinish);
        }
        
        if (this.elements.tourSkipBtn) {
            const newSkipBtn = this.elements.tourSkipBtn.cloneNode(true);
            this.elements.tourSkipBtn.parentNode.replaceChild(newSkipBtn, this.elements.tourSkipBtn);
            this.elements.tourSkipBtn = newSkipBtn;
            this.elements.tourSkipBtn.addEventListener('click', () => {
                this.skipTour();
            });
        }
    }
    
    async showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            this.endTour();
            return;
        }
        
        this.currentStep = stepIndex;
        const stepConfig = this.steps[stepIndex];
        const step = this.getStepData(stepConfig);
        
        const element = document.querySelector(step.selector);
        if (!element) {
            this.nextStep();
            return;
        }
        
        this.scrollToElement(element);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const rect = element.getBoundingClientRect();
        
        this.highlightElement(element, rect);
        this.positionTooltip(rect, step.position, stepIndex);
        
        this.elements.tourTitle.textContent = step.title;
        this.elements.tourDescription.textContent = step.description;
        
        this.updateButtons(stepIndex);
        
        this.elements.tourOverlay.classList.add('show');
        this.elements.tourTooltip.classList.add('show');
    }
    
    highlightElement(element, rect) {
        const highlight = document.getElementById('tour-highlight');
        if (highlight) {
            highlight.style.left = `${rect.left}px`;
            highlight.style.top = `${rect.top}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;
        }
    }
    
    positionTooltip(elementRect, position, stepIndex) {
        const tooltip = this.elements.tourTooltip;
        const padding = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const tooltipWidth = tooltip.offsetWidth || 350;
        const tooltipHeight = tooltip.offsetHeight || 200;
        
        let left, top;
        
        switch (position) {
            case 'top':
                left = elementRect.left + (elementRect.width / 2) - (tooltipWidth / 2);
                top = elementRect.top - tooltipHeight - padding;
                break;
            case 'bottom':
                left = elementRect.left + (elementRect.width / 2) - (tooltipWidth / 2);
                top = elementRect.bottom + padding;
                break;
            case 'left':
                left = elementRect.left - tooltipWidth - padding;
                top = elementRect.top + (elementRect.height / 2) - (tooltipHeight / 2);
                break;
            case 'right':
                left = elementRect.right + padding;
                top = elementRect.top + (elementRect.height / 2) - (tooltipHeight / 2);
                break;
            default:
                left = elementRect.left + (elementRect.width / 2) - (tooltipWidth / 2);
                top = elementRect.bottom + padding;
        }
        
        if (left < padding) {
            left = padding;
        } else if (left + tooltipWidth > viewportWidth - padding) {
            left = viewportWidth - tooltipWidth - padding;
        }
        
        if (top < padding) {
            top = padding;
        } else if (top + tooltipHeight > viewportHeight - padding) {
            top = viewportHeight - tooltipHeight - padding;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
    
    scrollToElement(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    
    updateButtons(stepIndex) {
        if (this.elements.tourPrevBtn) {
            this.elements.tourPrevBtn.disabled = stepIndex === 0;
            this.elements.tourPrevBtn.style.display = stepIndex === 0 ? 'none' : 'inline-block';
            this.elements.tourPrevBtn.textContent = this.t('tour.previous');
        }
        
        if (this.elements.tourNextBtn) {
            const isLastStep = stepIndex === this.steps.length - 1;
            this.elements.tourNextBtn.textContent = isLastStep 
                ? this.t('tour.finish') 
                : this.t('tour.next');
        }
        
        if (this.elements.tourSkipBtn) {
            this.elements.tourSkipBtn.textContent = this.t('tour.skip');
        }
    }
    
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.endTour();
        }
    }
    
    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }
    
    skipTour() {
        this.endTour(this.isBrowseTour);
    }
    
    endTour(isBrowseTour = false) {
        this.isActive = false;
        this.elements.tourOverlay.classList.remove('show');
        this.elements.tourTooltip.classList.remove('show');
        if (isBrowseTour) {
            this.saveBrowseTourCompleted();
        } else {
            this.saveTourCompleted();
        }
        this.isBrowseTour = false;
    }
    
    async saveTourCompleted() {
        try {
            if (!this.app.userConfig) {
                this.app.userConfig = ConfigManager.getDefaultUserConfig();
            }
            
            this.app.userConfig.tourCompleted = true;
            await this.app.configManager.saveUserConfig();
        } catch (error) {
            console.error('Error saving tour status:', error);
        }
    }
    
    async saveBrowseTourCompleted() {
        try {
            if (!this.app.userConfig) {
                this.app.userConfig = ConfigManager.getDefaultUserConfig();
            }
            
            this.app.userConfig.browseTourCompleted = true;
            await this.app.configManager.saveUserConfig();
        } catch (error) {
            console.error('Error saving browse tour status:', error);
        }
    }
    
    shouldShowTour() {
        if (!this.app.userConfig) {
            return true;
        }
        return !this.app.userConfig.tourCompleted;
    }
    
    shouldShowBrowseTour() {
        if (!this.app.userConfig) {
            return true;
        }
        return !this.app.userConfig.browseTourCompleted;
    }
}
