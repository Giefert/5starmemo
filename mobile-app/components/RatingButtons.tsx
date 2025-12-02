import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface RatingButtonsProps {
  onRating: (rating: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}

export const RatingButtons: React.FC<RatingButtonsProps> = ({ onRating, disabled = false }) => {
  const ratings = [
    { value: 1 as const, label: 'Again', color: '#EF5350' }, // Soft Red
    { value: 2 as const, label: 'Hard',  color: '#FFB74D' }, // Soft Orange
    { value: 3 as const, label: 'Good',  color: '#66BB6A' }, // Soft Green
    { value: 4 as const, label: 'Easy',  color: '#42A5F5' }, // Soft Blue
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {ratings.map((rating) => (
          <TouchableOpacity
            key={rating.value}
            // Dynamic border styling based on the specific rating color
            style={[
              styles.button,
              disabled && styles.disabledButton,
              !disabled && { borderColor: rating.color }
            ]}
            onPress={() => !disabled && onRating(rating.value)}
            disabled={disabled}
            activeOpacity={0.6}
          >
            <Text style={[
              styles.label,
              // Text takes the color, background stays neutral
              !disabled && { color: rating.color },
              disabled && { color: '#CCC' }
            ]}>
              {rating.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF', // Neutral Background
    borderRadius: 12,
    borderWidth: 1.5, // The border carries the weight now
    alignItems: 'center',
    justifyContent: 'center',
    // Removed heavy shadows for a cleaner, flatter look
  },
  disabledButton: {
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
