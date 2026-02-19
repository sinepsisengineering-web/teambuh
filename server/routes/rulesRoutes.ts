// server/routes/rulesRoutes.ts
// API маршруты для работы со справочником правил

import { Router, Request, Response } from 'express';
import { getTenantRulesDatabase } from '../database/rulesDatabase';

const router = Router();

// Получить все правила
router.get('/:tenantId/rules', (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const db = getTenantRulesDatabase(tenantId);
        const rules = db.getAll();
        res.json(rules);
    } catch (error) {
        console.error('[RulesRoutes] Error getting rules:', error);
        res.status(500).json({ error: 'Failed to get rules' });
    }
});

// Получить правило по ID
router.get('/:tenantId/rules/:ruleId', (req: Request, res: Response) => {
    try {
        const { tenantId, ruleId } = req.params;
        const db = getTenantRulesDatabase(tenantId);
        const rule = db.getById(ruleId);

        if (!rule) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json(rule);
    } catch (error) {
        console.error('[RulesRoutes] Error getting rule:', error);
        res.status(500).json({ error: 'Failed to get rule' });
    }
});

// Получить правила по категории
router.get('/:tenantId/rules/category/:category', (req: Request, res: Response) => {
    try {
        const { tenantId, category } = req.params;
        const db = getTenantRulesDatabase(tenantId);
        const rules = db.getByCategory(category);
        res.json(rules);
    } catch (error) {
        console.error('[RulesRoutes] Error getting rules by category:', error);
        res.status(500).json({ error: 'Failed to get rules by category' });
    }
});

// Создать правило
router.post('/:tenantId/rules', (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const ruleData = req.body;

        // Валидация
        if (!ruleData.id || !ruleData.shortTitle) {
            return res.status(400).json({ error: 'Rule ID and shortTitle are required' });
        }

        const db = getTenantRulesDatabase(tenantId);
        const rule = db.create(ruleData);

        console.log(`[RulesRoutes] Rule created: ${rule.id}`);
        res.status(201).json(rule);
    } catch (error) {
        console.error('[RulesRoutes] Error creating rule:', error);
        res.status(500).json({ error: 'Failed to create rule' });
    }
});

// Массовое создание правил (для начальной загрузки/миграции)
router.post('/:tenantId/rules/bulk', (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { rules } = req.body;

        if (!Array.isArray(rules)) {
            return res.status(400).json({ error: 'Rules must be an array' });
        }

        const db = getTenantRulesDatabase(tenantId);
        let count = 0;

        for (const rule of rules) {
            try {
                // Проверяем существует ли уже правило
                const existing = db.getById(rule.id);
                if (!existing) {
                    db.create(rule);
                    count++;
                }
            } catch (e) {
                console.error(`[RulesRoutes] Error creating rule ${rule.id}:`, e);
            }
        }

        console.log(`[RulesRoutes] Bulk created ${count} rules for tenant ${tenantId}`);
        res.status(201).json({ created: count });
    } catch (error) {
        console.error('[RulesRoutes] Error bulk creating rules:', error);
        res.status(500).json({ error: 'Failed to create rules' });
    }
});

// Обновить правило
router.put('/:tenantId/rules/:ruleId', (req: Request, res: Response) => {
    try {
        const { tenantId, ruleId } = req.params;
        const updates = req.body;

        const db = getTenantRulesDatabase(tenantId);
        const rule = db.update(ruleId, updates);

        if (!rule) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        console.log(`[RulesRoutes] Rule updated: ${ruleId}`);
        res.json(rule);
    } catch (error) {
        console.error('[RulesRoutes] Error updating rule:', error);
        res.status(500).json({ error: 'Failed to update rule' });
    }
});

// Удалить правило (soft delete)
router.delete('/:tenantId/rules/:ruleId', (req: Request, res: Response) => {
    try {
        const { tenantId, ruleId } = req.params;

        const db = getTenantRulesDatabase(tenantId);
        const success = db.delete(ruleId);

        if (!success) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        console.log(`[RulesRoutes] Rule deleted: ${ruleId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[RulesRoutes] Error deleting rule:', error);
        res.status(500).json({ error: 'Failed to delete rule' });
    }
});

// Получить статистику правил
router.get('/:tenantId/rules-stats', (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const db = getTenantRulesDatabase(tenantId);
        const rules = db.getAll();

        const stats = {
            total: rules.length,
            active: rules.filter((r: any) => r.isActive).length,
            byCategory: {} as Record<string, number>
        };

        for (const rule of rules) {
            const cat = rule.storageCategory || 'без категории';
            stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
        }

        res.json(stats);
    } catch (error) {
        console.error('[RulesRoutes] Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;
