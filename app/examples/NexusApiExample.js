/**
 * ПРИМЕР ИСПОЛЬЗОВАНИЯ GraphQL API Nexus Mods
 * 
 * Этот файл показывает, как работать с NexusApiService
 */

import { NexusApiService } from '../services/NexusApiService.js';

// Пример использования в вашем приложении:

async function exampleUsage(appInstance) {
    // 1. Создаем экземпляр сервиса
    // appInstance передается извне, чтобы не зависеть от глобальной переменной
    const nexusApi = new NexusApiService(appInstance || window.app);
    
    // 2. Устанавливаем API ключ пользователя
    // API ключ можно получить:
    // - Через SSO (Single Sign-On) после регистрации приложения в Nexus Mods
    // - Вручную: https://www.nexusmods.com/users/myaccount?tab=api
    const apiKey = 'HI2J99akxHkcQh+R5g1949tKHezfHMlgbatmJ9oz1Auf--Asu3o8x3X/nztUCG--PLgCTTg9Dvl280ToffvZUQ==';
    nexusApi.setApiKey(apiKey);
    
    /*
    // 3. Получаем список модов для игры
    // Для Darktide нужно узнать gameId (обычно это число, например 123)
    try {
        const modsResult = await nexusApi.getMods({
            gameId: 4943, // ID игры Darktide в Nexus Mods (нужно уточнить)
            count: 20,   // Количество модов
            offset: 0,   // Смещение для пагинации
            sort: [{ field: 'LATEST', direction: 'DESC' }] // Сортировка по дате (новые сначала)
        });
        
        console.log(`Всего модов: ${modsResult.totalCount}`);
        console.log(`Получено: ${modsResult.nodesCount}`);
        
        // Выводим информацию о каждом моде
        modsResult.nodes.forEach(mod => {
            console.log(`- ${mod.name} (ID: ${mod.modId})`);
            console.log(`  Автор: ${mod.uploadedBy?.username || mod.author}`);
            console.log(`  Загрузок: ${mod.downloads}`);
            console.log(`  Одобрений: ${mod.endorsements?.count || 0}`);
            console.log(`  Обновлен: ${new Date(mod.updatedAt).toLocaleDateString()}`);
        });
        
    } catch (error) {
        console.error('Ошибка при получении модов:', error);
    }
    
    // 4. Получаем информацию о конкретном моде
    try {
        const modId = 653; // ID конкретного мода (Servo-ModQuisitor из списка выше)
        const gameId = 4943;  // ID игры Darktide
        
        const mod = await nexusApi.getMod(modId, gameId);
        
        console.log(`Мод: ${mod.name}`);
        console.log(`Описание: ${mod.description}`);
        console.log(`Версия: ${mod.version}`);
        console.log(`Файлов: ${mod.files?.length || 0}`);
        
        // Список файлов мода
        if (mod.files && mod.files.length > 0) {
            mod.files.forEach(file => {
                console.log(`  - ${file.name} (${file.version}) - ${file.size} байт`);
            });
        }
        
    } catch (error) {
        console.error('Ошибка при получении информации о моде:', error);
    }
        */

    // 4.1 получение файлов
    try {
        const modId = 139; // ID конкретного мода (Servo-ModQuisitor из списка выше)
        const gameId = 4943;  // ID игры Darktide
        
        const allFiles = await nexusApi.getFiles(modId, gameId);
        
        // Фильтруем файлы по категории MAIN
        const files = allFiles.filter(file => file.category === 'MAIN');

        console.log(`Всего файлов: ${allFiles.length}`);
        console.log(`Файлов категории MAIN: ${files.length}`);
        console.log('---');
        
        files.forEach((file, index) => {
            console.log(`\nФайл #${index + 1}:`);
            console.log(`  ID: ${file.id}`);
            console.log(`  File ID: ${file.fileId}`);
            console.log(`  Название: ${file.name}`);
            console.log(`  Версия: ${file.version || 'N/A'}`);
            console.log(`  Категория: ${file.category} (ID: ${file.categoryId})`);
            console.log(`  Размер: ${file.size || 'N/A'}`);
            console.log(`  Размер в байтах: ${file.sizeInBytes || 'N/A'}`);
            console.log(`  URI: ${file.uri || 'N/A'}`);
            console.log(`  UID: ${file.uid || 'N/A'}`);
            console.log(`  Основной файл: ${file.primary ? 'Да' : 'Нет'}`);
            console.log(`  Сканирован: ${file.scanned || 'N/A'}`);
            console.log(`  Сканирован V2: ${file.scannedV2 || 'N/A'}`);
            console.log(`  Всего загрузок: ${file.totalDownloads || 0}`);
            console.log(`  Уникальных загрузок: ${file.uniqueDownloads || 0}`);
            console.log(`  Дата: ${file.date ? new Date(file.date * 1000).toLocaleString() : 'N/A'}`);
            if (file.description) {
                console.log(`  Описание: ${file.description.substring(0, 100)}${file.description.length > 100 ? '...' : ''}`);
            }
            if (file.changelogText && file.changelogText.length > 0) {
                console.log(`  Changelog: ${file.changelogText.join(', ')}`);
            }
            if (file.mod) {
                console.log(`  Мод: ${file.mod.name} (ID: ${file.mod.modId})`);
            }
            if (file.owner) {
                console.log(`  Владелец: ${file.owner.name} (Member ID: ${file.owner.memberId})`);
            }
        });

    }catch (error) {
        console.error('Ошибка при получении информации о моде:', error);
    }
    
    /*
    // 5. Поиск модов по названию
    try {
        const searchResults = await nexusApi.searchMods('mod', 4943, 10);
        
        console.log(`Найдено модов: ${searchResults.totalCount}`);
        searchResults.nodes.forEach(mod => {
            console.log(`- ${mod.name}`);
        });
        
    } catch (error) {
        console.error('Ошибка при поиске:', error);
    }
    */
    
    // 6. Прямой GraphQL запрос (если нужна кастомная логика)
    /*
    try {
        // Пример кастомного запроса - получаем только названия и ID модов
        const customQuery = `
            query mods($filter: ModsFilter, $count: Int) {
                mods(filter: $filter, count: $count) {
                    nodes {
                        id
                        name
                        modId
                    }
                    totalCount
                }
            }
        `;
        
        const variables = {
            filter: {
                gameId: [
                    { op: 'EQUALS', value: '4943' }
                ]
            },
            count: 5
        };
        
        const result = await nexusApi.executeQuery(customQuery, variables, 'mods');
        console.log('Результат кастомного запроса:', result);
        
    } catch (error) {
        console.error('Ошибка кастомного запроса:', error);
    }
    */
}

