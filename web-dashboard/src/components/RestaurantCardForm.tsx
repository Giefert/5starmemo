'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RestaurantCardData,
  RestaurantCardDataV1,
  RestaurantCategory,
  PricePoint,
  migrateToV2
} from '../../../shared/types';
import { getImageUrl } from '@/lib/utils';
import { ImagePreview } from '@/components/ui/ImagePreview';

interface RestaurantCardFormProps {
  onSubmit: (data: { restaurantData: RestaurantCardData; imageUrl?: string }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    restaurantData?: RestaurantCardData;
    imageUrl?: string;
  };
  isEditing?: boolean;
}

export const RestaurantCardForm: React.FC<RestaurantCardFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}) => {
  // Type assertion helper for initializing from existing data
  const initData = initialData?.restaurantData as any;

  // Restaurant-specific fields
  const [itemName, setItemName] = useState(initData?.itemName || '');
  const [category, setCategory] = useState<RestaurantCategory>(
    initData?.category || 'maki'
  );
  const [description, setDescription] = useState(initData?.description || '');
  const [ingredients, setIngredients] = useState<string[]>(
    initData?.ingredients || []
  );
  const [allergens, setAllergens] = useState<string[]>(
    initData?.allergens || []
  );
  const [region, setRegion] = useState(initData?.region || '');
  const [producer, setProducer] = useState(initData?.producer || '');
  const [vintage, setVintage] = useState(initData?.vintage?.toString() || '');
  const [abv, setAbv] = useState(initData?.abv?.toString() || '');
  const [grapeVarieties, setGrapeVarieties] = useState<string[]>(
    initData?.grapeVarieties || []
  );
  const [riceVariety, setRiceVariety] = useState(initData?.riceVariety || '');
  const [tastingNotes, setTastingNotes] = useState<string[]>(
    initData?.tastingNotes || []
  );
  const [servingTemp, setServingTemp] = useState(initData?.servingTemp || '');
  const [foodPairings, setFoodPairings] = useState<string[]>(
    initData?.foodPairings || []
  );

  // Raw input strings for array fields to preserve user input formatting
  const [ingredientsRaw, setIngredientsRaw] = useState(
    initData?.ingredients?.join(', ') || ''
  );
  const [allergensRaw, setAllergensRaw] = useState(
    initData?.allergens?.join(', ') || ''
  );
  const [tastingNotesRaw, setTastingNotesRaw] = useState(
    initData?.tastingNotes?.join(', ') || ''
  );
  const [foodPairingsRaw, setFoodPairingsRaw] = useState(
    initData?.foodPairings?.join(', ') || ''
  );
  const [pricePoint, setPricePoint] = useState<PricePoint>(
    initData?.pricePoint || 'mid-range'
  );
  const [specialNotes, setSpecialNotes] = useState(initData?.specialNotes || '');

  // Maki-specific fields
  const [topping, setTopping] = useState(initData?.topping || '');
  const [base, setBase] = useState(initData?.base || '');
  const [sauce, setSauce] = useState(initData?.sauce || '');
  const [paper, setPaper] = useState(initData?.paper || '');
  const [gluten, setGluten] = useState<'yes' | 'no' | 'optional' | undefined>(
    initData?.gluten || undefined
  );

  // Image fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || ''); // For existing images
  const [isUploading, setIsUploading] = useState(false);

  // Debug logging for image state
  console.log('🖼️ RestaurantCardForm image state:', {
    initialImageUrl: initialData?.imageUrl,
    currentImageUrl: imageUrl,
    hasSelectedFile: !!selectedFile,
    selectedFileName: selectedFile?.name,
    showImagePreview: !!(selectedFile || imageUrl)
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleArrayInput = (value: string, setter: (arr: string[]) => void) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setter(items);
  };

  const handleRawArrayInput = (
    rawValue: string, 
    setRaw: (raw: string) => void, 
    setArray: (arr: string[]) => void
  ) => {
    setRaw(rawValue);
    const items = rawValue.split(',').map(item => item.trim()).filter(Boolean);
    setArray(items);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    console.log('🔄 Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('authToken');
      console.log('📤 Uploading to API:', {
        apiUrl: process.env.NEXT_PUBLIC_WEB_API_URL,
        hasToken: !!token
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_WEB_API_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📥 Upload response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      return result.data?.imageUrl || null;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setIsSubmitting(true);
    try {
      let finalImageUrl = imageUrl; // Keep existing image URL if no new file

      // Upload new file if selected
      if (selectedFile) {
        console.log('🖼️ Uploading new image file...');
        setIsUploading(true);
        const uploadedUrl = await uploadFile(selectedFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
          console.log('✅ Image upload complete, new URL:', finalImageUrl);
        } else {
          console.log('❌ Image upload failed');
          alert('Failed to upload image. Please try again.');
          return;
        }
        setIsUploading(false);
      }

      // Build V1 format with all fields, then migrate to V2 (strips category-incompatible fields)
      const restaurantDataV1: RestaurantCardData = {
        itemName: itemName.trim(),
        category,
        description: description.trim() || undefined,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
        region: region.trim() || undefined,
        producer: producer.trim() || undefined,
        vintage: vintage ? parseInt(vintage) : undefined,
        abv: abv ? parseFloat(abv) : undefined,
        grapeVarieties: grapeVarieties.length > 0 ? grapeVarieties : undefined,
        riceVariety: riceVariety.trim() || undefined,
        tastingNotes: tastingNotes.length > 0 ? tastingNotes : undefined,
        servingTemp: servingTemp.trim() || undefined,
        foodPairings: foodPairings.length > 0 ? foodPairings : undefined,
        pricePoint,
        specialNotes: specialNotes.trim() || undefined,
        // Maki-specific fields
        topping: topping.trim() || undefined,
        base: base.trim() || undefined,
        sauce: sauce.trim() || undefined,
        paper: paper.trim() || undefined,
        gluten: gluten || undefined,
      };

      // Migrate to V2: strips fields incompatible with selected category
      const restaurantData = migrateToV2(restaurantDataV1);

      const submissionData: any = {
        restaurantData
      };

      // Always include imageUrl, even when null/empty to handle image removal
      submissionData.imageUrl = finalImageUrl && finalImageUrl.trim() ? finalImageUrl.trim() : null;
      console.log('📝 Submitting form with imageUrl:', {
        imageUrl: submissionData.imageUrl
      });

      console.log('🚀 Calling onSubmit with:', submissionData);
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const categoryOptions = [
    { value: 'maki', label: 'Maki' },
    { value: 'sake', label: 'Sake' },
    { value: 'wine', label: 'Wine' },
    { value: 'cocktail', label: 'Cocktail' },
    { value: 'spirit', label: 'Spirit' },
    { value: 'beer', label: 'Beer' },
  ];

  const pricePointOptions = [
    { value: 'budget', label: 'Budget' },
    { value: 'mid-range', label: 'Mid-Range' },
    { value: 'premium', label: 'Premium' },
    { value: 'luxury', label: 'Luxury' },
  ];

  const glutenOptions = [
    { value: '', label: 'Not specified' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'optional', label: 'Optional' },
  ];

  const isAlcoholic = ['wine', 'beer', 'cocktail', 'spirit', 'sake'].includes(category);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {isEditing ? 'Edit Restaurant Card' : 'Add Restaurant Card'}
      </h3>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g., Ribeye Steak, Chardonnay 2020"
            required
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Upload (Optional)
          </label>
          
          {/* Show current image status */}
          {imageUrl && !selectedFile && (
            <div className="mb-2 text-sm text-gray-600 bg-blue-50 p-2 rounded border">
              📷 Current image: Saved to card
              <button
                type="button"
                onClick={() => {
                  setImageUrl('');
                  setSelectedFile(null);
                }}
                className="ml-2 text-red-600 hover:text-red-800 text-xs underline"
              >
                Remove current image
              </button>
            </div>
          )}
          
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setSelectedFile(file);
              // Don't automatically clear imageUrl when no file selected
              // Let user explicitly choose to remove existing image
            }}
            className="mb-2"
          />
          {(selectedFile || imageUrl) && (
            <div className="mt-2">
              {/* Debug info */}
              <div className="text-xs text-gray-500 mb-1">
                {selectedFile ? `New file: ${selectedFile.name}` : imageUrl ? `Existing: ${imageUrl}` : 'No image'}
              </div>
              <ImagePreview
                src={selectedFile ? URL.createObjectURL(selectedFile) : getImageUrl(imageUrl)}
                alt="Card preview"
                mode="preview"
                className="max-w-xs"
                onError={() => {
                  console.log('❌ Image load error');
                }}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RestaurantCategory)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Point
          </label>
          <select
            value={pricePoint}
            onChange={(e) => setPricePoint(e.target.value as PricePoint)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {pricePointOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="This field is currently unused."
        />
      </div>

      {/* Origin Information */}
      {(category === 'wine' || category === 'sake') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region/Origin
            </label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={category === 'sake' ? "e.g., Niigata, Yamagata, Hyogo" : "e.g., Tuscany, Scotland, Local Farm"}
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
              Producer
              </label>
            <Input
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
              placeholder={category === 'sake' ? "e.g., Dassai, Masumi, Hakkaisan" : "e.g., Château Margaux, Highland Distillery"}
            />
          </div>
        </div>
      )}

      {/* Alcohol-specific fields */}
      {isAlcoholic && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ABV (%)
            </label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder="e.g., 12.5"
            />
          </div>

          {(category === 'wine' || category === 'sake') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vintage
              </label>
              <Input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={vintage}
                onChange={(e) => setVintage(e.target.value)}
                placeholder="e.g., 2020"
              />
            </div>
          )}

          {category === 'wine' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grape Varieties
              </label>
              <Input
                value={grapeVarieties.join(', ')}
                onChange={(e) => handleArrayInput(e.target.value, setGrapeVarieties)}
                placeholder="Chardonnay, Pinot Noir (comma separated)"
              />
            </div>
          )}

          {category === 'sake' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rice Variety
              </label>
              <Input
                value={riceVariety}
                onChange={(e) => setRiceVariety(e.target.value)}
                placeholder="e.g., Yamada Nishiki, Gohyakumangoku"
              />
            </div>
          )}
        </div>
      )}

      {/* Maki-specific fields */}
      {category === 'maki' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topping
            </label>
            <Input
              value={topping}
              onChange={(e) => setTopping(e.target.value)}
              placeholder="e.g., Tuna, Salmon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base
            </label>
            <Input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="e.g., Sushi Rice, Brown Rice"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sauce
            </label>
            <Input
              value={sauce}
              onChange={(e) => setSauce(e.target.value)}
              placeholder="e.g., Spicy Mayo, Eel Sauce"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paper
            </label>
            <Input
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
              placeholder="e.g., Nori, Soy Paper"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gluten
            </label>
            <select
              value={gluten || ''}
              onChange={(e) => {
                const value = e.target.value;
                setGluten(value === '' ? undefined : value as 'yes' | 'no' | 'optional');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {glutenOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tasting & Service */}
      {(category === 'wine' || category === 'sake') && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasting Notes
              </label>
              <Input
                value={tastingNotesRaw}
                onChange={(e) => handleRawArrayInput(e.target.value, setTastingNotesRaw, setTastingNotes)}
                placeholder={category === 'sake' ? "fruity, dry, umami, cereal (comma separated)" : "fruity, oaky, smooth (comma separated)"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serving Temperature
              </label>
              <Input
                value={servingTemp}
                onChange={(e) => setServingTemp(e.target.value)}
                placeholder={category === 'sake' ? "e.g., 5-15°C (chilled), 40-45°C (warm)" : "e.g., 7-18°C, Room temperature"}
              />
            </div>
          </div>

          {/* Food Pairings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Food Pairings
            </label>
            <Input
              value={foodPairingsRaw}
              onChange={(e) => handleRawArrayInput(e.target.value, setFoodPairingsRaw, setFoodPairings)}
              placeholder={category === 'sake' ? "sashimi, tempura, yakitori, grilled fish (comma separated)" : "grilled salmon, aged cheese, dark chocolate (comma separated)"}
            />
          </div>
        </>
      )}

      {/* Special Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Special Notes
        </label>
        <Input
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
          placeholder="Limited availability, seasonal special, etc."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isUploading || !itemName.trim()}>
          {isUploading ? 'Uploading...' : isSubmitting ? 'Saving...' : (isEditing ? 'Update Card' : 'Add Card')}
        </Button>
      </div>
    </form>
  );
};