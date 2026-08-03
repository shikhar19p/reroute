import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, useWindowDimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import AnimatedImage from './AnimatedImage';

interface ImageGalleryProps {
  images: string[];
  height?: number;
  /** Optional back button rendered top-left over the image (e.g. navigation.goBack) */
  onBack?: () => void;
  /** Optional extra button(s) rendered top-right over the image (e.g. wishlist heart) */
  topRightSlot?: React.ReactNode;
}

const MAX_DOTS = 8;

export default function ImageGallery({ images, height = 300, onBack, topRightSlot }: ImageGalleryProps) {
  const { width, height: screenHeight } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const listRef = useRef<FlatList>(null);
  const fullscreenListRef = useRef<FlatList>(null);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setIndex(viewableItems[0].index);
  });
  const onFullscreenViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setFullscreenIndex(viewableItems[0].index);
  });

  const safeImages = images.length > 0 ? images : ['https://via.placeholder.com/400x300'];

  const goTo = (targetIndex: number, list: React.RefObject<FlatList>) => {
    const wrapped = (targetIndex + safeImages.length) % safeImages.length;
    list.current?.scrollToIndex({ index: wrapped, animated: true });
  };

  const openFullscreen = (startIndex: number) => {
    setFullscreenIndex(startIndex);
    setFullscreenVisible(true);
    requestAnimationFrame(() => {
      fullscreenListRef.current?.scrollToIndex({ index: startIndex, animated: false });
    });
  };

  const showArrows = safeImages.length > 1;
  const showDots = safeImages.length > 1 && safeImages.length <= MAX_DOTS;

  return (
    <View style={[styles.section, { height }]}>
      <FlatList
        ref={listRef}
        data={safeImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item, index: itemIndex }) => (
          <TouchableOpacity activeOpacity={0.95} onPress={() => openFullscreen(itemIndex)}>
            <AnimatedImage uri={item} style={{ width, height }} resizeMode="cover" />
          </TouchableOpacity>
        )}
      />

      {showArrows && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.navLeft]}
            onPress={() => goTo(index - 1, listRef)}
          >
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.navRight]}
            onPress={() => goTo(index + 1, listRef)}
          >
            <ChevronRight size={22} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {showDots && (
        <View style={styles.dots}>
          {safeImages.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}

      {safeImages.length > 1 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>{index + 1} / {safeImages.length}</Text>
        </View>
      )}

      {(onBack || topRightSlot) && (
        <View style={styles.topActions}>
          {onBack ? (
            <TouchableOpacity style={styles.actionButton} onPress={onBack}>
              <ChevronLeft size={24} color="#000" />
            </TouchableOpacity>
          ) : <View />}
          {topRightSlot}
        </View>
      )}

      <Modal
        visible={fullscreenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenVisible(false)}
      >
        <View style={styles.fullscreenContainer}>
          <FlatList
            ref={fullscreenListRef}
            data={safeImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialScrollIndex={fullscreenIndex}
            onViewableItemsChanged={onFullscreenViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
            renderItem={({ item }) => (
              <View style={{ width, height: screenHeight, justifyContent: 'center', alignItems: 'center' }}>
                <AnimatedImage uri={item} style={{ width, height: screenHeight * 0.75 }} resizeMode="contain" />
              </View>
            )}
          />

          {safeImages.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.navButton, styles.navLeft, styles.fullscreenNav]}
                onPress={() => goTo(fullscreenIndex - 1, fullscreenListRef)}
              >
                <ChevronLeft size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, styles.navRight, styles.fullscreenNav]}
                onPress={() => goTo(fullscreenIndex + 1, fullscreenListRef)}
              >
                <ChevronRight size={24} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.fullscreenCounter}>
            <Text style={styles.counterText}>{fullscreenIndex + 1} / {safeImages.length}</Text>
          </View>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenVisible(false)}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { position: 'relative', overflow: 'hidden' },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLeft: { left: 12 },
  navRight: { right: 12 },
  fullscreenNav: { backgroundColor: 'rgba(255,255,255,0.15)' },
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 16,
  },
  counter: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  topActions: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fullscreenClose: {
    position: 'absolute', top: 50, right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8,
  },
  fullscreenCounter: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15,
  },
});
