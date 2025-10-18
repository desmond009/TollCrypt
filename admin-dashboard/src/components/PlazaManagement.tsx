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
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
      inactive: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Toll Plaza Management</h1>
          <p className="text-gray-600">Manage toll plazas, rates, and operator assignments</p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setIsEditing(false);
            setSelectedPlaza(null);
            reset();
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Plaza
        </button>
      </div>

      {/* Plazas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plazas.map((plaza) => (
          <div key={plaza.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <MapPinIcon className="h-6 w-6 text-gray-400 mr-2" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{plaza.name}</h3>
                  <p className="text-sm text-gray-500">{plaza.location}</p>
                </div>
              </div>
              {getStatusBadge(plaza.status)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Today's Transactions:</span>
                <span className="font-medium">{plaza.todayTransactions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Today's Revenue:</span>
                <span className="font-medium">${plaza.todayRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Operators:</span>
                <span className="font-medium">{plaza.assignedOperators.length}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Created {format(new Date(plaza.createdAt), 'MMM d, yyyy')}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewPlaza(plaza)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEditPlaza(plaza)}
                  className="text-yellow-600 hover:text-yellow-900"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeletePlaza(plaza.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plaza Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditing ? 'Edit Plaza' : selectedPlaza ? 'Plaza Details' : 'Add New Plaza'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedPlaza(null);
                    setIsEditing(false);
                    reset();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {isEditing || !selectedPlaza ? (
                <form onSubmit={handleSubmit(isEditing ? handleUpdatePlaza : handleCreatePlaza)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plaza Name</label>
                      <input
                        {...register('name', { required: 'Plaza name is required' })}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter plaza name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        {...register('location', { required: 'Location is required' })}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter location"
                      />
                      {errors.location && (
                        <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input
                        {...register('coordinates.lat', { 
                          required: 'Latitude is required',
                          valueAsNumber: true,
                          min: { value: -90, message: 'Invalid latitude' },
                          max: { value: 90, message: 'Invalid latitude' }
                        })}
                        type="number"
                        step="any"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.000000"
                      />
                      {errors.coordinates?.lat && (
                        <p className="mt-1 text-sm text-red-600">{errors.coordinates.lat.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input
                        {...register('coordinates.lng', { 
                          required: 'Longitude is required',
                          valueAsNumber: true,
                          min: { value: -180, message: 'Invalid longitude' },
                          max: { value: 180, message: 'Invalid longitude' }
                        })}
                        type="number"
                        step="any"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.000000"
                      />
                      {errors.coordinates?.lng && (
                        <p className="mt-1 text-sm text-red-600">{errors.coordinates.lng.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      {...register('status')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours Start</label>
                      <input
                        {...register('operatingHours.start')}
                        type="time"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours End</label>
                      <input
                        {...register('operatingHours.end')}
                        type="time"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Toll Rates (USDC)</label>
                    <div className="grid grid-cols-2 gap-4">
                      {vehicleTypes.map((type) => (
                        <div key={type}>
                          <label className="block text-xs text-gray-600 mb-1 capitalize">{type}</label>
                          <input
                            {...register(`tollRates.${type}` as any, { 
                              required: `Rate for ${type} is required`,
                              valueAsNumber: true,
                              min: { value: 0, message: 'Rate must be positive' }
                            })}
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Operators</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {operators.map((operator) => (
                        <label key={operator.id} className="flex items-center">
                          <input
                            {...register('assignedOperators')}
                            type="checkbox"
                            value={operator.id}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {operator.name} ({operator.email})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedPlaza(null);
                        setIsEditing(false);
                        reset();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      {isEditing ? 'Update Plaza' : 'Create Plaza'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedPlaza.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedPlaza.status)}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlaza.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Coordinates</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedPlaza.coordinates.lat}, {selectedPlaza.coordinates.lng}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedPlaza.operatingHours.start} - {selectedPlaza.operatingHours.end}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Toll Rates</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedPlaza.tollRates).map(([type, rate]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="capitalize">{type}:</span>
                          <span className="font-medium">${rate.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Operators</label>
                    <div className="space-y-1">
                      {selectedPlaza.assignedOperators.map((operatorId) => {
                        const operator = operators.find(op => op.id === operatorId);
                        return operator ? (
                          <div key={operatorId} className="text-sm text-gray-900">
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
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
