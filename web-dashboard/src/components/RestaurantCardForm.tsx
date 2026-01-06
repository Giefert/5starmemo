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
  const [appellation, setAppellation] = useState(initData?.appellation || '');
  const [bodyLevel, setBodyLevel] = useState<number | undefined>(
    initData?.bodyLevel
  );
  const [sweetnessLevel, setSweetnessLevel] = useState<number | undefined>(
    initData?.sweetnessLevel
  );
  const [acidityLevel, setAcidityLevel] = useState<number | undefined>(
    initData?.acidityLevel
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
  const [alcoholRaw, setAlcoholRaw] = useState(
    initData?.alcohol?.join(', ') || ''
  );
  const [otherRaw, setOtherRaw] = useState(
    initData?.other?.join(', ') || ''
  );
  const [pricePoint, setPricePoint] = useState<PricePoint>(
    initData?.pricePoint || 'not-specified'
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

  // Cocktail-specific fields
  const [alcohol, setAlcohol] = useState<string[]>(
    initData?.alcohol || []
  );
  const [other, setOther] = useState<string[]>(
    initData?.other || []
  );
  const [garnish, setGarnish] = useState(initData?.garnish || '');

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
        appellation: appellation.trim() || undefined,
        bodyLevel: bodyLevel,
        sweetnessLevel: sweetnessLevel,
        acidityLevel: acidityLevel,
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
        // Cocktail-specific fields
        alcohol: alcohol.length > 0 ? alcohol : undefined,
        other: other.length > 0 ? other : undefined,
        garnish: garnish.trim() || undefined,
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
    { value: 'sauce', label: 'Sauce' },
    { value: 'sake', label: 'Sake' },
    { value: 'wine', label: 'Wine' },
    { value: 'cocktail', label: 'Cocktail' },
    { value: 'spirit', label: 'Spirit' },
    { value: 'beer', label: 'Beer' },
  ];

  const pricePointOptions = [
    { value: 'not-specified', label: 'Not specified' },
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

      {/* Wine-specific appellation field */}
      {category === 'wine' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appellation
          </label>
          <Input
            value={appellation}
            onChange={(e) => setAppellation(e.target.value)}
            placeholder="e.g., Napa Valley, Bordeaux AOC, Chianti Classico DOCG"
          />
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

      {/* Cocktail-specific fields */}
      {category === 'cocktail' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alcohol
            </label>
            <Input
              value={alcoholRaw}
              onChange={(e) => handleRawArrayInput(e.target.value, setAlcoholRaw, setAlcohol)}
              placeholder="vodka, tequila, vermouth"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other
            </label>
            <Input
              value={otherRaw}
              onChange={(e) => handleRawArrayInput(e.target.value, setOtherRaw, setOther)}
              placeholder="simple syrup, cranberry juice"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Garnish
            </label>
            <Input
              value={garnish}
              onChange={(e) => setGarnish(e.target.value)}
              placeholder="e.g., lime wedge, mint sprig, olive"
            />
          </div>
        </div>
      )}

      {/* Sauce-specific fields */}
      {category === 'sauce' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ingredients
          </label>
          <Input
            value={ingredientsRaw}
            onChange={(e) => handleRawArrayInput(e.target.value, setIngredientsRaw, setIngredients)}
            placeholder="tomatoes, garlic, basil (comma separated)"
          />
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

          {/* Wine Characteristic Meters */}
          {category === 'wine' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-3">
                Wine Characteristics (Optional)
              </div>

              {/* Body Level: Light to Bold */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 min-w-[40px]">Light</span>
                  <div className="flex gap-3 flex-1 justify-center">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <label key={level} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="bodyLevel"
                          value={level}
                          checked={bodyLevel === level}
                          onChange={() => setBodyLevel(level)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <span className="ml-1 text-xs text-gray-600">{level}</span>
                      </label>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 min-w-[40px] text-right">Bold</span>
                  <div className="ml-2 w-10">
                    {bodyLevel && (
                      <button
                        type="button"
                        onClick={() => setBodyLevel(undefined)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sweetness Level: Dry to Sweet */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 min-w-[40px]">Dry</span>
                  <div className="flex gap-3 flex-1 justify-center">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <label key={level} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="sweetnessLevel"
                          value={level}
                          checked={sweetnessLevel === level}
                          onChange={() => setSweetnessLevel(level)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <span className="ml-1 text-xs text-gray-600">{level}</span>
                      </label>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 min-w-[40px] text-right">Sweet</span>
                  <div className="ml-2 w-10">
                    {sweetnessLevel && (
                      <button
                        type="button"
                        onClick={() => setSweetnessLevel(undefined)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Acidity Level: Soft to Acidic */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 min-w-[40px]">Soft</span>
                  <div className="flex gap-3 flex-1 justify-center">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <label key={level} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="acidityLevel"
                          value={level}
                          checked={acidityLevel === level}
                          onChange={() => setAcidityLevel(level)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <span className="ml-1 text-xs text-gray-600">{level}</span>
                      </label>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 min-w-[40px] text-right">Acidic</span>
                  <div className="ml-2 w-10">
                    {acidityLevel && (
                      <button
                        type="button"
                        onClick={() => setAcidityLevel(undefined)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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