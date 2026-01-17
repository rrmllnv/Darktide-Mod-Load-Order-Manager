// Класс для представления записи мода
export class ModEntry {
    constructor(name, enabled, originalLine, isNew = false, orderIndex = 0, isNotFound = false, isSymlink = false) {
        this.name = name;
        this.enabled = enabled;
        this.originalLine = originalLine;
        this.isNew = isNew; // Флаг для новых модов, найденных при сканировании
        this.orderIndex = orderIndex; // Порядковый номер из файла (для сортировки по умолчанию)
        this.isNotFound = isNotFound; // Флаг для модов, которые не найдены в файловой системе
        this.isSymlink = isSymlink; // Флаг для модов, которые являются симлинками
    }
}
