import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ArrowLeft, CircleAlert, Grid2X2, RotateCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, radii, shadow, spacing, typeScale } from '../theme';

type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  accessibilityLabel: string;
  children: ReactNode;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  accessibilityLabel,
  children,
  danger = false,
  disabled,
  style,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        danger && styles.iconButtonDanger,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

type CommandButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  icon?: ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function CommandButton({
  label,
  icon,
  loading = false,
  disabled,
  style,
  textStyle,
  variant,
  ...props
}: CommandButtonProps & { variant: 'primary' | 'secondary' | 'quiet' }) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.commandButton,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'quiet' && styles.quietButton,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} size="small" />
      ) : (
        icon
      )}
      <Text
        numberOfLines={2}
        style={[
          styles.commandLabel,
          variant === 'primary' && styles.primaryButtonLabel,
          variant !== 'primary' && styles.secondaryButtonLabel,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton(props: CommandButtonProps) {
  return <CommandButton {...props} variant="primary" />;
}

export function SecondaryButton(props: CommandButtonProps) {
  return <CommandButton {...props} variant="secondary" />;
}

export function QuietButton(props: CommandButtonProps) {
  return <CommandButton {...props} variant="quiet" />;
}

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  testID?: string;
};

export function Screen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  testID,
}: ScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.safeArea, style]} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentContainerStyle]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenContent, styles.screenFlex, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View accessibilityLabel="食练格" style={styles.logo}>
      <View style={[styles.logoMark, compact && styles.logoMarkCompact]}>
        <Grid2X2 color={colors.white} size={compact ? 16 : 18} strokeWidth={2.5} />
      </View>
      <Text style={[styles.logoText, compact && styles.logoTextCompact]}>食练格</Text>
    </View>
  );
}

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
};

export function ScreenHeader({ title, subtitle, onBack, action }: ScreenHeaderProps) {
  return (
    <View style={styles.screenHeader}>
      {onBack ? (
        <IconButton accessibilityLabel="返回" onPress={onBack}>
          <ArrowLeft color={colors.text} size={21} />
        </IconButton>
      ) : (
        <View style={styles.headerSpacer} />
      )}
      <View style={styles.headerText}>
        <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

export function ProgressBar({
  value,
  color = colors.primary,
  trackColor = colors.surfaceStrong,
  accessibilityLabel,
}: {
  value: number;
  color?: string;
  trackColor?: string;
  accessibilityLabel?: string;
}) {
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={[styles.progressTrack, { backgroundColor: trackColor }]}
    >
      <View style={[styles.progressFill, { backgroundColor: color, width: `${percent}%` }]} />
    </View>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'success' && styles.pillSuccess,
        tone === 'warning' && styles.pillWarning,
        tone === 'danger' && styles.pillDanger,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === 'success' && styles.pillTextSuccess,
          tone === 'warning' && styles.pillTextWarning,
          tone === 'danger' && styles.pillTextDanger,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function LoadingState({ label = '正在读取数据' }: { label?: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.stateView}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.stateTitle}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View accessibilityLiveRegion="assertive" style={styles.stateView}>
      <View style={styles.errorIcon}>
        <CircleAlert color={colors.danger} size={24} />
      </View>
      <Text style={styles.stateTitle}>暂时无法读取数据</Text>
      <Text style={styles.stateBody}>{message}</Text>
      {onRetry ? <SecondaryButton icon={<RotateCw color={colors.primary} size={18} />} label="重试" onPress={onRetry} /> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  screenContent: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: layout.contentGap,
  },
  screenFlex: {
    flex: 1,
  },
  iconButton: {
    width: layout.tapTarget,
    height: layout.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  iconButtonDanger: {
    backgroundColor: colors.dangerSoft,
  },
  commandButton: {
    minHeight: layout.tapTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  quietButton: {
    backgroundColor: colors.transparent,
  },
  commandLabel: {
    fontSize: typeScale.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButtonLabel: {
    color: colors.white,
  },
  secondaryButtonLabel: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.42,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkCompact: {
    width: 30,
    height: 30,
  },
  logoText: {
    color: colors.text,
    fontSize: typeScale.title,
    fontWeight: '800',
  },
  logoTextCompact: {
    fontSize: 18,
  },
  screenHeader: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: typeScale.title,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: radii.round,
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.round,
  },
  pill: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
  },
  pillSuccess: {
    backgroundColor: colors.primarySoft,
  },
  pillWarning: {
    backgroundColor: colors.amberSoft,
  },
  pillDanger: {
    backgroundColor: colors.dangerSoft,
  },
  pillText: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  pillTextSuccess: {
    color: colors.primary,
  },
  pillTextWarning: {
    color: colors.amber,
  },
  pillTextDanger: {
    color: colors.danger,
  },
  stateView: {
    flex: 1,
    minHeight: 360,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
  stateTitle: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateBody: {
    maxWidth: 320,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 21,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});

export const surfaceShadow: ViewStyle = shadow ?? {};
