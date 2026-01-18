export class ThemeComponent {
    constructor(app) {
        this.app = app;
        this.themes = [
            { id: '', name: 'light', cssClass: '', localizationKey: 'ui.light' },
            { id: 'dark', name: 'dark', cssClass: 'theme-dark', localizationKey: 'ui.dark' },
            { id: 'high-contrast', name: 'high-contrast', cssClass: 'theme-high-contrast', localizationKey: 'ui.highContrast' },
            { id: 'oled-dark', name: 'oled-dark', cssClass: 'theme-oled-dark', localizationKey: 'ui.oledDark' },
            { id: 'sepia', name: 'sepia', cssClass: 'theme-sepia', localizationKey: 'ui.sepia' },
            { id: 'blue-light', name: 'blue-light', cssClass: 'theme-blue-light', localizationKey: 'ui.blueLight' },
            { id: 'nord', name: 'nord', cssClass: 'theme-nord', localizationKey: 'ui.nord' },
            { id: 'dracula', name: 'dracula', cssClass: 'theme-dracula', localizationKey: 'ui.dracula' },
            { id: 'solarized', name: 'solarized', cssClass: 'theme-solarized', localizationKey: 'ui.solarized' }
        ];
    }
    
    init() {
        this.loadStyles();
        this.populateThemeSelect();
        
        if (this.app.userConfig && this.app.userConfig.theme !== undefined) {
            this.applyTheme(this.app.userConfig.theme);
        }
    }
    
    loadStyles() {
        const styles = [
            'styles/theme-light.css',
            'styles/theme-dark.css',
            'styles/theme-high-contrast.css',
            'styles/theme-oled-dark.css',
            'styles/theme-sepia.css',
            'styles/theme-blue-light.css',
            'styles/theme-nord.css',
            'styles/theme-dracula.css',
            'styles/theme-solarized.css'
        ];
        
        styles.forEach(styleFile => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleFile;
            link.setAttribute('data-theme-style', styleFile);
            
            const baseLink = document.querySelector('link[href="styles/base.css"]');
            if (baseLink && baseLink.nextSibling) {
                baseLink.parentNode.insertBefore(link, baseLink.nextSibling);
            } else {
                document.head.appendChild(link);
            }
        });
    }
    
    populateThemeSelect() {
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
        
        this.updateThemeSelectLabels();
    }
    
    updateThemeSelectLabels() {
        if (!this.app.elements || !this.app.elements.settingsThemeSelect) {
            return;
        }
        
        if (!this.app.localeManager) {
            return;
        }
        
        const currentLocale = this.app.localeManager.getCurrentLocale() || 'en';
        const t = (key) => this.app.localeManager.t(key);
        
        const themeOptions = this.app.elements.settingsThemeSelect.options;
        
        Array.from(themeOptions).forEach(option => {
            const theme = this.themes.find(t => (t.id || '') === option.value);
            if (theme && theme.localizationKey) {
                option.textContent = t(theme.localizationKey);
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
