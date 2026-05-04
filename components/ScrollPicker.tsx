import { useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { haptic } from '../lib/haptics';

interface ScrollPickerProps {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  unit: string;
  label: string;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

export default function ScrollPicker({ values, selected, onSelect, unit, label }: ScrollPickerProps) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const selectedIndex = values.indexOf(selected);

  useEffect(() => {
    if (selectedIndex >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, []);

  const handleScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
    const newValue = values[clampedIndex];
    if (newValue !== selected) haptic.selection();
    onSelect(newValue);
  };

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>

      <View style={[styles.pickerContainer, { borderColor: theme.colors.outlineVariant }]}>
        {/* Ligne de selection */}
        <View style={[styles.selectionLine, { borderColor: theme.colors.primary }]} pointerEvents="none" />

        <FlatList
          ref={flatListRef}
          data={values}
          keyExtractor={(item) => String(item)}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          onMomentumScrollEnd={handleScrollEnd}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          }}
          style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          renderItem={({ item }) => {
            const isSelected = item === selected;
            return (
              <View style={styles.item}>
                <Text
                  variant={isSelected ? 'headlineSmall' : 'bodyLarge'}
                  style={{
                    fontWeight: isSelected ? 'bold' : 'normal',
                    color: isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    opacity: isSelected ? 1 : 0.4,
                  }}
                >
                  {item} {isSelected ? unit : ''}
                </Text>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionLine: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 16,
    right: 16,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
