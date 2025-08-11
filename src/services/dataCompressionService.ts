// Data Compression Service - Phase 1B
// Handles data compression, storage optimization, and compression analytics

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  decompressionTime: number;
  algorithm: string;
  timestamp: number;
}

interface CompressionAlgorithm {
  name: string;
  compressionLevel: number;
  speed: 'fast' | 'balanced' | 'high';
  ratio: 'low' | 'medium' | 'high';
  enabled: boolean;
}

interface StorageOptimization {
  type: 'compression' | 'deduplication' | 'archiving' | 'indexing';
  target: string;
  estimatedSavings: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

class DataCompressionService {
  private compressionHistory: CompressionStats[] = [];
  private algorithms: CompressionAlgorithm[] = [
    {
      name: 'gzip',
      compressionLevel: 6,
      speed: 'balanced',
      ratio: 'medium',
      enabled: true
    },
    {
      name: 'brotli',
      compressionLevel: 11,
      speed: 'high',
      ratio: 'high',
      enabled: true
    },
    {
      name: 'lz4',
      compressionLevel: 1,
      speed: 'fast',
      ratio: 'low',
      enabled: true
    }
  ];
  private isActive = false;
  private maxHistorySize = 1000;

  constructor() {
    this.start();
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[DataCompressionService] Service started');
  }

  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    console.log('[DataCompressionService] Service stopped');
  }

  /**
   * Compress data using the best available algorithm
   */
  async compressData(data: any, options?: {
    algorithm?: string;
    compressionLevel?: number;
    targetSize?: number;
  }): Promise<{ compressed: any; stats: CompressionStats }> {
    if (!this.isActive) {
      throw new Error('Data compression service is not active');
    }

    const startTime = performance.now();
    const originalSize = this.calculateDataSize(data);
    
    // Select best algorithm based on data type and requirements
    const algorithm = this.selectBestAlgorithm(data, options);
    
    let compressed: any;
    let compressionTime: number;

    try {
      const compressionStart = performance.now();
      
      switch (algorithm.name) {
        case 'gzip':
          compressed = await this.compressWithGzip(data, algorithm.compressionLevel);
          break;
        case 'brotli':
          compressed = await this.compressWithBrotli(data, algorithm.compressionLevel);
          break;
        case 'lz4':
          compressed = await this.compressWithLz4(data, algorithm.compressionLevel);
          break;
        default:
          throw new Error(`Unsupported compression algorithm: ${algorithm.name}`);
      }
      
      compressionTime = performance.now() - compressionStart;
    } catch (error) {
      console.error('[DataCompressionService] Compression failed:', error);
      throw error;
    }

    const compressedSize = this.calculateDataSize(compressed);
    const compressionRatio = compressedSize / originalSize;
    const totalTime = performance.now() - startTime;

    const stats: CompressionStats = {
      originalSize,
      compressedSize,
      compressionRatio,
      compressionTime,
      decompressionTime: 0, // Will be set during decompression
      algorithm: algorithm.name,
      timestamp: Date.now()
    };

    // Record compression stats
    this.recordCompressionStats(stats);

    return { compressed, stats };
  }

  /**
   * Decompress data
   */
  async decompressData(compressedData: any, algorithm: string): Promise<{ data: any; stats: Partial<CompressionStats> }> {
    if (!this.isActive) {
      throw new Error('Data compression service is not active');
    }

    const startTime = performance.now();
    let data: any;

    try {
      switch (algorithm) {
        case 'gzip':
          data = await this.decompressWithGzip(compressedData);
          break;
        case 'brotli':
          data = await this.decompressWithBrotli(compressedData);
          break;
        case 'lz4':
          data = await this.decompressWithLz4(compressedData);
          break;
        default:
          throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
      }
    } catch (error) {
      console.error('[DataCompressionService] Decompression failed:', error);
      throw error;
    }

    const decompressionTime = performance.now() - startTime;

    return {
      data,
      stats: { decompressionTime }
    };
  }

  /**
   * Analyze storage optimization opportunities
   */
  async analyzeStorageOptimization(): Promise<StorageOptimization[]> {
    const optimizations: StorageOptimization[] = [];

    // Analyze compression opportunities
    const compressionStats = this.getCompressionStats();
    if (compressionStats.length > 0) {
      const avgCompressionRatio = compressionStats.reduce((sum, stat) => sum + stat.compressionRatio, 0) / compressionStats.length;
      
      if (avgCompressionRatio > 0.8) {
        optimizations.push({
          type: 'compression',
          target: 'database',
          estimatedSavings: (1 - avgCompressionRatio) * 100,
          priority: 'high',
          status: 'pending'
        });
      }
    }

    // Analyze deduplication opportunities
    optimizations.push({
      type: 'deduplication',
      target: 'user_data',
      estimatedSavings: 15, // Estimated 15% savings
      priority: 'medium',
      status: 'pending'
    });

    // Analyze archiving opportunities
    optimizations.push({
      type: 'archiving',
      target: 'historical_data',
      estimatedSavings: 30, // Estimated 30% savings
      priority: 'low',
      status: 'pending'
    });

    return optimizations;
  }

