export class Sorter {
    static sortMods(mods, sortType) {
        if (sortType === 'fileOrder') {
            return [...mods].sort((a, b) => a.orderIndex - b.orderIndex);
        } else if (sortType === 'name') {
            return [...mods].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        } else if (sortType === 'status') {
            return [...mods].sort((a, b) => {
                if (a.enabled !== b.enabled) {
                    return a.enabled ? -1 : 1;
                }
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
        } else if (sortType === 'newFirst') {
            return [...mods].sort((a, b) => {
                if (a.isNew !== b.isNew) {
                    return a.isNew ? -1 : 1;
                }
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
        } else {
            return [...mods].sort((a, b) => a.orderIndex - b.orderIndex);
        }
    }
}
