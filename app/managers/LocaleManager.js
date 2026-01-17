export class LocaleManager {
    constructor() {
        this.currentLocale = 'ru';
        this.translations = {};
    }
    
    async loadLocale(locale = 'ru') {
        try {
            const response = await fetch(`locales/${locale}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load locale: ${locale}`);
            }
            this.translations = await response.json();
            this.currentLocale = locale;
            return this.translations;
        } catch (error) {
            console.error('Error loading locale:', error);
            if (locale !== 'ru') {
                return await this.loadLocale('ru');
            }
            throw error;
        }
    }
    
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }
        
        if (typeof value !== 'string') {
            console.warn(`Translation value is not a string: ${key}`);
            return key;
        }
        
        if (Object.keys(params).length > 0) {
            return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }
        
        return value;
    }
    
    getLocale() {
        return this.currentLocale;
    }
    
    setLocale(locale) {
        this.currentLocale = locale;
    }
}
