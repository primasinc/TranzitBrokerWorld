import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';

interface MobileOptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  itemHeight?: number;
  containerHeight?: number;
  enableVirtualization?: boolean;
  enablePullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export function MobileOptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  onLoadMore,
  hasMore = false,
  loading = false,
  itemHeight = 80,
  containerHeight = 400,
  enableVirtualization = true,
  enablePullToRefresh = true,
  onRefresh,
  className = ''
}: MobileOptimizedListProps<T>) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);

  const { isLowBandwidth, getOptimalPageSize } = useMobileOptimization();

  // Calculate visible items for virtualization
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current || !enableVirtualization) {
      setVisibleRange({ start: 0, end: items.length });
      return;
    }

    const scrollTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;
    
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + 2, // Add buffer
      items.length
    );

    setVisibleRange({ start: Math.max(0, start - 1), end });
  }, [items.length, itemHeight, enableVirtualization]);

  // Handle scroll for virtualization and infinite scroll
  const handleScroll = useCallback(() => {
    calculateVisibleRange();

    // Check for infinite scroll
    if (onLoadMore && hasMore && !loading && containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const threshold = 100; // pixels from bottom

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        onLoadMore();
      }
    }
  }, [calculateVisibleRange, onLoadMore, hasMore, loading]);

  // Touch handlers for pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enablePullToRefresh || !onRefresh) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [enablePullToRefresh, onRefresh]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    if (deltaY > 0) {
      e.preventDefault();
      setPullDistance(Math.min(deltaY * 0.5, 100)); // Limit pull distance
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || !onRefresh) return;
    
    isPulling.current = false;
    
    if (pullDistance > 50) { // Threshold for refresh
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  // Initialize and cleanup
  useEffect(() => {
    calculateVisibleRange();
  }, [calculateVisibleRange]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Get visible items
  const visibleItems = enableVirtualization 
    ? items.slice(visibleRange.start, visibleRange.end)
    : items;

  // Calculate total height for virtualization
  const totalHeight = enableVirtualization ? items.length * itemHeight : 'auto';
  const offsetY = enableVirtualization ? visibleRange.start * itemHeight : 0;

  return (
    <div 
      ref={containerRef}
      className={`mobile-optimized-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        WebkitOverflowScrolling: 'touch'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {enablePullToRefresh && onRefresh && (
        <div
          style={{
            position: 'absolute',
            top: -50 + pullDistance,
            left: 0,
            right: 0,
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            zIndex: 1,
            transform: `translateY(${Math.min(pullDistance, 50)}px)`,
            transition: isRefreshing ? 'none' : 'transform 0.2s ease'
          }}
        >
          {isRefreshing ? (
            <div className="loading-spinner">Refreshing...</div>
          ) : (
            <div>Pull to refresh</div>
          )}
        </div>
      )}

      {/* Virtualized content */}
      <div
        ref={scrollRef}
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={keyExtractor(item, visibleRange.start + index)}
              style={{
                height: itemHeight,
                overflow: 'hidden'
              }}
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            backgroundColor: '#f5f5f5'
          }}
        >
          Loading more...
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && items.length > 0 && (
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            color: '#666',
            fontSize: '14px'
          }}
        >
          No more items
        </div>
      )}
    </div>
  );
}

// CSS for the component
const styles = `
  .mobile-optimized-list {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  .mobile-optimized-list::-webkit-scrollbar {
    width: 4px;
  }

  .mobile-optimized-list::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .mobile-optimized-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }

  .mobile-optimized-list::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  .loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 