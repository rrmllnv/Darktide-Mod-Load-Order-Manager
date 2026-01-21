/**
 * Сервис для работы с GraphQL API Nexus Mods
 * 
 * GraphQL - это язык запросов, где:
 * - Один эндпоинт для всех запросов (обычно /graphql)
 * - Вы запрашиваете только нужные поля
 * - Переменные передаются отдельно от запроса
 */

export class NexusApiService {
    constructor(app) {
        this.app = app;
        // GraphQL эндпоинт Nexus Mods
        this.graphqlEndpoint = 'https://api.nexusmods.com/v2/graphql';
        // API ключ пользователя (нужно получить через SSO или вручную)
        this.apiKey = "HI2J99akxHkcQh+R5g1949tKHezfHMlgbatmJ9oz1Auf--Asu3o8x3X/nztUCG--PLgCTTg9Dvl280ToffvZUQ==";
    }

    /**
     * Установить API ключ для авторизации
     * @param {string} apiKey - API ключ пользователя Nexus Mods
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Выполнить GraphQL запрос
     * 
     * Запросы выполняются через IPC (Inter-Process Communication) для безопасности.
     * Это означает, что запросы идут через главный процесс Electron, а не напрямую из renderer.
     * 
     * @param {string} query - GraphQL запрос (строка с query)
     * @param {object} variables - Переменные для запроса
     * @param {string} operationName - Название операции (опционально, используется для отладки)
     * @returns {Promise<object>} Результат запроса
     * 
     * Пример:
     * const query = `
     *   query mods($gameId: Int!, $count: Int) {
     *     mods(gameId: $gameId, count: $count) {
     *       nodes {
     *         id
     *         name
     *       }
     *     }
     *   }
     * `;
     * 
     * const variables = { gameId: 123, count: 10 };
     * const result = await this.executeQuery(query, variables);
     */
    async executeQuery(query, variables = {}, operationName = null) {
        if (!this.apiKey) {
            throw new Error('API key is not set. Call setApiKey() first.');
        }

        if (!window.electronAPI || !window.electronAPI.nexusGraphQLQuery) {
            throw new Error('Electron API is not available. Make sure preload.js is loaded.');
        }

        try {
            // Выполняем запрос через IPC (безопасный способ в Electron)
            const result = await window.electronAPI.nexusGraphQLQuery(query, variables, this.apiKey);

            if (!result.success) {
                throw new Error(result.error || 'Unknown error occurred');
            }

            return result.data;
        } catch (error) {
            console.error('GraphQL query error:', error);
            throw error;
        }
    }

    /**
     * Получить список модов для игры
     * 
     * @param {object} options - Параметры запроса
     * @param {number} options.gameId - ID игры в Nexus Mods (для Darktide нужно узнать)
     * @param {number} options.count - Количество модов (по умолчанию 20)
     * @param {number} options.offset - Смещение для пагинации (по умолчанию 0)
     * @param {string} options.sort - Сортировка (например, 'latest', 'popular', 'endorsements')
     * @param {object} options.filter - Фильтры (например, { category: 'Mods' })
     * @returns {Promise<object>} Результат с модами
     * 
     * Пример использования:
     * const mods = await nexusApi.getMods({
     *   gameId: 123,
     *   count: 50,
     *   sort: 'latest'
     * });
     */
    async getMods(options = {}) {
        const {
            gameId,
            count = 20,
            offset = 0,
            sort = [{ field: 'LATEST', direction: 'DESC' }],
            filter = {},
            viewUploaderHidden = false,
            viewUserBlockedContent = true
        } = options;

        // GraphQL запрос - это строка с определением запроса
        // $gameId, $count и т.д. - это переменные, которые передаются отдельно
        const query = `
            query mods(
                $viewUploaderHidden: Boolean,
                $viewUserBlockedContent: Boolean,
                $facets: ModsFacet,
                $filter: ModsFilter,
                $postFilter: ModsFilter,
                $sort: [ModsSort!],
                $offset: Int,
                $count: Int
            ) {
                mods(
                    viewUploaderHidden: $viewUploaderHidden,
                    viewUserBlockedContent: $viewUserBlockedContent,
                    facets: $facets,
                    filter: $filter,
                    postFilter: $postFilter,
                    sort: $sort,
                    offset: $offset,
                    count: $count
                ) {
                    totalCount
                    nodesCount
                    nodes {
                        id
                        name
                        summary
                        description
                        author
                        pictureUrl
                        modId
                        gameId
                        category
                        version
                        downloads
                        endorsements
                        createdAt
                        updatedAt
                    }
                }
            }
        `;

        // Переменные для запроса - это объект с параметрами
        // Формат filter: gameId должен быть массивом объектов с операторами
        const filterObj = {};
        
        if (gameId) {
            filterObj.gameId = [
                { op: 'EQUALS', value: String(gameId) }
            ];
        }
        
        // Добавляем дополнительные фильтры
        Object.assign(filterObj, filter);
        
        // Формат sort: должен быть массивом объектов
        let sortArray = null;
        if (sort && sort.length > 0) {
            sortArray = sort.map(s => {
                if (s.field === 'LATEST') {
                    return { updatedAt: { direction: s.direction || 'DESC' } };
                } else if (s.field === 'POPULAR') {
                    return { downloads: { direction: s.direction || 'DESC' } };
                } else if (s.field === 'ENDORSEMENTS') {
                    return { endorsements: { direction: s.direction || 'DESC' } };
                } else {
                    return { updatedAt: { direction: 'DESC' } };
                }
            });
        }
        
        const variables = {
            viewUploaderHidden: viewUploaderHidden,
            viewUserBlockedContent: viewUserBlockedContent,
            filter: Object.keys(filterObj).length > 0 ? filterObj : null,
            sort: sortArray,
            offset: offset,
            count: count
        };

        try {
            const data = await this.executeQuery(query, variables, 'mods');
            return data.mods;
        } catch (error) {
            console.error('Error fetching mods:', error);
            throw error;
        }
    }

