import React from 'react';
import './LoadingSkeleton.css';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const getSkeletonClass = () => {
    const baseClass = 'skeleton';
    const variantClass = `skeleton--${variant}`;
    return `${baseClass} ${variantClass} ${className}`.trim();
  };

  const getStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={getSkeletonClass()}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="skeleton__line"
            style={{
              ...getStyle(),
              width: i === lines - 1 ? '60%' : width || '100%'
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={getSkeletonClass()} style={getStyle()} />
  );
};

export const SettingsPageSkeleton: React.FC = () => {
  return (
    <div className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <LoadingSkeleton variant="text" width="300px" height="40px" />
          <LoadingSkeleton variant="text" width="400px" height="20px" />
        </header>

        <div className="settings-sections">
          {/* Appearance Section */}
          <section className="settings-section">
            <LoadingSkeleton variant="text" width="200px" height="32px" />
            <div className="settings-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="setting-item">
                  <LoadingSkeleton variant="text" width="150px" height="20px" />
                  <LoadingSkeleton variant="rectangular" height="44px" />
                </div>
              ))}
            </div>
          </section>

          {/* Reading Section */}
          <section className="settings-section">
            <LoadingSkeleton variant="text" width="150px" height="32px" />
            <div className="settings-grid">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="setting-item">
                  <LoadingSkeleton variant="text" width="180px" height="20px" />
                  <LoadingSkeleton variant="rectangular" height="44px" />
                </div>
              ))}
            </div>
          </section>

          {/* Translation Section */}
          <section className="settings-section">
            <LoadingSkeleton variant="text" width="160px" height="32px" />
            <div className="settings-grid">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="setting-item">
                  <LoadingSkeleton variant="text" width="170px" height="20px" />
                  <LoadingSkeleton variant="rectangular" height="44px" />
                </div>
              ))}
            </div>
          </section>

          {/* Data Section */}
          <section className="settings-section">
            <LoadingSkeleton variant="text" width="80px" height="32px" />
            <div className="settings-grid">
              <div className="setting-item">
                <LoadingSkeleton variant="text" width="140px" height="20px" />
                <div className="button-group">
                  <LoadingSkeleton variant="rectangular" width="120px" height="44px" />
                  <LoadingSkeleton variant="rectangular" width="120px" height="44px" />
                </div>
              </div>
              <div className="setting-item">
                <LoadingSkeleton variant="text" width="150px" height="20px" />
                <div className="button-group">
                  <LoadingSkeleton variant="rectangular" width="120px" height="44px" />
                  <LoadingSkeleton variant="rectangular" width="120px" height="44px" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};