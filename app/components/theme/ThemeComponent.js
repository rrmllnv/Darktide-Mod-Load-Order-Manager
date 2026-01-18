export class ThemeComponent {
    constructor(app) {
        this.app = app;
        this.themes = [
            { id: '', name: 'light', cssClass: '', localizationKey: 'ui.theme.light' },
            { id: 'dark', name: 'dark', cssClass: 'theme-dark', localizationKey: 'ui.theme.dark' },
            { id: 'high-contrast', name: 'high-contrast', cssClass: 'theme-high-contrast', localizationKey: 'ui.theme.highContrast' },
            { id: 'oled-dark', name: 'oled-dark', cssClass: 'theme-oled-dark', localizationKey: 'ui.theme.oledDark' },
            { id: 'sepia', name: 'sepia', cssClass: 'theme-sepia', localizationKey: 'ui.theme.sepia' },
            { id: 'blue-light', name: 'blue-light', cssClass: 'theme-blue-light', localizationKey: 'ui.theme.blueLight' },
            { id: 'nord', name: 'nord', cssClass: 'theme-nord', localizationKey: 'ui.theme.nord' },
            { id: 'dracula', name: 'dracula', cssClass: 'theme-dracula', localizationKey: 'ui.theme.dracula' },
            { id: 'solarized', name: 'solarized', cssClass: 'theme-solarized', localizationKey: 'ui.theme.solarized' }
        ];
    }
    
    async init() {
        await this.populateThemeSelect();
        
        if (this.app.userConfig && this.app.userConfig.theme !== undefined) {
            this.applyTheme(this.app.userConfig.theme);
        }
    }
    
    async populateThemeSelect() {
        if (!this.app.elements || !this.app.elements.settingsThemeSelect) {
            return;
        }
        
        this.app.elements.settingsThemeSelect.innerHTML = '';
        
        this.themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id || '';
            option.textContent = theme.name || theme.id || 'Light';
            this.app.elements.settingsThemeSelect.appendChild(option);
        });
        
        await this.updateThemeSelectLabels();
    }
    
    async updateThemeSelectLabels() {
        if (!this.app.elements || !this.app.elements.settingsThemeSelect) {
            return;
        }
        
        if (!this.app.localeManager) {
            return;
        }
        
        const themeOptions = this.app.elements.settingsThemeSelect.options;
        
        Array.from(themeOptions).forEach(option => {
            const theme = this.themes.find(t => (t.id || '') === option.value);
            if (theme && theme.localizationKey) {
                option.textContent = this.app.localeManager.t(theme.localizationKey);
            }
        });
    }
    
    applyTheme(themeId) {
        const body = document.body;
        
        this.themes.forEach(theme => {
            if (theme.cssClass) {
                body.classList.remove(theme.cssClass);
            }
        });
        
        if (themeId && themeId !== '') {
            const theme = this.themes.find(t => t.id === themeId);
            if (theme && theme.cssClass) {
                body.classList.add(theme.cssClass);
            }
        }
    }
}
