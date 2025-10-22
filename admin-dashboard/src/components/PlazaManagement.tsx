import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { format } from 'date-fns';
import './PlazaManagement.css';

interface Plaza {
  id: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'maintenance' | 'inactive';
  tollRates: {
    '2-wheeler': number;
    '4-wheeler': number;
    'car': number;
    'lcv': number;
    'hcv': number;
    'truck': number;
    'bus': number;
  };
  operatingHours: {
    start: string;
    end: string;
  };
  assignedOperators: string[];
  todayTransactions: number;
  todayRevenue: number;
  createdAt: string;
  updatedAt: string;
}

interface Operator {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface PlazaFormData {
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'maintenance' | 'inactive';
  tollRates: {
    '2-wheeler': number;
    '4-wheeler': number;
    'car': number;
    'lcv': number;
    'hcv': number;
    'truck': number;
    'bus': number;
  };
  operatingHours: {
    start: string;
    end: string;
  };
  assignedOperators: string[];
}

interface PlazaManagementProps {
  socket: any;
}

export const PlazaManagement: React.FC<PlazaManagementProps> = ({ socket }) => {
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlaza, setSelectedPlaza] = useState<Plaza | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlazaFormData>();

  const formData = watch();

  // Fetch plazas and operators data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [plazasResponse, operatorsResponse] = await Promise.all([
          api.get('/api/admin/plazas'),
          api.get('/api/admin/operators')
        ]);
        setPlazas(plazasResponse.data.data);
        setOperators(operatorsResponse.data.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Add dummy plazas if API fails
        const dummyPlazas = [
          {
            id: 'plaza-1',
            name: 'Mumbai-Pune Expressway - Plaza A',
            location: 'Mumbai-Pune Expressway, Mumbai, Maharashtra',
            coordinates: { lat: 19.076000, lng: 72.877700 },
            status: 'active' as const,
            tollRates: {
              '2-wheeler': 0.000100,
              '4-wheeler': 0.000250,
              'car': 0.000300,
              'lcv': 0.000500,
              'hcv': 0.001000,
              'truck': 0.001200,
              'bus': 0.000750
            },
            operatingHours: { start: '00:00', end: '23:59' },
            assignedOperators: [],
            todayTransactions: 156,
            todayRevenue: 0.0456,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'plaza-2',
            name: 'Delhi-Jaipur Highway - Plaza B',
            location: 'Delhi-Jaipur Highway, Delhi',
            coordinates: { lat: 28.6139, lng: 77.2090 },
            status: 'active' as const,
            tollRates: {
              '2-wheeler': 0.000080,
              '4-wheeler': 0.000200,
              'car': 0.000250,
              'lcv': 0.000400,
              'hcv': 0.000800,
              'truck': 0.001000,
              'bus': 0.000600
            },
            operatingHours: { start: '00:00', end: '23:59' },
            assignedOperators: [],
            todayTransactions: 203,
            todayRevenue: 0.0623,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'plaza-3',
            name: 'Bangalore-Mysore Highway - Plaza C',
            location: 'Bangalore-Mysore Highway, Bangalore, Karnataka',
            coordinates: { lat: 12.9716, lng: 77.5946 },
            status: 'active' as const,
            tollRates: {
              '2-wheeler': 0.000060,
              '4-wheeler': 0.000150,
              'car': 0.000200,
              'lcv': 0.000300,
              'hcv': 0.000600,
              'truck': 0.000800,
              'bus': 0.000450
            },
            operatingHours: { start: '00:00', end: '23:59' },
            assignedOperators: [],
            todayTransactions: 89,
            todayRevenue: 0.0234,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'plaza-4',
            name: 'Chennai-Pondicherry Road - Plaza D',
            location: 'Chennai-Pondicherry Road, Chennai, Tamil Nadu',
            coordinates: { lat: 13.0827, lng: 80.2707 },
            status: 'maintenance' as const,
            tollRates: {
              '2-wheeler': 0.000050,
              '4-wheeler': 0.000120,
              'car': 0.000180,
              'lcv': 0.000250,
              'hcv': 0.000500,
              'truck': 0.000700,
              'bus': 0.000400
            },
            operatingHours: { start: '06:00', end: '22:00' },
            assignedOperators: [],
            todayTransactions: 45,
            todayRevenue: 0.0123,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'plaza-5',
            name: 'Hyderabad-Vijayawada Express - Plaza E',
            location: 'Hyderabad-Vijayawada Express, Hyderabad, Telangana',
            coordinates: { lat: 17.3850, lng: 78.4867 },
            status: 'active' as const,
            tollRates: {
              '2-wheeler': 0.000070,
              '4-wheeler': 0.000180,
              'car': 0.000220,
              'lcv': 0.000350,
              'hcv': 0.000700,
              'truck': 0.000900,
              'bus': 0.000500
            },
            operatingHours: { start: '00:00', end: '23:59' },
            assignedOperators: [],
            todayTransactions: 134,
            todayRevenue: 0.0389,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        setPlazas(dummyPlazas);
        setOperators([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreatePlaza = async (data: PlazaFormData) => {
    try {
      const response = await api.post('/api/admin/plazas', data);
      setPlazas(prev => [...prev, response.data.data]);
      setShowModal(false);
      reset();
    } catch (error) {
      console.error('Failed to create plaza:', error);
    }
  };

  const handleUpdatePlaza = async (data: PlazaFormData) => {
    if (!selectedPlaza) return;

    try {
      const response = await api.put(`/api/admin/plazas/${selectedPlaza.id}`, data);
      setPlazas(prev => prev.map(plaza =>
        plaza.id === selectedPlaza.id ? response.data.data : plaza
      ));
      setShowModal(false);
      setSelectedPlaza(null);
      setIsEditing(false);
      reset();
    } catch (error) {
      console.error('Failed to update plaza:', error);
    }
  };

  const handleDeletePlaza = async (plazaId: string) => {
    if (!window.confirm('Are you sure you want to delete this plaza?')) return;

    try {
      await api.delete(`/api/admin/plazas/${plazaId}`);
      setPlazas(prev => prev.filter(plaza => plaza.id !== plazaId));
    } catch (error) {
      console.error('Failed to delete plaza:', error);
    }
  };

  const handleEditPlaza = (plaza: Plaza) => {
    setSelectedPlaza(plaza);
    setIsEditing(true);
    setShowModal(true);
    
    // Populate form with plaza data
    setValue('name', plaza.name);
    setValue('location', plaza.location);
    setValue('coordinates', plaza.coordinates);
    setValue('status', plaza.status);
    setValue('tollRates', plaza.tollRates);
    setValue('operatingHours', plaza.operatingHours);
    setValue('assignedOperators', plaza.assignedOperators);
  };

  const handleViewPlaza = (plaza: Plaza) => {
    setSelectedPlaza(plaza);
    setIsEditing(false);
    setShowModal(true);
  };

  const getStatusBadge = (status: Plaza['status']) => {
    const statusConfig = {
      active: { 
        color: 'bg-green-900/30 text-green-300 border-green-700', 
        icon: CheckCircleIcon,
        dotColor: 'bg-green-400'
      },
      maintenance: { 
        color: 'bg-yellow-900/30 text-yellow-300 border-yellow-700', 
        icon: ExclamationTriangleIcon,
        dotColor: 'bg-yellow-400'
      },
      inactive: { 
        color: 'bg-red-900/30 text-red-300 border-red-700', 
        icon: XCircleIcon,
        dotColor: 'bg-red-400'
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${config.color} shadow-sm`}>
        <div className={`w-2 h-2 ${config.dotColor} rounded-full mr-2 status-dot`}></div>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const vehicleTypes = [
    '2-wheeler',
    '4-wheeler',
    'car',
    'lcv',
    'hcv',
    'truck',
    'bus'
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-700 rounded-full animate-spin spinner"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-300">Loading plazas...</p>
          <p className="mt-2 text-sm text-gray-400">Please wait while we fetch the latest data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-300 to-indigo-300 bg-clip-text text-transparent font-serif">
                Toll Plaza Management
              </h1>
              <p className="mt-2 text-lg text-gray-300 font-medium">
                Manage toll plazas, rates, and operator assignments
              </p>
              <div className="mt-3 flex items-center text-sm text-gray-400">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="font-medium">{plazas.length} Active Plazas</span>
                </div>
                <div className="ml-4 flex items-center">
                  <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                  <span className="font-medium">
                    {plazas.reduce((sum, plaza) => sum + plaza.todayRevenue, 0).toFixed(4)} ETH Today
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowModal(true);
                setIsEditing(false);
                setSelectedPlaza(null);
                reset();
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New Plaza
            </button>
          </div>
        </div>

        {/* Plazas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {plazas.map((plaza) => (
            <div key={plaza.id} className="group bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 overflow-hidden card-hover">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-4 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <MapPinIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate font-serif">
                        {plaza.name}
                      </h3>
                      <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                        {plaza.location}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {getStatusBadge(plaza.status)}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 py-5">
                <div className="space-y-4">
                  {/* Today's Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-900/20 rounded-xl p-4 border border-green-700/50">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                            <ClockIcon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-xs font-medium text-green-300 uppercase tracking-wide">Transactions</p>
                          <p className="text-lg font-bold text-green-100">{plaza.todayTransactions}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-700/50">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <CurrencyDollarIcon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-xs font-medium text-blue-300 uppercase tracking-wide">Revenue</p>
                          <p className="text-lg font-bold text-blue-100">{plaza.todayRevenue.toFixed(4)} ETH</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operators */}
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                          <UsersIcon className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-300 uppercase tracking-wide">Assigned Operators</p>
                        <p className="text-lg font-bold text-white">{plaza.assignedOperators.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 bg-gray-700/50 border-t border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400 font-medium">
                    Created {format(new Date(plaza.createdAt), 'MMM d, yyyy')}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewPlaza(plaza)}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditPlaza(plaza)}
                      className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded-lg transition-colors duration-200"
                      title="Edit Plaza"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlaza(plaza.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      title="Delete Plaza"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {plazas.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <MapPinIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No plazas found</h3>
            <p className="text-gray-400 mb-6">Get started by creating your first toll plaza.</p>
            <button
              onClick={() => {
                setShowModal(true);
                setIsEditing(false);
                setSelectedPlaza(null);
                reset();
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Your First Plaza
            </button>
          </div>
        )}
      </div>

      {/* Plaza Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto modal-scroll border border-gray-700">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-4 border-b border-gray-700 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white font-serif">
                    {isEditing ? 'Edit Plaza' : selectedPlaza ? 'Plaza Details' : 'Add New Plaza'}
                  </h3>
                  <p className="text-sm text-gray-300 mt-1">
                    {isEditing ? 'Update plaza information' : selectedPlaza ? 'View plaza details' : 'Create a new toll plaza'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedPlaza(null);
                    setIsEditing(false);
                    reset();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-600 rounded-lg transition-colors duration-200"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {isEditing || !selectedPlaza ? (
                <form onSubmit={handleSubmit(isEditing ? handleUpdatePlaza : handleCreatePlaza)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-3">Plaza Name</label>
                      <input
                        {...register('name', { required: 'Plaza name is required' })}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400 transition-all duration-200 input-focus"
                        placeholder="Enter plaza name"
                      />
                      {errors.name && (
                        <p className="mt-2 text-sm text-red-400 font-medium">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-3">Location</label>
                      <input
                        {...register('location', { required: 'Location is required' })}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400 transition-all duration-200 input-focus"
                        placeholder="Enter location"
                      />
                      {errors.location && (
                        <p className="mt-2 text-sm text-red-400 font-medium">{errors.location.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-3">Latitude</label>
                      <input
                        {...register('coordinates.lat', { 
                          required: 'Latitude is required',
                          valueAsNumber: true,
                          min: { value: -90, message: 'Invalid latitude' },
                          max: { value: 90, message: 'Invalid latitude' }
                        })}
                        type="number"
                        step="any"
                        className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400 transition-all duration-200 input-focus"
                        placeholder="0.000000"
                      />
                      {errors.coordinates?.lat && (
                        <p className="mt-2 text-sm text-red-400 font-medium">{errors.coordinates.lat.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-3">Longitude</label>
                      <input
                        {...register('coordinates.lng', { 
                          required: 'Longitude is required',
                          valueAsNumber: true,
                          min: { value: -180, message: 'Invalid longitude' },
                          max: { value: 180, message: 'Invalid longitude' }
                        })}
                        type="number"
                        step="any"
                        className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400 transition-all duration-200 input-focus"
                        placeholder="0.000000"
                      />
                      {errors.coordinates?.lng && (
                        <p className="mt-2 text-sm text-red-400 font-medium">{errors.coordinates.lng.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Status</label>
                    <select
                      {...register('status')}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">Operating Hours Start</label>
                      <input
                        {...register('operatingHours.start')}
                        type="time"
                        className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">Operating Hours End</label>
                      <input
                        {...register('operatingHours.end')}
                        type="time"
                        className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-3">Toll Rates (ETH)</label>
                    <div className="grid grid-cols-2 gap-4">
                      {vehicleTypes.map((type) => (
                        <div key={type}>
                          <label className="block text-xs text-gray-300 mb-1 capitalize">{type}</label>
                          <input
                            {...register(`tollRates.${type}` as any, { 
                              required: `Rate for ${type} is required`,
                              valueAsNumber: true,
                              min: { value: 0, message: 'Rate must be positive' }
                            })}
                            type="number"
                            step="0.0001"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
                            placeholder="0.0000"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-3">Assigned Operators</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-600 rounded-md p-3 bg-gray-700">
                      {operators.map((operator) => (
                        <label key={operator.id} className="flex items-center hover:bg-gray-600 hover:shadow-sm rounded p-2 transition-colors">
                          <input
                            {...register('assignedOperators')}
                            type="checkbox"
                            value={operator.id}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-200 font-medium">
                            {operator.name} ({operator.email})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedPlaza(null);
                        setIsEditing(false);
                        reset();
                      }}
                      className="px-6 py-3 border border-gray-600 rounded-xl text-sm font-semibold text-gray-300 hover:bg-gray-700 hover:border-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      {isEditing ? 'Update Plaza' : 'Create Plaza'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Name</label>
                      <p className="mt-1 text-sm text-white">{selectedPlaza.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedPlaza.status)}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">Location</label>
                    <p className="mt-1 text-sm text-white">{selectedPlaza.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Coordinates</label>
                      <p className="mt-1 text-sm text-white">
                        {selectedPlaza.coordinates.lat}, {selectedPlaza.coordinates.lng}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Operating Hours</label>
                      <p className="mt-1 text-sm text-white">
                        {selectedPlaza.operatingHours.start} - {selectedPlaza.operatingHours.end}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Toll Rates</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedPlaza.tollRates).map(([type, rate]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="capitalize text-gray-300">{type}:</span>
                          <span className="font-medium text-white">${rate.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Assigned Operators</label>
                    <div className="space-y-1">
                      {selectedPlaza.assignedOperators.map((operatorId) => {
                        const operator = operators.find(op => op.id === operatorId);
                        return operator ? (
                          <div key={operatorId} className="text-sm text-white">
                            {operator.name} ({operator.email})
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setSelectedPlaza(null);
                      }}
                      className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => handleEditPlaza(selectedPlaza)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Edit Plaza
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
