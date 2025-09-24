'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImagePreviewProps {
  src: string;
  alt: string;
  mode?: 'thumbnail' | 'preview';
  maxWidth?: string;
  className?: string;
  onError?: () => void;
  onClick?: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt,
  mode = 'preview',
  maxWidth = '400px',
  className,
  onError,
  onClick
}) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  if (imageError || !src) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-gray-100 border border-gray-300 rounded-md",
        mode === 'thumbnail' ? 'h-16 w-16' : 'min-h-16',
        className
      )}>
        <span className="text-gray-400 text-sm">No image</span>
      </div>
    );
  }

  const getContainerClasses = () => {
    const baseClasses = "relative rounded-md border border-gray-300 overflow-hidden";

    if (mode === 'thumbnail') {
      return cn(baseClasses, "h-16 w-16");
    }

    // For preview mode - no height constraints, only width
    return cn(baseClasses, "inline-block");
  };

  const getImageClasses = () => {
    if (mode === 'thumbnail') {
      return "w-full h-full object-cover";
    }

    // For preview mode - let image determine its size naturally
    return "max-w-full h-auto object-contain";
  };

  const containerStyle = mode === 'preview' ? { maxWidth } : {};

  return (
    <div
      className={cn(getContainerClasses(), className)}
      style={containerStyle}
    >
      <img
        src={src}
        alt={alt}
        className={getImageClasses()}
        onError={handleImageError}
        onClick={onClick}
        loading="lazy"
      />
    </div>
  );
};