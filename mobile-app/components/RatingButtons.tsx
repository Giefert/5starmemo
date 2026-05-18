import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const COLORS = {
  ink: '#14120F',
  inkSoft: '#1C1A16',
  bgHair: '#28251F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  onDark: '#E8E3D6',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

interface RatingButtonsProps {
  onRating: (rating: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}

export const RatingButtons: React.FC<RatingButtonsProps> = ({ onRating, disabled = false }) => {
  // Flat scale: every label reads ink; only "Again" carries a red marker.
  const ratings = [
    { value: 1 as const, label: 'Again', markerColor: COLORS.red,      outline: false },
    { value: 2 as const, label: 'Hard',  markerColor: COLORS.ink,      outline: false },
    { value: 3 as const, label: 'Good',  markerColor: COLORS.inkFaint, outline: false },
    { value: 4 as const, label: 'Easy',  markerColor: COLORS.inkFaint, outline: true  },
  ];

  return (
    <View style={styles.row}>
      {ratings.map((rating, i) => (
        <TouchableOpacity
          key={rating.value}
          style={[styles.button, i > 0 && styles.buttonDivider]}
          onPress={() => !disabled && onRating(rating.value)}
          disabled={disabled}
          activeOpacity={0.6}
        >
          <Text style={[styles.label, disabled && styles.labelDisabled]}>
            {rating.label}
          </Text>
          {!disabled && (
            <View
              style={[
                styles.marker,
                rating.outline
                  ? { borderWidth: 1, borderColor: rating.markerColor }
                  : { backgroundColor: rating.markerColor },
              ]}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  button: {
    flex: 1,
    paddingTop: 22,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  buttonDivider: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.paperHair,
  },
  marker: {
    marginTop: 8,
    width: 8,
    height: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: COLORS.ink,
  },
  labelDisabled: {
    color: COLORS.inkFaint,
  },
});