  /**
   * Get compression performance metrics
   */
  getCompressionMetrics(): {
    totalCompressions: number;
    averageCompressionRatio: number;
    averageCompressionTime: number;
    averageDecompressionTime: number;
    totalSpaceSaved: number;
    mostEffectiveAlgorithm: string;
  } {
    if (this.compressionHistory.length === 0) {
      return {
        totalCompressions: 0,
        averageCompressionRatio: 0,
        averageCompressionTime: 0,
        averageDecompressionTime: 0,
        totalSpaceSaved: 0,
        mostEffectiveAlgorithm: 'none'
      };
    }

    const totalCompressions = this.compressionHistory.length;
    const averageCompressionRatio = this.compressionHistory.reduce((sum, stat) => sum + stat.compressionRatio, 0) / totalCompressions;
    const averageCompressionTime = this.compressionHistory.reduce((sum, stat) => sum + stat.compressionTime, 0) / totalCompressions;
    const averageDecompressionTime = this.compressionHistory.reduce((sum, stat) => sum + stat.decompressionTime, 0) / totalCompressions;
    const totalSpaceSaved = this.compressionHistory.reduce((sum, stat) => sum + (stat.originalSize - stat.compressedSize), 0);

    // Find most effective algorithm
    const algorithmStats = new Map<string, { totalRatio: number; count: number }>();
    this.compressionHistory.forEach(stat => {
      const current = algorithmStats.get(stat.algorithm) || { totalRatio: 0, count: 0 };
      algorithmStats.set(stat.algorithm, {
        totalRatio: current.totalRatio + stat.compressionRatio,
        count: current.count + 1
      });
    });

    let mostEffectiveAlgorithm = 'none';
    let bestRatio = 1;
    algorithmStats.forEach((stats, algorithm) => {
      const avgRatio = stats.totalRatio / stats.count;
      if (avgRatio < bestRatio) {
        bestRatio = avgRatio;
        mostEffectiveAlgorithm = algorithm;
      }
    });

    return {
      totalCompressions,
      averageCompressionRatio,
      averageCompressionTime,
      averageDecompressionTime,
      totalSpaceSaved,
      mostEffectiveAlgorithm
    };
  }

  /**
   * Update compression algorithm configuration
   */
  updateAlgorithmConfig(algorithmName: string, updates: Partial<CompressionAlgorithm>): void {
    const algorithm = this.algorithms.find(alg => alg.name === algorithmName);
    if (algorithm) {
      Object.assign(algorithm, updates);
      console.log(`[DataCompressionService] Updated algorithm ${algorithmName}:`, updates);
    }
  }

  /**
   * Get all compression algorithms
   */
  getAlgorithms(): CompressionAlgorithm[] {
    return [...this.algorithms];
  }

  /**
   * Get compression history
   */
  getCompressionStats(): CompressionStats[] {
    return [...this.compressionHistory];
  }

  /**
   * Clear compression history
   */
  clearHistory(): void {
    this.compressionHistory = [];
    console.log('[DataCompressionService] Compression history cleared');
  }

  // Private methods

  private selectBestAlgorithm(data: any, options?: any): CompressionAlgorithm {
    // Simple algorithm selection based on data type and requirements
    if (options?.algorithm) {
      const algorithm = this.algorithms.find(alg => alg.name === options.algorithm && alg.enabled);
      if (algorithm) return algorithm;
    }

    // Default to balanced approach
    return this.algorithms.find(alg => alg.speed === 'balanced' && alg.enabled) || this.algorithms[0];
  }

  private calculateDataSize(data: any): number {
    // Simple size calculation - in production, use more sophisticated methods
    return JSON.stringify(data).length;
  }

  private async compressWithGzip(data: any, level: number): Promise<any> {
    // Simulate gzip compression - in production, use actual gzip library
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
    const jsonStr = JSON.stringify(data);
    // Ensure compression by taking 70-80% of the original size
    const compressionFactor = 0.7 + (level / 10) * 0.1;
    const compressedSize = Math.floor(jsonStr.length * compressionFactor);
    return { compressed: true, algorithm: 'gzip', level, data: jsonStr.substring(0, compressedSize) };
  }

  private async compressWithBrotli(data: any, level: number): Promise<any> {
    // Simulate brotli compression - in production, use actual brotli library
    await new Promise(resolve => setTimeout(resolve, Math.random() * 15 + 10));
    const jsonStr = JSON.stringify(data);
    // Brotli is more effective - 60-75% of original size
    const compressionFactor = 0.6 + (level / 10) * 0.15;
    const compressedSize = Math.floor(jsonStr.length * compressionFactor);
    return { compressed: true, algorithm: 'brotli', level, data: jsonStr.substring(0, compressedSize) };
  }

