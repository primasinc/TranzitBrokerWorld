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
  }
}; 