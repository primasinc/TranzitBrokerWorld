import React from 'react';
import styles from './LoadingSkeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ width, height, className }) => (
  <div 
    className={`${styles.skeleton} ${className || ''}`}
    style={{ width, height }}
  />
);

export const LoadDetailsSkeleton: React.FC = () => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Skeleton width="300px" height="32px" />
        <Skeleton width="100px" height="24px" />
      </header>

      <div className={styles.content}>
        <section className={styles.mainInfo}>
          <div className={styles.infoCard}>
            <Skeleton width="200px" height="24px" className={styles.title} />
            <div className={styles.details}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.detail}>
                  <Skeleton width="80px" height="16px" />
                  <Skeleton width="120px" height="20px" />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.locationCard}>
            {[1, 2].map((i) => (
              <div key={i} className={styles.location}>
                <Skeleton width="100px" height="24px" className={styles.title} />
                <Skeleton width="160px" height="20px" />
                <Skeleton width="140px" height="20px" />
                <Skeleton width="100px" height="20px" />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.mapSection}>
          <Skeleton width="200px" height="24px" className={styles.title} />
          <Skeleton width="100%" height="400px" />
        </section>

        <section className={styles.itemTracking}>
          <Skeleton width="200px" height="24px" className={styles.title} />
          <div className={styles.itemsList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.item}>
                <Skeleton width="200px" height="20px" />
                <Skeleton width="100px" height="20px" />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.statusUpdates}>
          <div className={styles.statusHeader}>
            <Skeleton width="200px" height="24px" />
            <Skeleton width="120px" height="36px" />
          </div>

          <div className={styles.timeline}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.timelineItem}>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <Skeleton width="120px" height="16px" />
                    <Skeleton width="100px" height="16px" />
                  </div>
                  <Skeleton width="160px" height="16px" />
                  <Skeleton width="200px" height="16px" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}; 