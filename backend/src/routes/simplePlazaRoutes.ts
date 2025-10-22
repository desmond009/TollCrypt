import { Router, Request, Response } from 'express';
import { SimplePlazaService, SimplePlazaCreateData } from '../services/simplePlazaService';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/simple-plazas
 * @desc Get all simple plazas
 * @access Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const plazas = await SimplePlazaService.getAllSimplePlazas();
    
    res.json({
      success: true,
      data: plazas
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/simple-plazas/:id
 * @desc Get simple plaza by ID
 * @access Public
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const plaza = await SimplePlazaService.getSimplePlazaById(id);

    if (!plaza) {
      return res.status(404).json({
        success: false,
        message: 'Simple plaza not found'
      });
    }

    res.json({
      success: true,
      data: plaza
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/simple-plazas
 * @desc Create a new simple plaza
 * @access Private (Admin only)
 */
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const plazaData: SimplePlazaCreateData = req.body;
    const plaza = await SimplePlazaService.createSimplePlaza(plazaData);
    
    res.status(201).json({
      success: true,
      message: 'Simple plaza created successfully',
      data: plaza
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route PUT /api/simple-plazas/:id
 * @desc Update simple plaza
 * @access Private (Admin only)
 */
router.put('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const plaza = await SimplePlazaService.updateSimplePlaza(id, updateData);

    if (!plaza) {
      return res.status(404).json({
        success: false,
        message: 'Simple plaza not found'
      });
    }

    res.json({
      success: true,
      message: 'Simple plaza updated successfully',
      data: plaza
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/simple-plazas/:id
 * @desc Delete simple plaza
 * @access Private (Admin only)
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const deleted = await SimplePlazaService.deleteSimplePlaza(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Simple plaza not found'
      });
    }

    res.json({
      success: true,
      message: 'Simple plaza deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/simple-plazas/seed/predefined
 * @desc Seed simple plazas with predefined data
 * @access Private (Super Admin only)
 */
router.post('/seed/predefined', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can seed simple plazas'
      });
    }

    const result = await SimplePlazaService.seedPredefinedSimplePlazas();

    res.json({
      success: true,
      message: `Seeding completed. ${result.success} simple plazas created successfully, ${result.failed} failed.`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/simple-plazas/seed/custom
 * @desc Seed simple plazas with custom data
 * @access Private (Super Admin only)
 */
router.post('/seed/custom', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can seed simple plazas'
      });
    }

    const { plazas } = req.body;

    if (!plazas || !Array.isArray(plazas)) {
      return res.status(400).json({
        success: false,
        message: 'Plazas array is required'
      });
    }

    const result = await SimplePlazaService.seedSimplePlazas(plazas);

    res.json({
      success: true,
      message: `Seeding completed. ${result.success} simple plazas created successfully, ${result.failed} failed.`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/simple-plazas/seed/clear
 * @desc Clear all simple plazas
 * @access Private (Super Admin only)
 */
router.delete('/seed/clear', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can clear simple plazas'
      });
    }

    const result = await SimplePlazaService.clearAllSimplePlazas();

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} simple plazas successfully`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/simple-plazas/seed/stats
 * @desc Get simple plaza statistics
 * @access Private (Admin only)
 */
router.get('/seed/stats', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await SimplePlazaService.getSimplePlazaStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
