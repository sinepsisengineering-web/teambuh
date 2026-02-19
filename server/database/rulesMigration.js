// server/database/rulesMigration.js
// Миграция системных правил из taskRules.ts в Master DB

const { getMasterRulesDatabase } = require('./rulesDatabase');

/**
 * Преобразование TaskRule из taskRules.ts в формат БД
 */
const convertTaskRuleToDbFormat = (rule) => {
    // Определяем применимость на основе функции appliesTo
    // Это делается через анализ строкового представления функции
    const appliesToStr = rule.appliesTo.toString();

    let applicabilityConfig = {
        allClients: true,
        legalForms: null,
        taxSystems: null,
        requiresEmployees: false,
        requiresNds: false
    };

    // Анализируем функцию appliesTo для определения условий
    if (appliesToStr.includes('hasEmployees')) {
        applicabilityConfig.requiresEmployees = true;
        applicabilityConfig.allClients = false;
    }
    if (appliesToStr.includes('isNdsPayer')) {
        applicabilityConfig.requiresNds = true;
        applicabilityConfig.allClients = false;
    }
    if (appliesToStr.includes('legalForm')) {
        applicabilityConfig.allClients = false;
        // Пытаемся извлечь конкретные формы
        if (appliesToStr.includes("IP") || appliesToStr.includes("LegalForm.IP")) {
            applicabilityConfig.legalForms = ['IP'];
        }
        if (appliesToStr.includes("!== LegalForm.IP") || appliesToStr.includes("!== 'IP'")) {
            applicabilityConfig.legalForms = ['OOO', 'AO'];
        }
    }
    if (appliesToStr.includes('taxSystem')) {
        applicabilityConfig.allClients = false;
        if (appliesToStr.includes('USN')) {
            applicabilityConfig.taxSystems = ['USN6', 'USN15'];
        }
    }

    return {
        id: rule.id,
        source: 'system',
        storageCategory: rule.category || 'налоговые',
        isActive: true,
        version: 1,

        taskType: rule.taskType || 'прочее',
        shortTitle: rule.shortTitle || rule.id,
        shortDescription: rule.shortDescription || rule.titleTemplate,
        description: rule.description || '',
        titleTemplate: rule.titleTemplate,
        lawReference: rule.lawReference || null,

        periodicity: rule.periodicity,
        periodType: (rule.dateConfig.monthOffset || rule.dateConfig.quarterMonthOffset) ? 'past' : 'current',

        dateConfig: rule.dateConfig,
        dueDateRule: rule.dueDateRule,

        applicabilityConfig,
        excludeMonths: rule.excludeMonths || null,

        createdBy: 'system'
    };
};

/**
 * Загружает правила из taskRules.ts (CommonJS совместимый вариант)
 * Возвращает массив объектов правил
 */
