import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useCitySearch } from '../../hooks/useCitySearch';
import { updateProfile } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, spacing, radius } from '../../theme';

interface Props {
  visible: boolean;
  selectedCity: string;
  onSelect: (city: string) => void;
  onClose: () => void;
}

export function CityPickerModal({ visible, selectedCity, onSelect, onClose }: Props) {
  const appUser = useAuthStore((s) => s.appUser);
  const favoriteCities: string[] = appUser?.favoriteCities ?? [];
  const { results, loading, search, clear } = useCitySearch();
  const [query, setQuery] = useState('');

  function handleQueryChange(val: string) {
    setQuery(val);
    search(val);
  }

  function handleSelect(city: string) {
    onSelect(city);
    clear();
    setQuery('');
    onClose();
  }

  async function handleToggleFavorite(city: string) {
    if (!appUser) return;
    const isFav = favoriteCities.includes(city);
    const updated = isFav
      ? favoriteCities.filter((c) => c !== city)
      : [...favoriteCities, city];
    await updateProfile({ favoriteCities: updated });
  }

  const showSearch = query.trim().length >= 2;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Choose City</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search cities..."
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {loading && <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />}
        </View>

        {showSearch ? (
          <FlatList
            data={results}
            keyExtractor={(item, i) => `${item.lat}-${item.lon}-${i}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              !loading ? (
                <Text style={styles.emptyText}>No results for "{query}"</Text>
              ) : null
            }
            renderItem={({ item }) => {
              const isFav = favoriteCities.includes(item.name);
              const isSelected = selectedCity === item.name;
              return (
                <View style={[styles.cityRow, isSelected && styles.cityRowSelected]}>
                  <TouchableOpacity
                    style={styles.cityInfo}
                    onPress={() => handleSelect(item.name)}
                  >
                    <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                      {item.name}
                    </Text>
                    <Text style={styles.cityMeta} numberOfLines={1}>{item.displayName}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.favBtn}
                    onPress={() => handleToggleFavorite(item.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.favIcon, isFav && styles.favIconActive]}>
                      {isFav ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        ) : (
          <View style={styles.list}>
            <TouchableOpacity
              style={[styles.cityRow, !selectedCity && styles.cityRowSelected]}
              onPress={() => handleSelect('')}
            >
              <View style={styles.cityInfo}>
                <Text style={[styles.cityName, !selectedCity && styles.cityNameSelected]}>
                  All Cities
                </Text>
                <Text style={styles.cityMeta}>Show rooms in every city</Text>
              </View>
            </TouchableOpacity>

            {favoriteCities.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Favorites</Text>
                {favoriteCities.map((city) => {
                  const isSelected = selectedCity === city;
                  return (
                    <View key={city} style={[styles.cityRow, isSelected && styles.cityRowSelected]}>
                      <TouchableOpacity
                        style={styles.cityInfo}
                        onPress={() => handleSelect(city)}
                      >
                        <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                          {city}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.favBtn}
                        onPress={() => handleToggleFavorite(city)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.favIcon, styles.favIconActive]}>★</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}

            {appUser?.city && !favoriteCities.includes(appUser.city) && (
              <>
                <Text style={styles.sectionLabel}>Your City</Text>
                <View style={[styles.cityRow, selectedCity === appUser.city && styles.cityRowSelected]}>
                  <TouchableOpacity
                    style={styles.cityInfo}
                    onPress={() => handleSelect(appUser.city)}
                  >
                    <Text style={[styles.cityName, selectedCity === appUser.city && styles.cityNameSelected]}>
                      {appUser.city}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.favBtn}
                    onPress={() => handleToggleFavorite(appUser.city)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.favIcon}>☆</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {favoriteCities.length === 0 && !appUser?.city && (
              <Text style={styles.hint}>
                Search for a city above, then tap ☆ to save it as a favorite.
              </Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const SHEET_HEIGHT = 480;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing[5],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[5],
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.white,
  },
  spinner: { marginLeft: 8 },
  list: {
    paddingHorizontal: spacing[5],
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  cityRowSelected: {
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cityInfo: { flex: 1 },
  cityName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.offwhite,
  },
  cityNameSelected: { color: colors.primary },
  cityMeta: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
  favBtn: {
    paddingLeft: 12,
  },
  favIcon: {
    fontSize: 20,
    color: colors.muted,
  },
  favIconActive: {
    color: colors.yellow,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    paddingTop: 24,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingTop: 32,
    paddingHorizontal: 8,
  },
});
