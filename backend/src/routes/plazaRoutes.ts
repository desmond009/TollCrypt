import { Router, Request, Response } from 'express';
import { PlazaService, PlazaSearchFilters, PlazaProximitySearch } from '../services/plazaService';
import { VehicleCategory } from '../models/TollPlaza';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route POST /api/plazas
 * @desc Create a new toll plaza
 * @access Private (Admin only)
 */
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const plazaData = req.body;
    const plaza = await PlazaService.createPlaza(plazaData);
    
    res.status(201).json({
      success: true,
      message: 'Plaza created successfully',
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
 * @route GET /api/plazas
 * @desc Get all plazas with optional filters
 * @access Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      regionCode,
      status,
      travelDirection,
      paymentMethod,
      is24x7,
      minLanes,
      maxLanes,
      page = 1,
      limit = 10
    } = req.query;

    const filters: PlazaSearchFilters = {};
    
    if (regionCode) filters.regionCode = regionCode as string;
    if (status) filters.status = status as any;
    if (travelDirection) filters.travelDirection = travelDirection as any;
    if (paymentMethod) filters.paymentMethod = paymentMethod as any;
    if (is24x7 !== undefined) filters.is24x7 = is24x7 === 'true';
    if (minLanes) filters.minLanes = parseInt(minLanes as string);
    if (maxLanes) filters.maxLanes = parseInt(maxLanes as string);

    const result = await PlazaService.searchPlazas(
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
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
 * @route GET /api/plazas/proximity
 * @desc Find plazas by proximity to coordinates
 * @access Public
 */
router.get('/proximity', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radiusInKm = 10, maxResults = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const searchParams: PlazaProximitySearch = {
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      radiusInKm: parseFloat(radiusInKm as string),
      maxResults: parseInt(maxResults as string)
    };

    const plazas = await PlazaService.findPlazasByProximity(searchParams);

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
 * @route GET /api/plazas/:uniqueId
 * @desc Get plaza by unique ID
 * @access Public
 */
router.get('/:uniqueId', async (req: Request, res: Response) => {
  try {
    const { uniqueId } = req.params;
    const plaza = await PlazaService.getPlazaByUniqueId(uniqueId);

    if (!plaza) {
      return res.status(404).json({
        success: false,
        message: 'Plaza not found'
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
 * @route PUT /api/plazas/:uniqueId
 * @desc Update plaza
 * @access Private (Admin only)
 */
router.put('/:uniqueId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { uniqueId } = req.params;
    const updateData = req.body;

    const plaza = await PlazaService.updatePlaza(uniqueId, updateData);

    if (!plaza) {
      return res.status(404).json({
        success: false,
        message: 'Plaza not found'
      });
    }

    res.json({
      success: true,
      message: 'Plaza updated successfully',
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
 * @route DELETE /api/plazas/:uniqueId
 * @desc Delete plaza
 * @access Private (Super Admin only)
 */
router.delete('/:uniqueId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { uniqueId } = req.params;
    
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can delete plazas'
      });
    }

    const deleted = await PlazaService.deletePlaza(uniqueId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Plaza not found'
      });
    }

    res.json({
      success: true,
      message: 'Plaza deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/plazas/:uniqueId/calculate-toll
 * @desc Calculate toll for a vehicle at a plaza
 * @access Public
 */
router.post('/:uniqueId/calculate-toll', async (req: Request, res: Response) => {
  try {
    const { uniqueId } = req.params;
    const { vehicleType, timestamp, discountCode } = req.body;

    if (!vehicleType || !Object.values(VehicleCategory).includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid vehicle type is required'
      });
    }

    const tollCalculation = await PlazaService.calculateToll(
      uniqueId,
      vehicleType,
      timestamp ? new Date(timestamp) : new Date(),
      discountCode
    );

    res.json({
      success: true,
      data: tollCalculation
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/plazas/:uniqueId/analytics
 * @desc Get plaza analytics
 * @access Private (Admin only)
 */
router.get('/:uniqueId/analytics', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { uniqueId } = req.params;
    const { period = 'daily' } = req.query;

    const analytics = await PlazaService.getPlazaAnalytics(
      uniqueId,
      period as 'daily' | 'weekly' | 'monthly'
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route PUT /api/plazas/:uniqueId/analytics
 * @desc Update plaza analytics
 * @access Private (Admin only)
 */
router.put('/:uniqueId/analytics', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { uniqueId } = req.params;
    const analyticsUpdate = req.body;

    const plaza = await PlazaService.updatePlazaAnalytics(uniqueId, analyticsUpdate);

    if (!plaza) {
      return res.status(404).json({
        success: false,
        message: 'Plaza not found'
      });
    }

    res.json({
      success: true,
      message: 'Analytics updated successfully',
      data: plaza.analytics
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/plazas/search/text
 * @desc Search plazas by text
 * @access Public
 */
router.get('/search/text', async (req: Request, res: Response) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const plazas = await PlazaService.searchPlazas(
      {},
      parseInt(page as string),
      parseInt(limit as string)
    );

    // Filter results by text search (this would be better with MongoDB text search)
    const filteredPlazas = plazas.plazas.filter(plaza => 
      plaza.identification.name.toLowerCase().includes((q as string).toLowerCase()) ||
      plaza.identification.operatorName.toLowerCase().includes((q as string).toLowerCase()) ||
      plaza.location.physicalAddress.city.toLowerCase().includes((q as string).toLowerCase()) ||
      plaza.location.physicalAddress.state.toLowerCase().includes((q as string).toLowerCase()) ||
      plaza.location.nearestLandmark.toLowerCase().includes((q as string).toLowerCase())
    );

    res.json({
      success: true,
      data: {
        plazas: filteredPlazas,
        total: filteredPlazas.length,
        page: parseInt(page as string),
        totalPages: Math.ceil(filteredPlazas.length / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
