import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  Info,
  LockKeyhole,
  Minus,
  Plus,
  Save,
  Search,
  Star,
  X,
} from 'lucide-react-native';

import { MEAL_IDS, MEAL_META, inferMeal } from '../config/frontendConfig';
import type { Food, FoodEntry, FoodTone, LocalDate, MealId, NewCustomFood } from '../domain/types';
import { useApp } from '../store/AppProvider';
import { colors, layout, radii, shadow, spacing, typeScale } from '../theme';
import { IconButton, PrimaryButton, QuietButton } from './ui';

type Stage = 'browse' | 'portion' | 'custom';
type ListTab = 'recent' | 'favorites';

export interface FoodRecordModalProps {
  visible: boolean;
  localDate: LocalDate;
  initialMealId?: MealId;
  editingEntry?: FoodEntry | null;
  onClose: () => void;
  onSaved?: (message: string) => void;
}

const UNIT_OPTIONS = ['克', '毫升', '份', '碗', '个', '根'] as const;

function numericValue(value: string, fallback = 0) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function foodColor(tone: FoodTone) {
  switch (tone) {
    case 'yellow': return colors.amberSoft;
    case 'coral': return colors.coralSoft;
    case 'blue': return colors.blueSoft;
    case 'green': return colors.primarySoft;
    case 'orange': return '#F5E7D8';
    default: return colors.surfaceMuted;
  }
}

