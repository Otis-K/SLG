import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Dumbbell, Plus } from 'lucide-react-native';

import { Card } from '../components/controls';
import { IconButton, Screen, ScreenHeader } from '../components/ui';
import { useApp } from '../store/AppProvider';
import { colors, radii, spacing, typeScale } from '../theme';

export function TemplatesScreen({ onBack }: { onBack: () => void }) {
  const { data } = useApp();
  if (!data) return null;

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        action={(
          <IconButton accessibilityLabel="新建训练模板" onPress={() => Alert.alert('新建训练模板', '模板编辑器将在下一版本开放。')}>
            <Plus color={colors.text} size={21} />
          </IconButton>
        )}
        onBack={onBack}
        subtitle="模板更新不会改写历史训练"
        title="训练模板"
      />
      <Card>
        {data.trainingTemplates.map((template, index) => (
          <Pressable
            accessibilityRole="button"
            key={template.id}
            onPress={() => Alert.alert(template.name, template.detail)}
            style={({ pressed }) => [styles.row, index < data.trainingTemplates.length - 1 && styles.border, pressed && styles.pressed]}
          >
            <View style={styles.iconWrap}><Dumbbell color={colors.coral} size={19} /></View>
            <View style={styles.text}>
              <Text style={styles.name}>{template.name}</Text>
              <Text numberOfLines={2} style={styles.detail}>{template.detail}</Text>
            </View>
            <ChevronRight color={colors.textSubtle} size={18} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.coralSoft,
  },
  text: {
    minWidth: 0,
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  detail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.68,
  },
});
