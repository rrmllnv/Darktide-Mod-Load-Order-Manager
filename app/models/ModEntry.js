export class ModEntry {
    constructor(name, enabled, originalLine, isNew = false, orderIndex = 0, isNotFound = false, isSymlink = false) {
        this.name = name;
        this.enabled = enabled;
        this.originalLine = originalLine;
        this.isNew = isNew;
        this.orderIndex = orderIndex;
        this.isNotFound = isNotFound;
        this.isSymlink = isSymlink;
    }
}