export function FoodRecordModal({
  visible,
  localDate,
  initialMealId,
  editingEntry = null,
  onClose,
  onSaved,
}: FoodRecordModalProps) {
  const {
    data,
    addMealEntry,
    updateMealEntry,
    toggleFavorite,
    addCustomFood,
  } = useApp();
  const searchInputRef = useRef<TextInput>(null);
  const [stage, setStage] = useState<Stage>('browse');
  const [mealId, setMealId] = useState<MealId>(initialMealId ?? inferMeal());
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<ListTab>('recent');
  const [selectedFood, setSelectedFood] = useState<Food | FoodEntry | null>(null);
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState('份');
  const [pending, setPending] = useState(false);
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState({
    name: '',
    amount: '100',
    unit: '克',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  useEffect(() => {
    if (!visible) return;
    const targetMeal = editingEntry?.mealId ?? initialMealId ?? inferMeal();
    setMealId(targetMeal);
    setQuery('');
    setTab('recent');
    setError(null);
    setPending(false);
    setSelectedFood(editingEntry);
    setStage(editingEntry ? 'portion' : 'browse');
    setAmount(String(editingEntry?.amount ?? 1));
    setUnit(editingEntry?.unit ?? '份');
    setCustomForm({ name: '', amount: '100', unit: '克', calories: '', protein: '', carbs: '', fat: '' });

    if (!editingEntry) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 280);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [editingEntry, initialMealId, visible]);

  const favoriteIds = useMemo(() => new Set(data?.favorites ?? []), [data?.favorites]);
  const allFoods = useMemo(
    () => [...(data?.customFoods ?? []), ...(data?.foodCatalog ?? [])],
    [data?.customFoods, data?.foodCatalog],
  );
  const visibleFoods = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    return allFoods.filter((food) => {
      if (tab === 'favorites' && !favoriteIds.has(food.id)) return false;
      return !normalized || food.name.toLocaleLowerCase('zh-CN').includes(normalized) || food.detail.toLocaleLowerCase('zh-CN').includes(normalized);
    });
  }, [allFoods, favoriteIds, query, tab]);

  const adjustedFood = useMemo(() => {
    if (!selectedFood) return null;
    const nextAmount = Math.max(0, numericValue(amount));
    const baseAmount = selectedFood.amount > 0 ? selectedFood.amount : 1;
    const ratio = nextAmount / baseAmount;
    return {
      ...selectedFood,
      amount: nextAmount,
      unit,
      detail: `${nextAmount} ${unit}`,
      calories: selectedFood.calories * ratio,
      protein: selectedFood.protein * ratio,
      carbs: selectedFood.carbs * ratio,
      fat: selectedFood.fat * ratio,
    };
  }, [amount, selectedFood, unit]);

  const openPortion = (food: Food) => {
    setSelectedFood(food);
    setAmount(String(food.amount));
    setUnit(food.unit);
    setError(null);
    setStage('portion');
  };

  const quickAdd = async (food: Food) => {
    setPending(true);
    setError(null);
    try {
      await addMealEntry(localDate, mealId, food, food.amount, food.unit);
      onSaved?.(`${food.name}已记入${MEAL_META[mealId].label}`);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '记录失败，请重试。');
    } finally {
      setPending(false);
    }
  };

  const savePortion = async () => {
    if (!adjustedFood || adjustedFood.amount <= 0) {
      setError('份量必须大于 0。');
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (editingEntry) {
        await updateMealEntry(localDate, editingEntry.mealId, editingEntry.entryId, {
          amount: adjustedFood.amount,
          unit: adjustedFood.unit,
          detail: adjustedFood.detail,
          calories: adjustedFood.calories,
          protein: adjustedFood.protein,
          carbs: adjustedFood.carbs,
          fat: adjustedFood.fat,
        });
        onSaved?.('份量已更新');
      } else {
        await addMealEntry(localDate, mealId, adjustedFood, adjustedFood.amount, adjustedFood.unit);
        onSaved?.(`${adjustedFood.name}已记入${MEAL_META[mealId].label}`);
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败，请重试。');
    } finally {
      setPending(false);
    }
  };

  const saveCustom = async () => {
    const customFood: NewCustomFood = {
      name: customForm.name.trim(),
      amount: numericValue(customForm.amount),
      unit: customForm.unit,
      calories: numericValue(customForm.calories),
      protein: numericValue(customForm.protein),
      carbs: numericValue(customForm.carbs),
      fat: numericValue(customForm.fat),
      tone: 'green',
    };
    if (!customFood.name || customFood.amount <= 0 || customFood.calories <= 0) {
      setError('请填写食物名称、大于 0 的份量和能量。');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const createdFood = await addCustomFood(customFood);
      await addMealEntry(localDate, mealId, createdFood, createdFood.amount, createdFood.unit);
      onSaved?.(`${createdFood.name}已创建并记入${MEAL_META[mealId].label}`);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '创建失败，请重试。');
    } finally {
      setPending(false);
    }
  };

  const changeFavorite = async (foodId: string) => {
    setFavoritePendingId(foodId);
    setError(null);
    try {
      await toggleFavorite(foodId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '收藏状态更新失败。');
    } finally {
      setFavoritePendingId(null);
    }
  };

  const amountStep = unit === '克' || unit === '毫升' ? 10 : 0.5;
  const portionUnits = selectedFood?.unit ? [selectedFood.unit] : [];
  const customValid = Boolean(
    customForm.name.trim()
    && numericValue(customForm.amount) > 0
    && numericValue(customForm.calories) > 0,
  );

  if (!data) return null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <Pressable accessibilityLabel="关闭记录饮食" disabled={pending} onPress={onClose} style={styles.backdrop} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            {stage === 'browse' ? (
              <View style={styles.headerSpacer} />
            ) : (
              <IconButton accessibilityLabel="返回食物列表" disabled={pending} onPress={() => { setError(null); setStage('browse'); }}>
                <ArrowLeft color={colors.text} size={21} />
              </IconButton>
            )}
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {stage === 'browse' ? '记录饮食' : stage === 'portion' ? '确认份量' : '创建私人食物'}
              </Text>
              <Text style={styles.headerSubtitle}>{MEAL_META[mealId].label} · {localDate}</Text>
            </View>
            <IconButton accessibilityLabel="关闭" disabled={pending} onPress={onClose}>
              <X color={colors.text} size={21} />
            </IconButton>
          </View>

          {stage === 'browse' ? (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View accessibilityLabel="选择餐次" accessibilityRole="tablist" style={styles.segment}>
                {MEAL_IDS.map((id) => (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mealId === id }}
                    key={id}
                    onPress={() => setMealId(id)}
                    style={[styles.segmentButton, mealId === id && styles.segmentButtonActive]}
                  >
                    <Text style={[styles.segmentLabel, mealId === id && styles.segmentLabelActive]}>{MEAL_META[id].label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.searchField}>
                <Search color={colors.textMuted} size={19} />
                <TextInput
                  accessibilityLabel="搜索食物"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setQuery}
                  placeholder="搜索食物或品牌"
                  placeholderTextColor={colors.textSubtle}
                  ref={searchInputRef}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={query}
                />
                {query ? (
                  <IconButton accessibilityLabel="清空搜索" onPress={() => setQuery('')}>
                    <X color={colors.textMuted} size={18} />
                  </IconButton>
                ) : null}
              </View>

              <View accessibilityRole="tablist" style={styles.listTabs}>
                {(['recent', 'favorites'] as const).map((id) => (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === id }}
                    key={id}
                    onPress={() => setTab(id)}
                    style={[styles.listTab, tab === id && styles.listTabActive]}
                  >
                    <Text style={[styles.listTabText, tab === id && styles.listTabTextActive]}>{id === 'recent' ? '最近' : '收藏'}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.foodList}>
                {visibleFoods.map((food) => {
                  const isFavorite = favoriteIds.has(food.id);
                  return (
                    <View key={food.id} style={styles.foodRow}>
                      <Pressable accessibilityRole="button" onPress={() => openPortion(food)} style={({ pressed }) => [styles.foodMain, pressed && styles.rowPressed]}>
                        <View style={[styles.foodSwatch, { backgroundColor: foodColor(food.tone) }]}>
                          <Text style={styles.foodSwatchText}>{food.name.slice(0, 1)}</Text>
                        </View>
                        <View style={styles.foodText}>
                          <Text numberOfLines={1} style={styles.foodName}>{food.name}</Text>
                          <Text numberOfLines={1} style={styles.foodDetail}>{food.detail}</Text>
                        </View>
                        <Text style={styles.foodCalories}>{Math.round(food.calories)}<Text style={styles.foodCaloriesUnit}> kcal</Text></Text>
                      </Pressable>
                      <IconButton
                        accessibilityLabel={isFavorite ? `取消收藏${food.name}` : `收藏${food.name}`}
                        disabled={favoritePendingId === food.id}
                        onPress={() => changeFavorite(food.id)}
                      >
                        {favoritePendingId === food.id ? (
                          <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                          <Star color={isFavorite ? colors.amber : colors.textMuted} fill={isFavorite ? colors.amber : colors.transparent} size={19} />
                        )}
                      </IconButton>
                      <IconButton accessibilityLabel={`快速记录${food.name}`} disabled={pending} onPress={() => quickAdd(food)}>
                        <Plus color={colors.primary} size={21} />
                      </IconButton>
                    </View>
                  );
                })}
              </View>

              {visibleFoods.length === 0 ? (
                <View style={styles.emptyState}>
                  <Search color={colors.textSubtle} size={26} />
                  <Text style={styles.emptyTitle}>{query ? `没有找到“${query}”` : '暂无收藏食物'}</Text>
                  <Text style={styles.emptyBody}>可以创建一条仅自己可见的食物。</Text>
                </View>
              ) : null}

              {error ? <Text accessibilityLiveRegion="assertive" style={styles.errorText}>{error}</Text> : null}
              <QuietButton
                icon={<Plus color={colors.primary} size={18} />}
                label="创建私人食物"
                onPress={() => { setError(null); setStage('custom'); }}
              />
            </ScrollView>
          ) : null}

          {stage === 'portion' && adjustedFood && selectedFood ? (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.selectedHeading}>
                <View style={[styles.selectedSwatch, { backgroundColor: foodColor(selectedFood.tone) }]}>
                  <Text style={styles.selectedSwatchText}>{selectedFood.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.foodText}>
                  <Text style={styles.selectedName}>{selectedFood.name}</Text>
                  <Text style={styles.foodDetail}>{selectedFood.detail}</Text>
                </View>
              </View>

              <View style={styles.portionSection}>
                <Text style={styles.fieldLabel}>食用份量</Text>
                <View style={styles.stepper}>
                  <IconButton
                    accessibilityLabel="减少份量"
                    onPress={() => setAmount(String(Math.max(amountStep, numericValue(amount) - amountStep)))}
                    style={styles.stepButton}
                  >
                    <Minus color={colors.text} size={21} />
                  </IconButton>
                  <TextInput
                    accessibilityLabel="份量"
                    keyboardType="decimal-pad"
                    onChangeText={setAmount}
                    selectTextOnFocus
                    style={styles.amountInput}
                    value={amount}
                  />
                  <IconButton
                    accessibilityLabel="增加份量"
                    onPress={() => setAmount(String(numericValue(amount) + amountStep))}
                    style={styles.stepButton}
                  >
                    <Plus color={colors.text} size={21} />
                  </IconButton>
                </View>
                <ScrollView horizontal contentContainerStyle={styles.unitList} showsHorizontalScrollIndicator={false}>
                  {portionUnits.map((option) => (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: unit === option }}
                      key={option}
                      onPress={() => setUnit(option)}
                      style={[styles.unitButton, unit === option && styles.unitButtonActive]}
                    >
                      <Text style={[styles.unitText, unit === option && styles.unitTextActive]}>{option}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.nutritionGrid}>
                <NutritionCell label="能量" unit="kcal" value={Math.round(adjustedFood.calories)} />
                <NutritionCell label="蛋白质" unit="g" value={adjustedFood.protein.toFixed(1)} />
                <NutritionCell label="碳水" unit="g" value={adjustedFood.carbs.toFixed(1)} />
                <NutritionCell label="脂肪" unit="g" value={adjustedFood.fat.toFixed(1)} />
              </View>
              <View style={styles.note}>
                <Info color={colors.blue} size={17} />
                <Text style={styles.noteText}>营养值按原始单位同比换算；没有可靠换算表时不会跨单位转换。</Text>
              </View>
              {error ? <Text accessibilityLiveRegion="assertive" style={styles.errorText}>{error}</Text> : null}
              <PrimaryButton
                icon={<Check color={colors.white} size={19} />}
                label={editingEntry ? '保存份量' : `保存到${MEAL_META[mealId].label}`}
                loading={pending}
                onPress={savePortion}
              />
            </ScrollView>
          ) : null}

          {stage === 'custom' ? (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormField
                autoFocus
                label="食物名称"
                onChangeText={(name) => setCustomForm((current) => ({ ...current, name }))}
                placeholder="例如：家常牛肉面"
                value={customForm.name}
              />
              <View style={styles.twoColumns}>
                <FormField
                  keyboardType="decimal-pad"
                  label="标准份量"
                  onChangeText={(amountValue) => setCustomForm((current) => ({ ...current, amount: amountValue }))}
                  value={customForm.amount}
                  style={styles.flexField}
                />
                <View style={styles.flexField}>
                  <Text style={styles.fieldLabel}>单位</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.compactUnits}>
                      {UNIT_OPTIONS.slice(0, 4).map((option) => (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ checked: customForm.unit === option }}
                          key={option}
                          onPress={() => setCustomForm((current) => ({ ...current, unit: option }))}
                          style={[styles.compactUnit, customForm.unit === option && styles.unitButtonActive]}
                        >
                          <Text style={[styles.unitText, customForm.unit === option && styles.unitTextActive]}>{option}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              <FormField
                keyboardType="decimal-pad"
                label="能量（kcal）"
                onChangeText={(calories) => setCustomForm((current) => ({ ...current, calories }))}
                value={customForm.calories}
              />
              <View style={styles.threeColumns}>
                <FormField keyboardType="decimal-pad" label="蛋白质 g" onChangeText={(protein) => setCustomForm((current) => ({ ...current, protein }))} value={customForm.protein} style={styles.flexField} />
                <FormField keyboardType="decimal-pad" label="碳水 g" onChangeText={(carbs) => setCustomForm((current) => ({ ...current, carbs }))} value={customForm.carbs} style={styles.flexField} />
                <FormField keyboardType="decimal-pad" label="脂肪 g" onChangeText={(fat) => setCustomForm((current) => ({ ...current, fat }))} value={customForm.fat} style={styles.flexField} />
              </View>
              <View style={styles.note}>
                <LockKeyhole color={colors.primary} size={17} />
                <Text style={styles.noteText}>这条食物仅自己可见，不会进入公共食物库。</Text>
              </View>
              {error ? <Text accessibilityLiveRegion="assertive" style={styles.errorText}>{error}</Text> : null}
              <PrimaryButton
                disabled={!customValid}
                icon={<Save color={colors.white} size={18} />}
                label="创建并记录"
                loading={pending}
                onPress={saveCustom}
              />
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NutritionCell({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <View style={styles.nutritionCell}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>{value}<Text style={styles.nutritionUnit}> {unit}</Text></Text>
    </View>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
  placeholder?: string;
  autoFocus?: boolean;
  style?: object;
};

function FormField({ label, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={[styles.formField, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        selectTextOnFocus={inputProps.keyboardType === 'decimal-pad'}
        style={styles.formInput}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '94%',
    minHeight: '70%',
    overflow: 'hidden',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.canvas,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.md,
    ...(shadow ?? {}),
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    marginTop: spacing.sm,
    borderRadius: radii.round,
    backgroundColor: colors.borderStrong,
  },
  header: {
    minHeight: 68,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerSpacer: {
    width: layout.tapTarget,
    height: layout.tapTarget,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: spacing.xxs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  content: {
    padding: layout.pagePadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  segment: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceStrong,
  },
  segmentButton: {
    flex: 1,
    minHeight: layout.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
  },
  segmentLabel: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  searchField: {
    minHeight: layout.inputHeight,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: layout.inputHeight,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: typeScale.body,
  },
  listTabs: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listTab: {
    flex: 1,
    minHeight: layout.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  listTabActive: {
    borderBottomColor: colors.primary,
  },
  listTabText: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  listTabTextActive: {
    color: colors.primary,
  },
  foodList: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  foodRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  foodMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  foodSwatch: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  foodSwatchText: {
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '800',
  },
  foodText: {
    flex: 1,
    minWidth: 0,
  },
  foodName: {
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  foodDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  foodCalories: {
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  foodCaloriesUnit: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  emptyState: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    textAlign: 'center',
  },
  errorText: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: typeScale.bodySmall,
    lineHeight: 20,
  },
  selectedHeading: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedSwatch: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  selectedSwatchText: {
    color: colors.text,
    fontSize: typeScale.title,
    fontWeight: '800',
  },
  selectedName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  portionSection: {
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  amountInput: {
    width: 116,
    height: layout.inputHeight,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typeScale.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  unitList: {
    minWidth: '100%',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  unitButton: {
    minWidth: 64,
    minHeight: layout.tapTarget,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  unitButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  unitText: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  unitTextActive: {
    color: colors.primary,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  nutritionCell: {
    minWidth: '47%',
    flexGrow: 1,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  nutritionLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  nutritionValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  nutritionUnit: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '500',
  },
  note: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.blueSoft,
  },
  noteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 20,
  },
  formField: {
    gap: spacing.sm,
  },
  formInput: {
    minHeight: layout.inputHeight,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typeScale.body,
  },
  twoColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  threeColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flexField: {
    flex: 1,
    minWidth: 0,
  },
  compactUnits: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  compactUnit: {
    minWidth: layout.tapTarget,
    minHeight: layout.tapTarget,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
});
