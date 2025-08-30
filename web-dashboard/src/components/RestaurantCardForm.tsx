'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RestaurantCardData } from '../../../shared/types';

interface RestaurantCardFormProps {
  onSubmit: (data: { front: string; back: string; restaurantData: RestaurantCardData; imageUrl?: string; imageFocusPoint?: { x: number; y: number } }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    front: string;
    back: string;
    restaurantData?: RestaurantCardData;
    imageUrl?: string;
    imageFocusPoint?: { x: number; y: number };
  };
  isEditing?: boolean;
}

export const RestaurantCardForm: React.FC<RestaurantCardFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false
}) => {
  const [front, setFront] = useState(initialData?.front || '');
  const [back, setBack] = useState(initialData?.back || '');
  
  // Restaurant-specific fields
  const [itemName, setItemName] = useState(initialData?.restaurantData?.itemName || '');
  const [category, setCategory] = useState<RestaurantCardData['category']>(
    initialData?.restaurantData?.category || 'food'
  );
  const [description, setDescription] = useState(initialData?.restaurantData?.description || '');
  const [ingredients, setIngredients] = useState<string[]>(
    initialData?.restaurantData?.ingredients || []
  );
  const [allergens, setAllergens] = useState<string[]>(
    initialData?.restaurantData?.allergens || []
  );
  const [region, setRegion] = useState(initialData?.restaurantData?.region || '');
  const [producer, setProducer] = useState(initialData?.restaurantData?.producer || '');
  const [vintage, setVintage] = useState(initialData?.restaurantData?.vintage?.toString() || '');
  const [abv, setAbv] = useState(initialData?.restaurantData?.abv?.toString() || '');
  const [grapeVarieties, setGrapeVarieties] = useState<string[]>(
    initialData?.restaurantData?.grapeVarieties || []
  );
  const [tastingNotes, setTastingNotes] = useState<string[]>(
    initialData?.restaurantData?.tastingNotes || []
  );
  const [servingTemp, setServingTemp] = useState(initialData?.restaurantData?.servingTemp || '');
  const [foodPairings, setFoodPairings] = useState<string[]>(
    initialData?.restaurantData?.foodPairings || []
  );
  
  // Raw input strings for array fields to preserve user input formatting
  const [ingredientsRaw, setIngredientsRaw] = useState(
    initialData?.restaurantData?.ingredients?.join(', ') || ''
  );
  const [allergensRaw, setAllergensRaw] = useState(
    initialData?.restaurantData?.allergens?.join(', ') || ''
  );
  const [tastingNotesRaw, setTastingNotesRaw] = useState(
    initialData?.restaurantData?.tastingNotes?.join(', ') || ''
  );
  const [foodPairingsRaw, setFoodPairingsRaw] = useState(
    initialData?.restaurantData?.foodPairings?.join(', ') || ''
  );
  const [pricePoint, setPricePoint] = useState<RestaurantCardData['pricePoint']>(
    initialData?.restaurantData?.pricePoint || 'mid-range'
  );
  const [specialNotes, setSpecialNotes] = useState(initialData?.restaurantData?.specialNotes || '');
  
  // Image fields
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [imageFocusPoint, setImageFocusPoint] = useState(initialData?.imageFocusPoint || { x: 0.5, y: 0.5 });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const restaurantData: RestaurantCardData = {
        itemName: itemName.trim(),
        category,
        description: description.trim(),
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
        region: region.trim() || undefined,
        producer: producer.trim() || undefined,
        vintage: vintage ? parseInt(vintage) : undefined,
        abv: abv ? parseFloat(abv) : undefined,
        grapeVarieties: grapeVarieties.length > 0 ? grapeVarieties : undefined,
        tastingNotes: tastingNotes.length > 0 ? tastingNotes : undefined,
        servingTemp: servingTemp.trim() || undefined,
        foodPairings: foodPairings.length > 0 ? foodPairings : undefined,
        pricePoint,
        specialNotes: specialNotes.trim() || undefined,
      };

      const submissionData: any = {
        front: front || itemName, // Use item name as front if no custom front provided
        back: back || description, // Use description as back if no custom back provided
        restaurantData
      };

      // Only include image fields if imageUrl is provided
      if (imageUrl.trim()) {
        submissionData.imageUrl = imageUrl.trim();
        submissionData.imageFocusPoint = imageFocusPoint;
      }

      await onSubmit(submissionData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'food', label: 'Food' },
    { value: 'wine', label: 'Wine' },
    { value: 'beer', label: 'Beer' },
    { value: 'cocktail', label: 'Cocktail' },
    { value: 'spirit', label: 'Spirit' },
    { value: 'non-alcoholic', label: 'Non-Alcoholic' },
  ];

  const pricePointOptions = [
    { value: 'budget', label: 'Budget' },
    { value: 'mid-range', label: 'Mid-Range' },
    { value: 'premium', label: 'Premium' },
    { value: 'luxury', label: 'Luxury' },
  ];

  const isAlcoholic = ['wine', 'beer', 'cocktail', 'spirit'].includes(category);

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RestaurantCardData['category'])}
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
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Detailed description of the item, preparation method, flavor profile..."
          required
        />
      </div>

      {/* Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Image URL (Optional)
        </label>
        <Input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          type="url"
        />
        {imageUrl && (
          <div className="mt-2">
            <img
              src={imageUrl}
              alt="Card preview"
              className="max-w-xs h-32 object-cover rounded-md border border-gray-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="mt-2 text-xs text-gray-600">
              <label className="block mb-1">Focus Point (for cropping):</label>
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <label>X:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={imageFocusPoint.x}
                    onChange={(e) => setImageFocusPoint(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                    className="w-16"
                  />
                  <span className="text-xs">{imageFocusPoint.x}</span>
                </div>
                <div className="flex items-center gap-1">
                  <label>Y:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={imageFocusPoint.y}
                    onChange={(e) => setImageFocusPoint(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                    className="w-16"
                  />
                  <span className="text-xs">{imageFocusPoint.y}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ingredients & Allergens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ingredients
          </label>
          <Input
            value={ingredientsRaw}
            onChange={(e) => handleRawArrayInput(e.target.value, setIngredientsRaw, setIngredients)}
            placeholder="beef, garlic, rosemary (comma separated)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allergens
          </label>
          <Input
            value={allergensRaw}
            onChange={(e) => handleRawArrayInput(e.target.value, setAllergensRaw, setAllergens)}
            placeholder="dairy, gluten, nuts (comma separated)"
          />
        </div>
      </div>

      {/* Origin Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Region/Origin
          </label>
          <Input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g., Tuscany, Scotland, Local Farm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Producer/Source
          </label>
          <Input
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
            placeholder="e.g., Château Margaux, Highland Distillery"
          />
        </div>
      </div>

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

          {category === 'wine' && (
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
        </div>
      )}

      {/* Tasting & Service */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tasting Notes
          </label>
          <Input
            value={tastingNotesRaw}
            onChange={(e) => handleRawArrayInput(e.target.value, setTastingNotesRaw, setTastingNotes)}
            placeholder="fruity, oaky, smooth (comma separated)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Serving Temperature
          </label>
          <Input
            value={servingTemp}
            onChange={(e) => setServingTemp(e.target.value)}
            placeholder="e.g., 55-60°F, Room temperature"
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
          placeholder="grilled salmon, aged cheese, dark chocolate (comma separated)"
        />
      </div>

      {/* Price Point & Special Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Point
          </label>
          <select
            value={pricePoint}
            onChange={(e) => setPricePoint(e.target.value as RestaurantCardData['pricePoint'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {pricePointOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

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
      </div>

      {/* Custom Front/Back (Optional) */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Card Text (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Front (defaults to item name)
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="w-full h-16 px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Custom question or prompt..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Back (defaults to description)
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="w-full h-16 px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Custom answer or details..."
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !itemName.trim() || !description.trim()}>
          {isSubmitting ? 'Saving...' : (isEditing ? 'Update Card' : 'Add Card')}
        </Button>
      </div>
    </form>
  );
};