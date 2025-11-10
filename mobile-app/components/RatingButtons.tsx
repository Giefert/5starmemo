import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface RatingButtonsProps {
  onRating: (rating: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const RatingButtons: React.FC<RatingButtonsProps> = ({ 
  onRating, 
  disabled = false 
}) => {
  const ratings = [
    {
      value: 1 as const,
      label: 'Again',
      description: 'Incorrect or very difficult',
      color: '#FF3B30',
      textColor: '#ffffff',
    },
    {
      value: 2 as const,
      label: 'Hard',
      description: 'Correct but difficult',
      color: '#FF9500',
      textColor: '#ffffff',
    },
    {
      value: 3 as const,
      label: 'Good',
      description: 'Correct with some effort',
      color: '#34C759',
      textColor: '#ffffff',
    },
    {
      value: 4 as const,
      label: 'Easy',
      description: 'Correct and easy',
      color: '#007AFF',
      textColor: '#ffffff',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.buttonsContainer}>
        {ratings.map((rating) => (
          <TouchableOpacity
            key={rating.value}
            style={[
              styles.ratingButton,
              { backgroundColor: disabled ? '#f0f0f0' : rating.color },
            ]}
            onPress={() => !disabled && onRating(rating.value)}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.ratingLabel,
              {
                color: disabled ? '#999' : rating.textColor,
                fontWeight: '600'
              }
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
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  hintContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  hintText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});