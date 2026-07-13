'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import {
  RestaurantCardData,
  RestaurantCardDataV1,
  RestaurantCategory,
  PricePoint,
  MONTH_NAMES,
  migrateToV2
} from '../../../shared/types';
import { getImageUrl } from '@/lib/utils';
import { ImagePreview } from '@/components/ui/ImagePreview';

interface RestaurantCardFormProps {
  onSubmit: (data: { restaurantData: RestaurantCardData; imageUrl?: string | null }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    restaurantData?: RestaurantCardData;
    imageUrl?: string;
  };
  isEditing?: boolean;
}

type HighlightMarker = '*' | '**';

interface HighlightableListItem {
  value: string;
  highlighted: boolean;
  marker: HighlightMarker;
}

const DEFAULT_HIGHLIGHT_MARKER: HighlightMarker = '*';

const cleanStringArray = (items: string[]) =>
  items.map(item => item.trim()).filter(Boolean);

const splitCommaList = (value: string) =>
  value.split(',').map(item => item.trim()).filter(Boolean);

const parseHighlightableItem = (rawValue: string): HighlightableListItem => {
  const value = rawValue.trim();

  if (value.startsWith('**') && value.endsWith('**') && value.length > 4) {
    return {
      value: value.slice(2, -2).trim(),
      highlighted: true,
      marker: '**',
    };
  }

  if (value.startsWith('*') && value.endsWith('*') && value.length > 2) {
    return {
      value: value.slice(1, -1).trim(),
      highlighted: true,
      marker: '*',
    };
  }

  return {
    value,
    highlighted: false,
    marker: DEFAULT_HIGHLIGHT_MARKER,
  };
};

const serializeHighlightableItem = (item: HighlightableListItem) => {
  const value = item.value.trim();
  if (!value) return '';
  return item.highlighted ? `${item.marker}${value}${item.marker}` : value;
};

const serializeHighlightableItems = (items: HighlightableListItem[]) =>
  items.map(serializeHighlightableItem);

const serializeCommaList = (items: string[]) =>
  cleanStringArray(items).join(', ');

interface HighlightableListFieldProps {
  label: string;
  value: string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
  placeholder?: string;
}

