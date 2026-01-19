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
            { id: 'solarized', name: 'solarized', cssClass: 'theme-solarized', localizationKey: 'ui.theme.solarized' },
            { id: 'one-dark', name: 'one-dark', cssClass: 'theme-one-dark', localizationKey: 'ui.theme.oneDark' },
            { id: 'gruvbox', name: 'gruvbox', cssClass: 'theme-gruvbox', localizationKey: 'ui.theme.gruvbox' },
            { id: 'catppuccin', name: 'catppuccin', cssClass: 'theme-catppuccin', localizationKey: 'ui.theme.catppuccin' },
            { id: 'tokyo-night', name: 'tokyo-night', cssClass: 'theme-tokyo-night', localizationKey: 'ui.theme.tokyoNight' },
            { id: 'material-dark', name: 'material-dark', cssClass: 'theme-material-dark', localizationKey: 'ui.theme.materialDark' },
            { id: 'github-dark', name: 'github-dark', cssClass: 'theme-github-dark', localizationKey: 'ui.theme.githubDark' },
            { id: 'ayu-dark', name: 'ayu-dark', cssClass: 'theme-ayu-dark', localizationKey: 'ui.theme.ayuDark' },
            { id: 'monokai', name: 'monokai', cssClass: 'theme-monokai', localizationKey: 'ui.theme.monokai' }
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