    /**
     * Получить информацию о конкретном моде
     * Используем getMods и фильтруем по modId в коде (так как modId не поддерживается в ModsFilter)
     * 
     * @param {number} modId - ID мода
     * @param {number} gameId - ID игры
     * @returns {Promise<object>} Информация о моде
     */
    async getMod(modId, gameId) {
        try {
            // Получаем все моды для игры и ищем нужный по modId
            // Это не оптимально, но modId не поддерживается в фильтре
            const result = await this.getMods({
                gameId: gameId,
                count: 100, // Увеличиваем лимит для поиска
                offset: 0
            });
            
            const mod = result.nodes.find(m => m.modId === modId);
            if (mod) {
                return mod;
            }
            throw new Error(`Mod with ID ${modId} not found`);
        } catch (error) {
            console.error('Error fetching mod:', error);
            throw error;
        }
    }

    /**
     * Поиск модов по названию
     * 
     * @param {string} searchTerm - Поисковый запрос
     * @param {number} gameId - ID игры
     * @param {number} count - Количество результатов
     * @returns {Promise<object>} Результаты поиска
     */
    async searchMods(searchTerm, gameId, count = 20) {
        // WILDCARD может не работать для поля name в GraphQL API
        // Поэтому получаем моды и фильтруем на клиенте
        const allMods = await this.getMods({
            gameId: gameId,
            count: 500, // Получаем больше для поиска
            offset: 0,
            sort: [{ field: 'LATEST', direction: 'DESC' }]
        });
        
        const searchLower = searchTerm.toLowerCase();
        const filtered = allMods.nodes.filter(mod => 
            mod.name.toLowerCase().includes(searchLower)
        );
        
        return {
            totalCount: filtered.length,
            nodesCount: filtered.length,
            nodes: filtered.slice(0, count)
        };
    }

    /**
     * Получить список файлов мода
     * 
     * @param {number|string} modId - ID мода
     * @param {number|string} gameId - ID игры
     * @returns {Promise<Array>} Массив файлов мода
     * 
     * Пример использования:
     * const files = await nexusApi.getFiles(653, 4943);
     */
    async getFiles(modId, gameId) {
        const query = `
            query modFiles(
                $modId: ID!,
                $gameId: ID!
            ) {
                modFiles(
                    modId: $modId,
                    gameId: $gameId
                ) {
                    category
                    categoryId
                    changelogText
                    count
                    date
                    description
                    fileId
                    game {
                        id
                        name
                        domainName
                    }
                    id
                    manager
                    mod {
                        id
                        name
                        modId
                        gameId
                    }
                    modId
                    name
                    owner {
                        name
                        memberId
                    }
                    primary
                    reportLink
                    requirementsAlert
                    scanned
                    scannedV2
                    size
                    sizeInBytes
                    totalDownloads
                    uCount
                    uid
                    uniqueDownloads
                    uri
                    version
                }
            }
        `;

        const variables = {
            modId: String(modId),
            gameId: String(gameId)
        };

        try {
            const data = await this.executeQuery(query, variables, 'modFiles');
            return data.modFiles;
        } catch (error) {
            console.error('Error fetching mod files:', error);
            throw error;
        }
    }
}