const HighlightableListField: React.FC<HighlightableListFieldProps> = ({
  label,
  value,
  onChange,
  addLabel = 'Add item',
  placeholder = 'Item',
}) => {
  const [items, setItems] = useState<HighlightableListItem[]>(
    () => value.map(parseHighlightableItem)
  );
  const preferredMarker =
    items.find(item => item.highlighted)?.marker || DEFAULT_HIGHLIGHT_MARKER;

  const commitItems = (nextItems: HighlightableListItem[]) => {
    setItems(nextItems);
    onChange(serializeHighlightableItems(nextItems));
  };

  const updateItem = (index: number, patch: Partial<HighlightableListItem>) => {
    const nextItems = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    );
    commitItems(nextItems);
  };

  const addItem = () => {
    commitItems([
      ...items,
      { value: '', highlighted: false, marker: preferredMarker },
    ]);
  };

  const removeItem = (index: number) => {
    commitItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {addLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
          No items yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <Input
                value={item.value}
                onChange={(e) => updateItem(index, { value: e.target.value })}
                placeholder={placeholder}
              />
              <label className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={item.highlighted}
                  onChange={(e) =>
                    updateItem(index, {
                      highlighted: e.target.checked,
                      marker: e.target.checked ? preferredMarker : item.marker,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Highlight
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                aria-label={`Remove ${label.toLowerCase()} item ${index + 1}`}
                className="justify-self-start text-gray-400 hover:text-red-600 sm:justify-self-auto"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RestaurantCardForm: React.FC<RestaurantCardFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}) => {
  // Type assertion helper for initializing from existing data
  const initData = initialData?.restaurantData as Partial<RestaurantCardDataV1> | undefined;

  // Restaurant-specific fields
  const [itemName, setItemName] = useState(initData?.itemName || '');
  const [category, setCategory] = useState<RestaurantCategory | ''>(
    initData?.category || ''
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
  const [grapeVarietiesRaw, setGrapeVarietiesRaw] = useState(
    (initData?.grapeVarieties || []).join(', ')
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
  const [tanninLevel, setTanninLevel] = useState<number | undefined>(
    initData?.tanninLevel
  );
  const [riceVariety, setRiceVariety] = useState(initData?.riceVariety || '');
  const [classification, setClassification] = useState(initData?.classification || '');
  const [tastingNotes, setTastingNotes] = useState<string[]>(
    initData?.tastingNotes || []
  );
  const [servingTemp, setServingTemp] = useState(initData?.servingTemp || '');
  const [foodPairings, setFoodPairings] = useState<string[]>(
    initData?.foodPairings || []
  );
  const [toppingItems, setToppingItems] = useState<string[]>(
    splitCommaList(initData?.topping || '')
  );
  const [baseItems, setBaseItems] = useState<string[]>(
    splitCommaList(initData?.base || '')
  );
  const [sauceItems, setSauceItems] = useState<string[]>(
    splitCommaList(initData?.sauce || '')
  );
  const [paperItems, setPaperItems] = useState<string[]>(
    splitCommaList(initData?.paper || '')
  );

  // Raw input strings for array fields to preserve user input formatting
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
    initData?.pricePoint || 'not-specified'
  );
  const [price, setPrice] = useState(initData?.price || '');
  const [specialNotes, setSpecialNotes] = useState(initData?.specialNotes || '');

  // Maki-specific fields
  const [gluten, setGluten] = useState<'yes' | 'no' | 'optional' | undefined>(
    initData?.gluten || undefined
  );

  // Dietary-specific fields
  const [starters, setStarters] = useState(initData?.starters || '');
  const [sashimi, setSashimi] = useState(initData?.sashimi || '');
  const [nigiri, setNigiri] = useState(initData?.nigiri || '');
  const [maki, setMaki] = useState(initData?.maki || '');

  // Cocktail-specific fields
  const [alcohol, setAlcohol] = useState<string[]>(
    initData?.alcohol || []
  );
  const [other, setOther] = useState<string[]>(
    initData?.other || []
  );
  const [garnish, setGarnish] = useState(initData?.garnish || '');

  const [taste, setTaste] = useState(initData?.taste || '');
  const [country, setCountry] = useState(initData?.country || '');
  const [seasonStartMonth, setSeasonStartMonth] = useState(
    initData?.seasonStartMonth?.toString() || ''
  );
  const [seasonEndMonth, setSeasonEndMonth] = useState(
    initData?.seasonEndMonth?.toString() || ''
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
    if (!itemName.trim() || !category) return;
    if (
      category === 'fish' &&
      Boolean(seasonStartMonth) !== Boolean(seasonEndMonth)
    ) {
      alert('Choose both a starting month and an ending month for seasonality.');
      return;
    }

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
      const cleanedIngredients = cleanStringArray(ingredients);
      const cleanedAllergens = cleanStringArray(allergens);
      const cleanedGrapeVarieties = cleanStringArray(grapeVarieties);
      const cleanedTastingNotes = cleanStringArray(tastingNotes);
      const cleanedFoodPairings = cleanStringArray(foodPairings);
      const cleanedAlcohol = cleanStringArray(alcohol);
      const cleanedOther = cleanStringArray(other);
      const topping = serializeCommaList(toppingItems);
      const base = serializeCommaList(baseItems);
      const sauce = serializeCommaList(sauceItems);
      const paper = serializeCommaList(paperItems);

      const restaurantDataV1: RestaurantCardDataV1 = {
        itemName: itemName.trim(),
        category,
        description: description.trim() || undefined,
        ingredients: cleanedIngredients.length > 0 ? cleanedIngredients : undefined,
        allergens: cleanedAllergens.length > 0 ? cleanedAllergens : undefined,
        region: region.trim() || undefined,
        producer: producer.trim() || undefined,
        vintage: vintage ? parseInt(vintage) : undefined,
        abv: abv ? parseFloat(abv) : undefined,
        grapeVarieties: cleanedGrapeVarieties.length > 0 ? cleanedGrapeVarieties : undefined,
        appellation: appellation.trim() || undefined,
        bodyLevel: bodyLevel,
        sweetnessLevel: sweetnessLevel,
        acidityLevel: acidityLevel,
        tanninLevel: tanninLevel,
        classification: classification.trim() || undefined,
        riceVariety: riceVariety.trim() || undefined,
        tastingNotes: cleanedTastingNotes.length > 0 ? cleanedTastingNotes : undefined,
        servingTemp: servingTemp.trim() || undefined,
        foodPairings: cleanedFoodPairings.length > 0 ? cleanedFoodPairings : undefined,
        pricePoint,
        price: price.trim() || undefined,
        specialNotes: specialNotes.trim() || undefined,
        // Maki-specific fields
        topping: topping.trim() || (category === 'maki' ? 'None' : undefined),
        base: base.trim() || (category === 'maki' ? 'None' : undefined),
        sauce: sauce.trim() || (category === 'maki' ? 'None' : undefined),
        paper: paper.trim() || (category === 'maki' ? 'None' : undefined),
        gluten: gluten || undefined,
        // Cocktail-specific fields
        alcohol: cleanedAlcohol.length > 0 ? cleanedAlcohol : undefined,
        other: cleanedOther.length > 0 ? cleanedOther : undefined,
        garnish: garnish.trim() || undefined,
        taste: taste.trim() || undefined,
        country: country.trim() || undefined,
        seasonStartMonth: seasonStartMonth ? parseInt(seasonStartMonth) : undefined,
        seasonEndMonth: seasonEndMonth ? parseInt(seasonEndMonth) : undefined,
        // Dietary-specific fields
        starters: starters.trim() || undefined,
        sashimi: sashimi.trim() || undefined,
        nigiri: nigiri.trim() || undefined,
        maki: maki.trim() || undefined,
      };

      // Migrate to V2: strips fields incompatible with selected category
      const restaurantData = migrateToV2(restaurantDataV1);

      const submissionData: { restaurantData: RestaurantCardData; imageUrl: string | null } = {
        restaurantData,
        imageUrl: finalImageUrl && finalImageUrl.trim() ? finalImageUrl.trim() : null,
      };

      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting restaurant card:', error);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'Select category' },
    { value: 'maki', label: 'Maki' },
    { value: 'sauce', label: 'Sauce' },
    { value: 'sake', label: 'Sake' },
    { value: 'wine', label: 'Wine' },
    { value: 'cocktail', label: 'Cocktail' },
    { value: 'spirit', label: 'Spirit' },
    { value: 'beer', label: 'Beer' },
    { value: 'fish', label: 'Fish' },
    { value: 'dietary', label: 'Dietary' },
    { value: 'starters', label: 'Starters' },
    { value: 'sashimi', label: 'Sashimi' },
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
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RestaurantCategory)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value} disabled={option.value === ''}>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price
          </label>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="$0"
          />
        </div>

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

        {category === 'sake' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Classification
            </label>
            <Input
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              placeholder="e.g., Junmai Daiginjo, Honjozo, Nigori"
            />
          </div>
        )}
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
                value={grapeVarietiesRaw}
                onChange={(e) => handleRawArrayInput(e.target.value, setGrapeVarietiesRaw, setGrapeVarieties)}
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <HighlightableListField
              label="Topping"
              value={toppingItems}
              onChange={setToppingItems}
              placeholder="e.g., Tuna"
            />
            <HighlightableListField
              label="Base"
              value={baseItems}
              onChange={setBaseItems}
              placeholder="e.g., Sushi rice"
            />
            <HighlightableListField
              label="Sauce"
              value={sauceItems}
              onChange={setSauceItems}
              placeholder="e.g., Spicy mayo"
            />
            <HighlightableListField
              label="Paper"
              value={paperItems}
              onChange={setPaperItems}
              placeholder="e.g., Nori"
            />
          </div>

          <div className="max-w-sm">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HighlightableListField
            label="Alcohol"
            value={alcohol}
            onChange={setAlcohol}
            placeholder="e.g., Vodka"
          />

          <HighlightableListField
            label="Other"
            value={other}
            onChange={setOther}
            placeholder="e.g., Simple syrup"
          />

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
        <HighlightableListField
          label="Ingredients"
          value={ingredients}
          onChange={setIngredients}
          placeholder="e.g., Tomatoes"
        />
      )}

      {/* Fish-specific fields */}
      {category === 'fish' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taste
            </label>
            <Input
              value={taste}
              onChange={(e) => setTaste(e.target.value)}
              placeholder="e.g., mild, rich, buttery"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., Japan, Norway, Scotland"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Season starts
            </label>
            <select
              value={seasonStartMonth}
              onChange={(e) => setSeasonStartMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Not specified</option>
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Season ends
            </label>
            <select
              value={seasonEndMonth}
              onChange={(e) => setSeasonEndMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Not specified</option>
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Dietary-specific fields */}
      {category === 'dietary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Starters
            </label>
            <Input
              value={starters}
              onChange={(e) => setStarters(e.target.value)}
              placeholder="e.g., Gluten-free, Vegan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sashimi
            </label>
            <Input
              value={sashimi}
              onChange={(e) => setSashimi(e.target.value)}
              placeholder="e.g., Gluten-free, Vegan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nigiri
            </label>
            <Input
              value={nigiri}
              onChange={(e) => setNigiri(e.target.value)}
              placeholder="e.g., Gluten-free, Vegan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maki
            </label>
            <Input
              value={maki}
              onChange={(e) => setMaki(e.target.value)}
              placeholder="e.g., Gluten-free, Vegan"
            />
          </div>
        </div>
      )}

      {/* Starters / Sashimi-specific fields */}
      {(category === 'starters' || category === 'sashimi') && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HighlightableListField
            label="Ingredients"
            value={ingredients}
            onChange={setIngredients}
            placeholder="e.g., Tuna"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allergens
            </label>
            <Input
              value={allergensRaw}
              onChange={(e) => handleRawArrayInput(e.target.value, setAllergensRaw, setAllergens)}
              placeholder="soy, sesame, shellfish (comma separated)"
            />
          </div>
        </div>
      )}

      {/* Tasting & Service */}
      {(category === 'wine' || category === 'sake') && (
        <>
          {/* Wine: Appellation + Serving Temperature row */}
          {category === 'wine' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serving Temperature
                </label>
                <Input
                  value={servingTemp}
                  onChange={(e) => setServingTemp(e.target.value)}
                  placeholder="e.g., 7-18°C, Room temperature"
                />
              </div>
            </div>
          )}

          {/* Tasting Notes - full width textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasting Notes
            </label>
            <textarea
              value={tastingNotesRaw}
              onChange={(e) => {
                setTastingNotesRaw(e.target.value);
                setTastingNotes(e.target.value.trim() ? [e.target.value.trim()] : []);
              }}
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={category === 'sake' ? "e.g. fruity, dry, umami, cereal" : "e.g. fruity, oaky, smooth"}
            />
          </div>

          {/* Sake: Serving Temperature */}
          {category === 'sake' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serving Temperature
              </label>
              <Input
                value={servingTemp}
                onChange={(e) => setServingTemp(e.target.value)}
                placeholder="e.g., 5-15°C (chilled), 40-45°C (warm)"
              />
            </div>
          )}

          {/* Wine Characteristic Meters */}
          {category === 'wine' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-3">
                Wine Characteristics (Optional)
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

              {/* Tannin Level: Smooth to Tannic */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 min-w-[40px]">Smooth</span>
                  <div className="flex gap-3 flex-1 justify-center">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <label key={level} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="tanninLevel"
                          value={level}
                          checked={tanninLevel === level}
                          onChange={() => setTanninLevel(level)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <span className="ml-1 text-xs text-gray-600">{level}</span>
                      </label>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 min-w-[40px] text-right">Tannic</span>
                  <div className="ml-2 w-10">
                    {tanninLevel && (
                      <button
                        type="button"
                        onClick={() => setTanninLevel(undefined)}
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