/**
 * КАК ПОНИМАТЬ GraphQL ЗАПРОС:
 * 
 * 1. query mods(...) - это название операции
 *    - query - тип операции (чтение данных)
 *    - mods - название операции (может быть любым)
 * 
 * 2. $viewUploaderHidden: Boolean - это переменная
 *    - $ означает, что это переменная
 *    - Boolean - тип переменной
 * 
 * 3. mods(...) - это вызов GraphQL поля/функции
 *    - viewUploaderHidden: $viewUploaderHidden - передаем переменную
 * 
 * 4. { nodes { id name } } - это поля, которые хотим получить
 *    - nodes - массив результатов
 *    - id, name - конкретные поля каждого элемента
 * 
 * 5. Переменные передаются отдельно:
 *    {
 *      "viewUploaderHidden": false,
 *      "count": 20
 *    }
 * 
 * 6. Результат приходит в том же формате, что и запрос:
 *    {
 *      "mods": {
 *        "nodes": [
 *          { "id": 1, "name": "Mod 1" },
 *          { "id": 2, "name": "Mod 2" }
 *        ]
 *      }
 *    }
 */

/**
 * ВАЖНЫЕ МОМЕНТЫ:
 * 
 * 1. API ключ обязателен - без него запросы не работают
 * 2. Нужно знать gameId для Darktide (можно найти через API или документацию)
 * 3. GraphQL позволяет запрашивать только нужные поля - это экономит трафик
 * 4. Ошибки приходят в поле errors, даже если HTTP статус 200
 * 5. Пагинация через offset и count
 */

export { exampleUsage };
