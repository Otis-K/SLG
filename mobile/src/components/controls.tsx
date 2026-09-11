import type { ComponentType, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronRight, Info } from 'lucide-react-native';

import { colors, layout, radii, spacing, typeScale } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

type MenuRowProps = {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value?: string;
  tone?: 'green' | 'coral' | 'blue' | 'amber' | 'neutral';
  onPress?: () => void;
  last?: boolean;
};

export function MenuRow({ icon: Icon, label, value, tone = 'neutral', onPress, last = false }: MenuRowProps) {
  const iconTone = {
    green: { backgroundColor: colors.primarySoft, color: colors.primary },
    coral: { backgroundColor: colors.coralSoft, color: colors.coral },
    blue: { backgroundColor: colors.blueSoft, color: colors.blue },
    amber: { backgroundColor: colors.amberSoft, color: colors.amber },
    neutral: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !last && styles.menuRowBorder, pressed && styles.pressed]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconTone.backgroundColor }]}>
        <Icon color={iconTone.color} size={19} strokeWidth={2} />
      </View>
      <Text numberOfLines={2} style={styles.menuLabel}>{label}</Text>
      {value ? <Text numberOfLines={1} style={styles.menuValue}>{value}</Text> : null}
      <ChevronRight color={colors.textSubtle} size={18} />
    </Pressable>
  );
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <View style={[styles.segment, columns ? { flexWrap: 'wrap' } : null]}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segmentButton,
              columns ? { flexBasis: `${100 / columns}%`, flexGrow: 0 } : null,
              selected && styles.segmentButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChoiceGrid<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | '';
  options: readonly { value: T; label: string; detail?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceGrid}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{option.label}</Text>
            {option.detail ? <Text style={styles.choiceDetail}>{option.detail}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{children}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function NumberField({
  label,
  value,
  unit,
  placeholder,
  onChangeText,
  disabled = false,
  keyboardType = 'decimal-pad',
}: {
  label: string;
  value: string;
  unit: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View style={[styles.numberInputWrap, disabled && styles.disabled]}>
        <TextInput
          accessibilityLabel={label}
          editable={!disabled}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          style={styles.numberInput}
          value={value}
        />
        <Text style={styles.numberUnit}>{unit}</Text>
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  detail,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {detail ? <Text style={styles.toggleDetail}>{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor={colors.white}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        value={value}
      />
    </View>
  );
}

export function Notice({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  return (
    <View style={[styles.notice, tone === 'warning' && styles.noticeWarning, tone === 'danger' && styles.noticeDanger]}>
      <Info color={tone === 'danger' ? colors.danger : tone === 'warning' ? colors.amber : colors.textMuted} size={17} />
      <Text style={[styles.noticeText, tone === 'danger' && styles.noticeTextDanger]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  sectionLabel: {
    marginBottom: -spacing.sm,
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  menuRow: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  menuLabel: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
  menuValue: {
    maxWidth: 90,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
  },
  segment: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  segmentButton: {
    minWidth: 48,
    minHeight: layout.tapTarget,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  segmentButtonSelected: {
    backgroundColor: colors.surface,
  },
  segmentLabel: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
    textAlign: 'center',
  },
  segmentLabelSelected: {
    color: colors.primary,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    minHeight: 64,
    flexBasis: '48%',
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceLabel: {
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  choiceLabelSelected: {
    color: colors.primary,
  },
  choiceDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  fieldHint: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: typeScale.caption,
    textAlign: 'right',
  },
  numberField: {
    flex: 1,
    gap: spacing.sm,
  },
  numberLabel: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  numberInputWrap: {
    height: layout.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  numberInput: {
    minWidth: 0,
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
  numberUnit: {
    paddingRight: spacing.md,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
  },
  toggleRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
  toggleDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
    lineHeight: 17,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  noticeWarning: {
    backgroundColor: colors.amberSoft,
  },
  noticeDanger: {
    backgroundColor: colors.dangerSoft,
  },
  noticeText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 20,
  },
  noticeTextDanger: {
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
