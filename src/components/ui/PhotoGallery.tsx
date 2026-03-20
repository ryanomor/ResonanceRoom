import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Plus, Trash2, Star, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, radius, fontSize, spacing } from '../../theme';

interface Props {
  photos: string[];
  onUpload: (slot: number) => void;
  onDelete: (index: number) => void;
  onMoveLeft: (index: number) => void;
  onMoveRight: (index: number) => void;
  uploadingSlot: number | null;
  deletingSlot: number | null;
  canAddMore: boolean;
  style?: ViewStyle;
}

export function PhotoGallery({
  photos,
  onUpload,
  onDelete,
  onMoveLeft,
  onMoveRight,
  uploadingSlot,
  deletingSlot,
  canAddMore,
  style,
}: Props) {
  const MAX_SLOTS = 5;

  const filledSlots = photos.length;

  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => ({
    index: i,
    url: photos[i] ?? null,
  }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.grid}>
        {slots.map(({ index, url }) => {
          const isUploading = uploadingSlot === index;
          const isDeleting = deletingSlot === index;
          const isPrimary = index === 0 && !!url;
          const isBusy = isUploading || isDeleting;
          const isVisible = url !== null || (index === 0) || (index <= filledSlots);

          if (!isVisible) return null;

          if (!url) {
            if (!canAddMore && index > 0) return null;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.slot, styles.emptySlot]}
                onPress={() => onUpload(index)}
                disabled={isUploading}
                activeOpacity={0.7}
              >
                {isUploading ? (
                  <ActivityIndicator color={colors.muted} size="small" />
                ) : (
                  <>
                    <Plus size={20} color={colors.muted} strokeWidth={1.5} />
                    <Text style={styles.addLabel}>Add photo</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          }

          return (
            <View key={index} style={styles.slotWrapper}>
              <TouchableOpacity
                style={styles.slot}
                onPress={() => onUpload(index)}
                activeOpacity={0.85}
                disabled={isBusy}
              >
                <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" />
                {isBusy && (
                  <View style={styles.busyOverlay}>
                    <ActivityIndicator color={colors.white} size="small" />
                  </View>
                )}
                {isPrimary && !isBusy && (
                  <View style={styles.primaryBadge}>
                    <Star size={9} color={colors.yellow} fill={colors.yellow} />
                    <Text style={styles.primaryLabel}>Primary</Text>
                  </View>
                )}
              </TouchableOpacity>

              {!isBusy && (
                <View style={styles.controls}>
                  <TouchableOpacity
                    style={[styles.controlBtn, index === 0 && styles.controlBtnDisabled]}
                    onPress={() => onMoveLeft(index)}
                    disabled={index === 0}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <ChevronLeft size={13} color={index === 0 ? colors.subtle : colors.white} strokeWidth={2.5} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlBtn, styles.deleteBtn, photos.length <= 1 && styles.controlBtnDisabled]}
                    onPress={() => onDelete(index)}
                    disabled={photos.length <= 1}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2 size={11} color={photos.length <= 1 ? colors.subtle : colors.error} strokeWidth={2} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlBtn, index >= photos.length - 1 && styles.controlBtnDisabled]}
                    onPress={() => onMoveRight(index)}
                    disabled={index >= photos.length - 1}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <ChevronRight size={13} color={index >= photos.length - 1 ? colors.subtle : colors.white} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.hint}>
        {photos.length === 0
          ? 'Add at least one photo'
          : `${photos.length} of ${MAX_SLOTS} photos \u00b7 First photo is your primary`}
      </Text>
    </View>
  );
}

const SLOT_SIZE = 96;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[3],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  slotWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    borderStyle: 'dashed',
    gap: 6,
  },
  photo: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${colors.yellow}55`,
  },
  primaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.yellow,
    letterSpacing: 0.3,
  },
  addLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  controlBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    borderColor: `${colors.error}44`,
    backgroundColor: `${colors.error}10`,
  },
  controlBtnDisabled: {
    opacity: 0.35,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
  },
});
