import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Get API URL from environment, with fallback
  const apiUrl = process.env.NEXT_PUBLIC_WEB_API_URL || 'http://localhost:3001';
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('Image URL Debug:', {
      imagePath,
      apiUrl,
      envVar: process.env.NEXT_PUBLIC_WEB_API_URL,
      fullUrl: `${apiUrl}${imagePath}`
    });
  }
  
  return `${apiUrl}${imagePath}`;
}