  private async compressWithLz4(data: any, level: number): Promise<any> {
    // Simulate LZ4 compression - in production, use actual LZ4 library
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 2));
    const jsonStr = JSON.stringify(data);
    // LZ4 is fast but less effective - 75-85% of original size
    const compressionFactor = 0.75 + (level / 10) * 0.1;
    const compressedSize = Math.floor(jsonStr.length * compressionFactor);
    return { compressed: true, algorithm: 'lz4', level, data: jsonStr.substring(0, compressedSize) };
  }

  private async decompressWithGzip(compressedData: any): Promise<any> {
    // Simulate gzip decompression
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 2));
    
    // In simulation, we need to restore the data structure
    // Since we're simulating compression by truncating strings, we'll restore with placeholder data
    if (compressedData && typeof compressedData === 'object') {
      // Restore the data structure based on the algorithm used
      return {
        restored: true,
        algorithm: 'gzip',
        originalData: this.restoreDataStructure(compressedData, 'gzip')
      };
    }
    
    // Fallback for unexpected data types
    return { restored: true, algorithm: 'gzip', originalData: compressedData };
  }

  private async decompressWithBrotli(compressedData: any): Promise<any> {
    // Simulate brotli decompression
    await new Promise(resolve => setTimeout(resolve, Math.random() * 8 + 5));
    
    if (compressedData && typeof compressedData === 'object') {
      return {
        restored: true,
        algorithm: 'brotli',
        originalData: this.restoreDataStructure(compressedData, 'brotli')
      };
    }
    
    return { restored: true, algorithm: 'brotli', originalData: compressedData };
  }

  private async decompressWithLz4(compressedData: any): Promise<any> {
    // Simulate LZ4 decompression
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3 + 1));
    
    if (compressedData && typeof compressedData === 'object') {
      return {
        restored: true,
        algorithm: 'lz4',
        originalData: this.restoreDataStructure(compressedData, 'lz4')
      };
    }
    
    return { restored: true, algorithm: 'lz4', originalData: compressedData };
  }

  /**
   * Restore data structure for simulation purposes
   * In a real implementation, this would be the actual decompression logic
   */
  private restoreDataStructure(compressedData: any, algorithm: string): any {
    // For simulation, we'll create a restored data structure
    // In production, this would be the actual decompressed data
    
    if (compressedData.data) {
      // If we have the compressed data, try to restore it
      try {
        // Attempt to parse as JSON if it's a string
        if (typeof compressedData.data === 'string') {
          // For simulation, we'll create a mock restored object
          // In reality, this would be the actual decompressed data
          return {
            id: `restored_${Date.now()}`,
            algorithm: algorithm,
            timestamp: new Date().toISOString(),
            data: `Restored data from ${algorithm} compression`,
            metadata: {
              compressionLevel: compressedData.level || 1,
              originalSize: compressedData.originalSize || 'unknown',
              restoredAt: new Date().toISOString()
            }
          };
        }
        
        // If it's already an object, return it with restoration metadata
        return {
          ...compressedData.data,
          _restored: true,
          _algorithm: algorithm,
          _restoredAt: new Date().toISOString()
        };
      } catch (error) {
        console.warn(`[DataCompressionService] Failed to restore data structure for ${algorithm}:`, error);
        return {
          error: 'Failed to restore data structure',
          algorithm: algorithm,
          originalData: compressedData.data
        };
      }
    }
    
    // Fallback: return the compressed data with restoration metadata
    return {
      _restored: true,
      _algorithm: algorithm,
      _restoredAt: new Date().toISOString(),
      originalData: compressedData
    };
  }

  private recordCompressionStats(stats: CompressionStats): void {
    this.compressionHistory.push(stats);
    
    // Maintain history size limit
    if (this.compressionHistory.length > this.maxHistorySize) {
      this.compressionHistory = this.compressionHistory.slice(-this.maxHistorySize);
    }
  }

  destroy(): void {
    this.stop();
    this.clearHistory();
    console.log('[DataCompressionService] Service destroyed');
  }
}

// Create singleton instance
export const dataCompressionService = new DataCompressionService();

// Export public API
export const compressData = (data: any, options?: any) => 
  dataCompressionService.compressData(data, options);

export const decompressData = (compressedData: any, algorithm: string) => 
  dataCompressionService.decompressData(compressedData, algorithm);

export const analyzeStorageOptimization = () => 
  dataCompressionService.analyzeStorageOptimization();

export const getCompressionMetrics = () => 
  dataCompressionService.getCompressionMetrics();

export const updateAlgorithmConfig = (algorithmName: string, updates: Partial<CompressionAlgorithm>) => 
  dataCompressionService.updateAlgorithmConfig(algorithmName, updates);

export const getAlgorithms = () => 
  dataCompressionService.getAlgorithms();

export const getCompressionStats = () => 
  dataCompressionService.getCompressionStats();

export const clearCompressionHistory = () => 
  dataCompressionService.clearHistory();

export default dataCompressionService;
