// server/routes/servicesRoutes.js
// API маршруты для услуг и комплексов

const express = require('express');
const router = express.Router();

let getServicesDatabase = null;
try {
    const servicesDb = require('../database/servicesDatabase');
    getServicesDatabase = servicesDb.getServicesDatabase;
} catch (error) {
    console.error('[ServicesRoutes] Failed to load servicesDatabase:', error);
}

// ============================================
// УСЛУГИ
// ============================================

// GET /api/:tenantId/services — все услуги
router.get('/api/:tenantId/services', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId } = req.params;
        const includeArchived = req.query.includeArchived === 'true';
        const db = getServicesDatabase(tenantId);
        const services = db.getAllServices(includeArchived);
        res.json(services);
    } catch (error) {
        console.error('[Server] Error getting services:', error);
        res.status(500).json({ error: 'Failed to get services' });
    }
});

// GET /api/:tenantId/services/:id — одна услуга
router.get('/api/:tenantId/services/:id', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId, id } = req.params;
        const db = getServicesDatabase(tenantId);
        const service = db.getServiceById(id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        res.json(service);
    } catch (error) {
        console.error('[Server] Error getting service:', error);
        res.status(500).json({ error: 'Failed to get service' });
    }
});

// POST /api/:tenantId/services — создать/обновить услугу
router.post('/api/:tenantId/services', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId } = req.params;
        const data = req.body;
        const db = getServicesDatabase(tenantId);

        let result;
        if (data.id) {
            const existing = db.getServiceById(data.id);
            if (existing) {
                result = db.updateService(data.id, data);
                console.log(`[Server] Service updated: ${result.id}`);
            } else {
                result = db.createService(data);
                console.log(`[Server] Service created: ${result.id}`);
            }
        } else {
            result = db.createService(data);
            console.log(`[Server] Service created: ${result.id}`);
        }

        res.json(result);
    } catch (error) {
        console.error('[Server] Error saving service:', error);
        res.status(500).json({ error: 'Failed to save service', details: error.message });
    }
});

// DELETE /api/:tenantId/services/:id — архивировать услугу
router.delete('/api/:tenantId/services/:id', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId, id } = req.params;
        const db = getServicesDatabase(tenantId);
        const result = db.archiveService(id);
        console.log(`[Server] Service archived: ${id}`);
        res.json(result);
    } catch (error) {
        console.error('[Server] Error archiving service:', error);
        res.status(500).json({ error: 'Failed to archive service' });
    }
});

// POST /api/:tenantId/services/:id/restore — восстановить из архива
router.post('/api/:tenantId/services/:id/restore', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId, id } = req.params;
        const db = getServicesDatabase(tenantId);
        const result = db.restoreService(id);
        console.log(`[Server] Service restored: ${id}`);
        res.json(result);
    } catch (error) {
        console.error('[Server] Error restoring service:', error);
        res.status(500).json({ error: 'Failed to restore service' });
    }
});

// ============================================
// КОМПЛЕКСЫ (ПАКЕТЫ)
// ============================================

// GET /api/:tenantId/packages — все комплексы
router.get('/api/:tenantId/packages', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId } = req.params;
        const includeArchived = req.query.includeArchived === 'true';
        const db = getServicesDatabase(tenantId);
        const packages = db.getAllPackages(includeArchived);
        res.json(packages);
    } catch (error) {
        console.error('[Server] Error getting packages:', error);
        res.status(500).json({ error: 'Failed to get packages' });
    }
});

// GET /api/:tenantId/packages/:id — один комплекс
router.get('/api/:tenantId/packages/:id', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId, id } = req.params;
        const db = getServicesDatabase(tenantId);
        const pkg = db.getPackageById(id);
        if (!pkg) return res.status(404).json({ error: 'Package not found' });
        res.json(pkg);
    } catch (error) {
        console.error('[Server] Error getting package:', error);
        res.status(500).json({ error: 'Failed to get package' });
    }
});

// POST /api/:tenantId/packages — создать/обновить комплекс
router.post('/api/:tenantId/packages', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId } = req.params;
        const data = req.body;
        const db = getServicesDatabase(tenantId);

        let result;
        if (data.id) {
            const existing = db.getPackageById(data.id);
            if (existing) {
                result = db.updatePackage(data.id, data);
                console.log(`[Server] Package updated: ${result.id}`);
            } else {
                result = db.createPackage(data);
                console.log(`[Server] Package created: ${result.id}`);
            }
        } else {
            result = db.createPackage(data);
            console.log(`[Server] Package created: ${result.id}`);
        }

        res.json(result);
    } catch (error) {
        console.error('[Server] Error saving package:', error);
        res.status(500).json({ error: 'Failed to save package', details: error.message });
    }
});

// DELETE /api/:tenantId/packages/:id — архивировать комплекс
router.delete('/api/:tenantId/packages/:id', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId, id } = req.params;
        const db = getServicesDatabase(tenantId);
        const result = db.archivePackage(id);
        console.log(`[Server] Package archived: ${id}`);
        res.json(result);
    } catch (error) {
        console.error('[Server] Error archiving package:', error);
        res.status(500).json({ error: 'Failed to archive package' });
    }
});

// POST /api/:tenantId/packages/:id/restore — восстановить из архива
router.post('/api/:tenantId/packages/:id/restore', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId, id } = req.params;
        const db = getServicesDatabase(tenantId);
        const result = db.restorePackage(id);
        console.log(`[Server] Package restored: ${id}`);
        res.json(result);
    } catch (error) {
        console.error('[Server] Error restoring package:', error);
        res.status(500).json({ error: 'Failed to restore package' });
    }
});

// GET /api/:tenantId/services-stats — статистика
router.get('/api/:tenantId/services-stats', (req, res) => {
    if (!getServicesDatabase) {
        return res.status(503).json({ error: 'Services database not available' });
    }
    try {
        const { tenantId } = req.params;
        const db = getServicesDatabase(tenantId);
        const stats = db.getStats();
        res.json(stats);
    } catch (error) {
        console.error('[Server] Error getting services stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
