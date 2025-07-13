interface StatusUpdate {
  loadId: string;
  status: string;
  notes: string;
  location?: string;
  timestamp?: string;
}

interface LoadItem {
  id: string;
  name: string;
  status: string;
}

interface LoadDetails {
  id: string;
  pickupLocation: {
    address: string;
    position: [number, number];
  };
  deliveryLocation: {
    address: string;
    position: [number, number];
  };
  title: string;
  shipper: string;
  status: string;
  payment: number;
  weight: string;
  dimensions: string;
  items: LoadItem[];
}

export const loadService = {
  updateLoadStatus: async (update: StatusUpdate) => {
    // This would be an API call in production
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        data: {
          ...update,
          timestamp: new Date().toISOString(),
          location: 'Current Location' // Would come from GPS
        }
      };
    } catch (error) {
      console.error('Error updating load status:', error);
      throw error;
    }
  },

  updateItemStatus: async (loadId: string, itemId: string, status: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        data: {
          id: itemId,
          status: status,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error updating item status:', error);
      throw error;
    }
  },

  getLoadItems: async (loadId: string): Promise<LoadItem[]> => {
    // This would fetch from API in production
    return [
      { id: '1', name: 'Electronics Pallet 1', status: 'loaded' },
      { id: '2', name: 'Electronics Pallet 2', status: 'loaded' },
    ];
  },

  getLoadById: async (loadId: string): Promise<LoadDetails> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        id: loadId,
        title: 'Electronics Shipment',
        shipper: 'ABC Electronics',
        pickupLocation: {
          address: '123 Main St, Chicago, IL',
          position: [-87.6298, 41.8781]
        },
        deliveryLocation: {
          address: '456 Oak St, New York, NY',
          position: [-74.0060, 40.7128]
        },
        status: 'in_progress',
        payment: 2500,
        weight: '15,000 lbs',
        dimensions: '53\' Trailer',
        items: [
          { id: '1', name: 'Electronics Pallet 1', status: 'loaded' },
          { id: '2', name: 'Electronics Pallet 2', status: 'loaded' }
        ]
      };
    } catch (error) {
      console.error('Error fetching load details:', error);
      throw error;
    }
  },

  bookLoad: async (poNumber: string, carrier: any) => {
    try {
      const response = await fetch('http://localhost:3001/api/po/book-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poNumber, carrier })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to book load');
      }
      return await response.json();
    } catch (error) {
      console.error('Error booking load:', error);
      throw error;
    }
  }
}; 