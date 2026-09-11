import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus, Star, X } from 'lucide-react-native';

import { Card, NumberField } from '../components/controls';
import { IconButton, PrimaryButton, Screen, ScreenHeader } from '../components/ui';
import type { NewCustomFood } from '../domain/types';
import { useApp } from '../store/AppProvider';
import { colors, layout, radii, spacing, typeScale } from '../theme';

const EMPTY_FORM = {
  name: '',
  amount: '100',
  unit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
};

export function FoodsScreen({ onBack }: { onBack: () => void }) {
  const { data, toggleFavorite, addCustomFood } = useApp();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const items = useMemo(() => {
    if (!data) return [];
    const favoriteFoods = data.foodCatalog.filter((food) => data.favorites.includes(food.id));
    const seen = new Set(favoriteFoods.map((food) => food.id));
    return [...favoriteFoods, ...data.customFoods.filter((food) => !seen.has(food.id))];
  }, [data]);

  if (!data) return null;

  const createFood = async () => {
    const input: NewCustomFood = {
      name: form.name.trim(),
      amount: Number(form.amount),
      unit: form.unit.trim() || 'g',
      calories: Number(form.calories),
      protein: Number(form.protein),
      carbs: Number(form.carbs),
      fat: Number(form.fat),
      tone: 'green',
    };
    if (!input.name || !Number.isFinite(input.amount) || input.amount <= 0 || !Number.isFinite(input.calories)) {
      Alert.alert('资料不完整', '请填写名称、基准份量和能量。');
      return;
    }
    try {
      setSaving(true);
      await addCustomFood(input);
      setForm(EMPTY_FORM);
      setCreating(false);
    } catch (error) {
      Alert.alert('创建失败', error instanceof Error ? error.message : '无法创建私人食物');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        action={(
          <IconButton accessibilityLabel="创建私人食物" onPress={() => setCreating(true)}>
            <Plus color={colors.text} size={21} />
          </IconButton>
        )}
        onBack={onBack}
        subtitle={`${items.length} 条收藏与私人食物`}
        title="我的食物"
      />

      {items.length ? (
        <Card>
          {items.map((food, index) => {
            const favorite = data.favorites.includes(food.id);
            return (
              <View key={food.id} style={[styles.foodRow, index < items.length - 1 && styles.foodBorder]}>
                <View style={[styles.swatch, swatchTone(food.tone)]}>
                  <Text style={styles.swatchText}>{food.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.foodText}>
                  <Text numberOfLines={1} style={styles.foodName}>{food.name}</Text>
                  <Text numberOfLines={2} style={styles.foodDetail}>{food.detail} · {food.calories} kcal</Text>
                </View>
                <IconButton accessibilityLabel={`${favorite ? '取消收藏' : '收藏'}${food.name}`} onPress={() => toggleFavorite(food.id)}>
                  <Star color={favorite ? colors.amber : colors.textSubtle} fill={favorite ? colors.amber : colors.transparent} size={19} />
                </IconButton>
              </View>
            );
          })}
        </Card>
      ) : (
        <View style={styles.empty}>
          <Star color={colors.textSubtle} size={28} />
          <Text style={styles.emptyTitle}>还没有收藏或私人食物</Text>
          <Text style={styles.emptyDetail}>可在饮食记录中收藏常吃食物，或在这里创建私人食物。</Text>
          <PrimaryButton icon={<Plus color={colors.white} size={18} />} label="创建私人食物" onPress={() => setCreating(true)} />
        </View>
      )}

      <Modal animationType="slide" onRequestClose={() => setCreating(false)} transparent visible={creating}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>创建私人食物</Text>
                <Text style={styles.sheetDetail}>营养值按基准份量填写</Text>
              </View>
              <IconButton accessibilityLabel="关闭" onPress={() => setCreating(false)}>
                <X color={colors.textMuted} size={20} />
              </IconButton>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.textField}>
                <Text style={styles.label}>食物名称</Text>
                <TextInput
                  accessibilityLabel="食物名称"
                  onChangeText={(name) => setForm((current) => ({ ...current, name }))}
                  placeholder="例如 自制鸡肉卷"
                  placeholderTextColor={colors.textSubtle}
                  selectionColor={colors.primary}
                  style={styles.input}
                  value={form.name}
                />
              </View>
              <View style={styles.twoColumns}>
                <NumberField label="基准份量" onChangeText={(amount) => setForm((current) => ({ ...current, amount }))} unit={form.unit || 'g'} value={form.amount} />
                <View style={styles.textFieldSmall}>
                  <Text style={styles.label}>单位</Text>
                  <TextInput
                    accessibilityLabel="单位"
                    onChangeText={(unit) => setForm((current) => ({ ...current, unit }))}
                    selectionColor={colors.primary}
                    style={styles.input}
                    value={form.unit}
                  />
                </View>
              </View>
              <NumberField label="能量" onChangeText={(calories) => setForm((current) => ({ ...current, calories }))} placeholder="例如 320" unit="kcal" value={form.calories} />
              <View style={styles.twoColumns}>
                <NumberField label="蛋白质" onChangeText={(protein) => setForm((current) => ({ ...current, protein }))} unit="g" value={form.protein} />
                <NumberField label="碳水" onChangeText={(carbs) => setForm((current) => ({ ...current, carbs }))} unit="g" value={form.carbs} />
              </View>
              <NumberField label="脂肪" onChangeText={(fat) => setForm((current) => ({ ...current, fat }))} unit="g" value={form.fat} />
              <PrimaryButton label="保存私人食物" loading={saving} onPress={createFood} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function swatchTone(tone: string) {
  if (tone === 'coral') return { backgroundColor: colors.coralSoft };
  if (tone === 'blue') return { backgroundColor: colors.blueSoft };
  if (tone === 'yellow' || tone === 'orange') return { backgroundColor: colors.amberSoft };
  if (tone === 'green') return { backgroundColor: colors.primarySoft };
  return { backgroundColor: colors.surfaceMuted };
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  foodRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
  },
  foodBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  swatch: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  swatchText: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  foodText: {
    minWidth: 0,
    flex: 1,
  },
  foodName: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  foodDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
    lineHeight: 16,
  },
  empty: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  emptyDetail: {
    maxWidth: 280,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '92%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  sheetHeader: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: typeScale.title,
    fontWeight: '800',
  },
  sheetDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  form: {
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  textField: {
    gap: spacing.sm,
  },
  textFieldSmall: {
    flex: 1,
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  input: {
    height: layout.inputHeight,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
