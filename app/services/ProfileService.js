import { ModEntry } from '../models/ModEntry.js';

export class ProfileService {
    constructor(profilesDir) {
        this.profilesDir = profilesDir;
    }
    
    saveState(modEntries, settings = {}) {
        const modsToSave = modEntries.filter(modEntry => {
            if (modEntry.isNew && !modEntry.enabled) {
                return false;
            }
            return true;
        });
        
        const sortedMods = [...modsToSave].sort((a, b) => a.orderIndex - b.orderIndex);
        
        const state = {
            _order: [],
            _mods: {},
            _settings: {
                hideNewMods: settings.hideNewMods || false,
                hideNotFoundMods: settings.hideNotFoundMods || false,
                hideUnusedMods: settings.hideUnusedMods || false,
                sort: settings.sort || null
            }
        };
        
        for (const modEntry of sortedMods) {
            state._order.push(modEntry.name);
            state._mods[modEntry.name] = modEntry.enabled;
        }
        
        return state;
    }
    
    restoreState(state, existingModEntries) {
        if (!state) {
            return { modEntries: [], selectedModName: '', settings: null };
        }
        
        if (!state._order || !state._mods) {
            return { modEntries: [], selectedModName: '', settings: null };
        }
        
        const profileOrder = state._order;
        const profileMods = state._mods;
        const profileSettings = state._settings || null;
        
        const profileModNames = new Set(profileOrder);
        
        const existingModsMap = new Map();
        for (const modEntry of existingModEntries) {
            existingModsMap.set(modEntry.name, modEntry);
        }
        
        const restoredMods = [];
        const maxOrderIndex = Math.max(...existingModEntries.map(m => m.orderIndex), 0);
        
        profileOrder.forEach((modName, index) => {
            const enabled = profileMods[modName];
            const existingMod = existingModsMap.get(modName);
            
            if (existingMod) {
                existingMod.enabled = enabled;
                existingMod.orderIndex = index;
                existingMod.isNew = false;
                restoredMods.push(existingMod);
                existingModsMap.delete(modName);
            } else {
                restoredMods.push(new ModEntry(
                    modName,
                    enabled,
                    enabled ? modName : `--${modName}`,
                    false,
                    index,
                    false,
                    false
                ));
            }
        });
        
        for (const [modName, modEntry] of existingModsMap) {
            if (!modEntry.isNew) {
                modEntry.isNew = true;
            }
            modEntry.enabled = false;
            modEntry.orderIndex = maxOrderIndex + 1000 + restoredMods.length;
            restoredMods.push(modEntry);
        }
        
        return { modEntries: restoredMods, settings: profileSettings };
    }
    
    async listProfiles() {
        if (!this.profilesDir) {
            return { success: false, profiles: [] };
        }
        
        return await window.electronAPI.listProfiles(this.profilesDir);
    }
    
    async saveProfile(profileName, state) {
        if (!this.profilesDir) {
            return { success: false, error: 'Profiles directory not determined' };
        }
        
        return await window.electronAPI.saveProfile(this.profilesDir, profileName, state);
    }
    
    async loadProfile(profileName) {
        if (!this.profilesDir) {
            return { success: false, error: 'Profiles directory not determined' };
        }
        
        return await window.electronAPI.loadProfile(this.profilesDir, profileName);
    }
    
    async deleteProfile(profileName) {
        if (!this.profilesDir) {
            return { success: false, error: 'Profiles directory not determined' };
        }
        
        return await window.electronAPI.deleteProfile(this.profilesDir, profileName);
    }
    
    async renameProfile(oldName, newName) {
        if (!this.profilesDir) {
            return { success: false, error: 'Profiles directory not determined' };
        }
        
        return await window.electronAPI.renameProfile(this.profilesDir, oldName, newName);
    }
}
