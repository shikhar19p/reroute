import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';

interface FilterChipProps {
  label: string;
  onRemove?: () => void;
  color: string;
  textColor: string;
  small?: boolean;
}

export const FilterChip = React.memo(({ label, onRemove, color, textColor, small }: FilterChipProps) => (
  <View style={[styles.chip, { backgroundColor: color + '22', borderColor: color }, small && styles.small]}>
    <Text style={[styles.label, { color }, small && styles.smallLabel]} numberOfLines={1}>
      {label}
    </Text>
    {onRemove && (
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <X size={small ? 10 : 12} color={color} />
      </TouchableOpacity>
    )}
  </View>
));

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  small: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
  smallLabel: {
    fontSize: 11,
  },
});