const loadTaskRulesFromCode = () => {
    // Так как taskRules.ts — TypeScript, используем готовый JSON-экспорт
    // Или парсим вручную. Для простоты, создадим массив напрямую.

    // Этот массив соответствует TASK_RULES из taskRules.ts
    return [
        // === СОТРУДНИКИ: Ежемесячные ===
        {
            id: 'EMPLOYEE_NDFL_NOTIFICATION_1',
            titleTemplate: 'Уведомление по НДФЛ (период с 1 по 22 {monthNameGenitive})',
            taskType: 'Уведомление',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'НДФЛ уведомление (1-22)',
            shortDescription: 'Уведомление по НДФЛ за период с 1 по 22 число месяца',
            description: 'Уведомление об исчисленных суммах НДФЛ за период с 1 по 22 число месяца.',
            lawReference: 'НК РФ ст. 58 п. 9',
            dateConfig: { day: 25, monthOffset: 0 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_NDFL_PAYMENT_1',
            titleTemplate: 'Уплата НДФЛ (период с 1 по 22 {monthNameGenitive})',
            taskType: 'Уплата',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'НДФЛ оплата (1-22)',
            shortDescription: 'Уплата НДФЛ за период с 1 по 22 число месяца',
            description: 'Уплата НДФЛ, удержанного за период с 1 по 22 число месяца.',
            lawReference: 'НК РФ ст. 226 п. 6',
            dateConfig: { day: 28, monthOffset: 0 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_NDFL_NOTIFICATION_2',
            titleTemplate: 'Уведомление по НДФЛ (период с 23 по {lastDayOfMonth} {monthNameGenitive})',
            taskType: 'Уведомление',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'НДФЛ уведомление (23-конец)',
            shortDescription: 'Уведомление по НДФЛ за период с 23 по конец месяца',
            description: 'Уведомление об исчисленных суммах НДФЛ за период с 23 по последний день месяца.',
            lawReference: 'НК РФ ст. 58 п. 9',
            dateConfig: { day: 3, monthOffset: 1 },
            dueDateRule: 'next_business_day',
            excludeMonths: [11],
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_NDFL_PAYMENT_2',
            titleTemplate: 'Уплата НДФЛ (период с 23 по {lastDayOfMonth} {monthNameGenitive})',
            taskType: 'Уплата',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'НДФЛ оплата (23-конец)',
            shortDescription: 'Уплата НДФЛ за период с 23 по конец месяца',
            description: 'Уплата НДФЛ за период с 23 по последний день месяца.',
            lawReference: 'НК РФ ст. 226 п. 6',
            dateConfig: { day: 5, monthOffset: 1 },
            dueDateRule: 'next_business_day',
            excludeMonths: [11],
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_INSURANCE_NOTIFICATION',
            titleTemplate: 'Уведомление по Страховым взносам за {monthName}',
            taskType: 'Уведомление',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'СВ уведомление',
            shortDescription: 'Уведомление по страховым взносам за месяц',
            description: 'Уведомление об исчисленных суммах страховых взносов за предыдущий месяц.',
            lawReference: 'НК РФ ст. 58 п. 9',
            dateConfig: { day: 25, monthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_INSURANCE_PAYMENT',
            titleTemplate: 'Уплата Страховых взносов за {monthName}',
            taskType: 'Уплата',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'СВ оплата',
            shortDescription: 'Уплата страховых взносов за месяц',
            description: 'Уплата страховых взносов за предыдущий месяц.',
            lawReference: 'НК РФ ст. 431 п. 3',
            dateConfig: { day: 28, monthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_PSV_REPORT',
            titleTemplate: 'Персонифицированные сведения о физ. лицах за {monthName}',
            taskType: 'Отчет',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'Персонифицированные сведения',
            shortDescription: 'Сведения о застрахованных лицах за месяц',
            description: 'Сведения о застрахованных лицах.',
            lawReference: 'ФЗ-27 ст. 11',
            dateConfig: { day: 25, monthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_TRAUMATISM_PAYMENT',
            titleTemplate: 'Уплата взносов на травматизм за {monthName}',
            taskType: 'Уплата',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'Травматизм оплата',
            shortDescription: 'Уплата взносов на травматизм за месяц',
            description: 'Уплата страховых взносов на травматизм.',
            lawReference: 'ФЗ-125 ст. 22',
            dateConfig: { day: 15, monthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },

        // === СОТРУДНИКИ: Ежеквартальные ===
        {
            id: 'EMPLOYEE_6NDFL_REPORT',
            titleTemplate: 'Отчет 6-НДФЛ за {quarter} квартал',
            taskType: 'Отчет',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: '6-НДФЛ',
            shortDescription: 'Отчёт 6-НДФЛ за квартал',
            description: 'Расчет сумм НДФЛ (форма 6-НДФЛ).',
            lawReference: 'НК РФ ст. 230 п. 2',
            dateConfig: { day: 25, quarterMonthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_RSV_REPORT',
            titleTemplate: 'РСВ (Расчет по страховым взносам) за {quarter} квартал',
            taskType: 'Отчет',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: 'РСВ',
            shortDescription: 'Расчёт по страховым взносам за квартал',
            description: 'Расчет по страховым взносам.',
            lawReference: 'НК РФ ст. 431 п. 7',
            dateConfig: { day: 25, quarterMonthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_EFS1_TRAUMA_REPORT',
            titleTemplate: 'Отчет ЕФС-1 (травматизм) за {quarter} квартал',
            taskType: 'Отчет',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: 'ЕФС-1 травматизм',
            shortDescription: 'Сведения по травматизму за квартал',
            description: 'Сведения о взносах на травматизм (ЕФС-1).',
            lawReference: 'ФЗ-125 ст. 24',
            dateConfig: { day: 25, quarterMonthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },

        // === СОТРУДНИКИ: Ежегодные ===
        {
            id: 'EMPLOYEE_EFS1_STAZH_REPORT',
            titleTemplate: 'Отчет ЕФС-1 (сведения о стаже) за {year-1} год',
            taskType: 'Отчет',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'ЕФС-1 стаж',
            shortDescription: 'Сведения о стаже за год',
            description: 'Сведения о страховом стаже (ЕФС-1).',
            lawReference: 'ФЗ-27 ст. 11',
            dateConfig: { day: 25, month: 0 },
            dueDateRule: 'next_business_day',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_NDFL_NOTIFICATION_2_DECEMBER',
            titleTemplate: 'Уведомление по НДФЛ (период с 23 по 31 декабря)',
            taskType: 'Уведомление',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'НДФЛ декабрь уведомление',
            shortDescription: 'Уведомление по НДФЛ за 23-31 декабря',
            description: 'Уведомление по НДФЛ за период с 23 по 31 декабря.',
            lawReference: 'НК РФ ст. 58 п. 9',
            dateConfig: { day: 0, month: 11, specialRule: 'LAST_WORKING_DAY_OF_YEAR' },
            dueDateRule: 'no_transfer',
            requiresEmployees: true
        },
        {
            id: 'EMPLOYEE_NDFL_PAYMENT_2_DECEMBER',
            titleTemplate: 'Уплата НДФЛ (период с 23 по 31 декабря)',
            taskType: 'Уплата',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'НДФЛ декабрь оплата',
            shortDescription: 'Уплата НДФЛ за 23-31 декабря',
            description: 'Уплата НДФЛ за период с 23 по 31 декабря.',
            lawReference: 'НК РФ ст. 226 п. 6',
            dateConfig: { day: 0, month: 11, specialRule: 'LAST_WORKING_DAY_OF_YEAR' },
            dueDateRule: 'no_transfer',
            requiresEmployees: true
        },

        // === УСН ===
        {
            id: 'USN_AVANS_NOTIFICATION',
            titleTemplate: 'Уведомление об авансе по УСН за {quarter} квартал',
            taskType: 'Уведомление',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: 'УСН аванс уведомление',
            shortDescription: 'Уведомление об авансе по УСН за квартал',
            description: 'Уведомление об исчисленной сумме авансового платежа по УСН.',
            lawReference: 'НК РФ ст. 58 п. 9',
            dateConfig: { day: 25, quarterMonthOffset: 1 },
            dueDateRule: 'next_business_day',
            taxSystems: ['USN6', 'USN15']
        },
        {
            id: 'USN_AVANS_PAYMENT',
            titleTemplate: 'Уплата аванса по УСН за {quarter} квартал',
            taskType: 'Уплата',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: 'УСН аванс оплата',
            shortDescription: 'Уплата аванса по УСН за квартал',
            description: 'Уплата авансового платежа по УСН.',
            lawReference: 'НК РФ ст. 346.21 п. 7',
            dateConfig: { day: 28, quarterMonthOffset: 1 },
            dueDateRule: 'next_business_day',
            taxSystems: ['USN6', 'USN15']
        },
        {
            id: 'USN_YEAR_DECLARATION_OOO',
            titleTemplate: 'Декларация по УСН за {year-1} год',
            taskType: 'Отчет',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'УСН декларация (ООО)',
            shortDescription: 'Декларация по УСН для организаций за год',
            description: 'Годовая декларация по УСН для организаций.',
            lawReference: 'НК РФ ст. 346.23 п. 1',
            dateConfig: { day: 25, month: 2 },
            dueDateRule: 'next_business_day',
            taxSystems: ['USN6', 'USN15'],
            legalForms: ['OOO', 'AO']
        },
        {
            id: 'USN_YEAR_PAYMENT_OOO',
            titleTemplate: 'Уплата налога по УСН за {year-1} год',
            taskType: 'Уплата',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'УСН оплата (ООО)',
            shortDescription: 'Уплата налога УСН для организаций за год',
            description: 'Уплата налога по УСН за год для организаций.',
            lawReference: 'НК РФ ст. 346.21 п. 7',
            dateConfig: { day: 28, month: 2 },
            dueDateRule: 'next_business_day',
            taxSystems: ['USN6', 'USN15'],
            legalForms: ['OOO', 'AO']
        },
        {
            id: 'USN_YEAR_DECLARATION_IP',
            titleTemplate: 'Декларация по УСН за {year-1} год',
            taskType: 'Отчет',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'УСН декларация (ИП)',
            shortDescription: 'Декларация по УСН для ИП за год',
            description: 'Годовая декларация по УСН для ИП.',
            lawReference: 'НК РФ ст. 346.23 п. 2',
            dateConfig: { day: 25, month: 3 },
            dueDateRule: 'next_business_day',
            taxSystems: ['USN6', 'USN15'],
            legalForms: ['IP']
        },
        {
            id: 'USN_YEAR_PAYMENT_IP',
            titleTemplate: 'Уплата налога по УСН за {year-1} год',
            taskType: 'Уплата',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'УСН оплата (ИП)',
            shortDescription: 'Уплата налога УСН для ИП за год',
            description: 'Уплата налога по УСН за год для ИП.',
            lawReference: 'НК РФ ст. 346.21 п. 7',
            dateConfig: { day: 28, month: 3 },
            dueDateRule: 'next_business_day',
            taxSystems: ['USN6', 'USN15'],
            legalForms: ['IP']
        },

        // === НДС ===
        {
            id: 'NDS_DECLARATION',
            titleTemplate: 'Декларация по НДС за {quarter} квартал',
            taskType: 'Отчет',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: 'НДС декларация',
            shortDescription: 'Декларация по НДС за квартал',
            description: 'Налоговая декларация по НДС.',
            lawReference: 'НК РФ ст. 174 п. 5',
            dateConfig: { day: 25, quarterMonthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresNds: true
        },
        {
            id: 'NDS_PAYMENT_1',
            titleTemplate: 'Уплата 1/3 НДС за {quarter} квартал',
            taskType: 'Уплата',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: 'НДС 1/3',
            shortDescription: 'Уплата 1/3 НДС за квартал',
            description: 'Уплата 1/3 суммы НДС за истекший квартал.',
            lawReference: 'НК РФ ст. 174 п. 1',
            dateConfig: { day: 28, quarterMonthOffset: 1 },
            dueDateRule: 'next_business_day',
            requiresNds: true
        },
        {
            id: 'NDS_PAYMENT_2',
            titleTemplate: 'Уплата 2/3 НДС за {quarter} квартал',
            taskType: 'Уплата',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: 'НДС 2/3',
            shortDescription: 'Уплата 2/3 НДС за квартал',
            description: 'Уплата 2/3 суммы НДС за истекший квартал.',
            lawReference: 'НК РФ ст. 174 п. 1',
            dateConfig: { day: 28, quarterMonthOffset: 2 },
            dueDateRule: 'next_business_day',
            requiresNds: true
        },
        {
            id: 'NDS_PAYMENT_3',
            titleTemplate: 'Уплата 3/3 НДС за {quarter} квартал',
            taskType: 'Уплата',
            periodicity: 'quarterly',
            category: 'налоговые',
            shortTitle: 'НДС 3/3',
            shortDescription: 'Уплата 3/3 НДС за квартал',
            description: 'Уплата последней трети НДС за истекший квартал.',
            lawReference: 'НК РФ ст. 174 п. 1',
            dateConfig: { day: 28, quarterMonthOffset: 3 },
            dueDateRule: 'next_business_day',
            requiresNds: true
        },

        // === ИП ===
        {
            id: 'IP_FIXED_INSURANCE_PAYMENT',
            titleTemplate: 'Уплата фиксированных взносов за себя за {year} год',
            taskType: 'Уплата',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'ИП фикс. взносы',
            shortDescription: 'Фиксированные страховые взносы ИП за себя',
            description: 'Уплата фиксированных страховых взносов ИП за себя.',
            lawReference: 'НК РФ ст. 432 п. 2',
            dateConfig: { day: 28, month: 11 },
            dueDateRule: 'next_business_day',
            legalForms: ['IP']
        },
        {
            id: 'IP_1_PERCENT_INSURANCE_PAYMENT',
            titleTemplate: 'Уплата 1% взносов (доход свыше 300 тыс.) за {year-1} год',
            taskType: 'Уплата',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'ИП 1% с дохода',
            shortDescription: '1% с дохода свыше 300 тыс. руб.',
            description: 'Уплата страховых взносов ИП в размере 1% с дохода, превышающего 300 000 рублей.',
            lawReference: 'НК РФ ст. 432 п. 2',
            dateConfig: { day: 1, month: 6 },
            dueDateRule: 'next_business_day',
            legalForms: ['IP']
        },

        // === ОСНО: Налог на прибыль (ООО/АО) ===
        {
            id: 'PROFIT_TAX_YEAR_DECLARATION',
            titleTemplate: 'Декларация по налогу на прибыль за {year-1} год',
            taskType: 'Отчет',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'Налог на прибыль годовая',
            shortDescription: 'Декларация по налогу на прибыль за год',
            description: 'Годовая налоговая декларация по налогу на прибыль. Представляется не позднее 25 марта.',
            lawReference: 'НК РФ ст. 289 п. 4',
            dateConfig: { day: 25, month: 2 },
            dueDateRule: 'next_business_day',
            taxSystems: ['OSNO'],
            legalForms: ['OOO', 'AO']
        },
        {
            id: 'PROFIT_TAX_YEAR_PAYMENT',
            titleTemplate: 'Уплата налога на прибыль за {year-1} год',
            taskType: 'Уплата',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'Налог на прибыль оплата',
            shortDescription: 'Уплата налога на прибыль за год',
            description: 'Уплата налога на прибыль за налоговый период. Уплачивается не позднее 28 марта.',
            lawReference: 'НК РФ ст. 287 п. 1',
            dateConfig: { day: 28, month: 2 },
            dueDateRule: 'next_business_day',
            taxSystems: ['OSNO'],
            legalForms: ['OOO', 'AO']
        },
        // Квартальные декларации — только для ежеквартальных авансов
        {
            id: 'PROFIT_TAX_Q1_DECLARATION',
            titleTemplate: 'Декларация по налогу на прибыль за 1 квартал {year}',
            taskType: 'Отчет',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'Налог на прибыль 1кв',
            shortDescription: 'Декларация за 1 квартал',
            description: 'Налоговая декларация по налогу на прибыль за 1 квартал. Представляется не позднее 25 апреля.',
            lawReference: 'НК РФ ст. 289 п. 3',
            dateConfig: { day: 25, month: 3 },
            dueDateRule: 'next_business_day',
            taxSystems: ['OSNO'],
            legalForms: ['OOO', 'AO'],
            profitAdvancePeriodicity: 'quarterly'
        },
        {
            id: 'PROFIT_TAX_H1_DECLARATION',
            titleTemplate: 'Декларация по налогу на прибыль за полугодие {year}',
            taskType: 'Отчет',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'Налог на прибыль полугодие',
            shortDescription: 'Декларация за полугодие',
            description: 'Налоговая декларация по налогу на прибыль за полугодие. Представляется не позднее 25 июля.',
            lawReference: 'НК РФ ст. 289 п. 3',
            dateConfig: { day: 25, month: 6 },
            dueDateRule: 'next_business_day',
            taxSystems: ['OSNO'],
            legalForms: ['OOO', 'AO'],
            profitAdvancePeriodicity: 'quarterly'
        },
        {
            id: 'PROFIT_TAX_9M_DECLARATION',
            titleTemplate: 'Декларация по налогу на прибыль за 9 месяцев {year}',
            taskType: 'Отчет',
            periodicity: 'yearly',
            category: 'налоговые',
            shortTitle: 'Налог на прибыль 9мес',
            shortDescription: 'Декларация за 9 месяцев',
            description: 'Налоговая декларация по налогу на прибыль за 9 месяцев. Представляется не позднее 25 октября.',
            lawReference: 'НК РФ ст. 289 п. 3',
            dateConfig: { day: 25, month: 9 },
            dueDateRule: 'next_business_day',
            taxSystems: ['OSNO'],
            legalForms: ['OOO', 'AO'],
            profitAdvancePeriodicity: 'quarterly'
        },
        // Ежемесячные авансы — только для ежемесячных авансов
        {
            id: 'PROFIT_TAX_MONTHLY_ADVANCE',
            titleTemplate: 'Ежемесячный аванс по налогу на прибыль за {monthName}',
            taskType: 'Уплата',
            periodicity: 'monthly',
            category: 'налоговые',
            shortTitle: 'Прибыль аванс',
            shortDescription: 'Ежемесячный аванс по налогу на прибыль',
            description: 'Уплата ежемесячного авансового платежа по налогу на прибыль. Уплачивается не позднее 28 числа текущего месяца.',
            lawReference: 'НК РФ ст. 287 п. 1',
            dateConfig: { day: 28, monthOffset: 0 },
            dueDateRule: 'next_business_day',
            taxSystems: ['OSNO'],
            legalForms: ['OOO', 'AO'],
            profitAdvancePeriodicity: 'monthly'
        }
    ];
};

/**
 * Выполняет миграцию системных правил в Master DB
 */
const migrateSystemRulesToMasterDb = () => {
    const masterDb = getMasterRulesDatabase();
    const rules = loadTaskRulesFromCode();

    console.log(`[Migration] Starting migration of ${rules.length} system rules to Master DB...`);

    let inserted = 0;
    let skipped = 0;

    for (const rule of rules) {
        if (masterDb.exists(rule.id)) {
            skipped++;
            continue;
        }

        const dbRule = {
            id: rule.id,
            source: 'system',
            storageCategory: rule.category || 'налоговые',
            isActive: true,
            version: 1,

            taskType: rule.taskType,
            shortTitle: rule.shortTitle,
            shortDescription: rule.shortDescription,
            description: rule.description,
            titleTemplate: rule.titleTemplate,
            lawReference: rule.lawReference,

            periodicity: rule.periodicity,
            periodType: (rule.dateConfig.monthOffset || rule.dateConfig.quarterMonthOffset) ? 'past' : 'current',

            dateConfig: rule.dateConfig,
            dueDateRule: rule.dueDateRule,

            applicabilityConfig: {
                allClients: !rule.requiresEmployees && !rule.requiresNds && !rule.legalForms && !rule.taxSystems && !rule.profitAdvancePeriodicity,
                legalForms: rule.legalForms || null,
                taxSystems: rule.taxSystems || null,
                requiresEmployees: rule.requiresEmployees || false,
                requiresNds: rule.requiresNds || false,
                profitAdvancePeriodicity: rule.profitAdvancePeriodicity || null
            },

            excludeMonths: rule.excludeMonths || null,
            createdBy: 'system'
        };

        masterDb.create(dbRule);
        inserted++;
    }

    console.log(`[Migration] Complete: ${inserted} inserted, ${skipped} skipped (already exist)`);
    return { inserted, skipped, total: rules.length };
};

module.exports = {
    loadTaskRulesFromCode,
    migrateSystemRulesToMasterDb,
    convertTaskRuleToDbFormat
};
