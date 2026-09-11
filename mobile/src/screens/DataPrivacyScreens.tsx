import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  Cloud,
  CloudOff,
  DatabaseBackup,
  Download,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';

import { Card, MenuRow, Notice, SectionLabel, ToggleRow } from '../components/controls';
import { PrimaryButton, Screen, ScreenHeader, SecondaryButton, StatusPill } from '../components/ui';
import { useApp } from '../store/AppProvider';
import { colors, radii, spacing, typeScale } from '../theme';

export function DataScreen({ onBack }: { onBack: () => void }) {
  const { data, mode, setBackupState, updateConsents, resetAll } = useApp();
  const [working, setWorking] = useState(false);
  const [exporting, setExporting] = useState(false);
  if (!data) return null;

  const cloudEnabled = data.consents.cloudBackup;

  const runBackup = async () => {
    try {
      setWorking(true);
      await setBackupState('syncing');
      await new Promise((resolve) => setTimeout(resolve, 900));
      await setBackupState('synced', '刚刚');
      Alert.alert('备份完成', '当前设备的最新快照已标记为同步完成。');
    } catch (error) {
      await setBackupState('failed').catch(() => undefined);
      Alert.alert('备份失败', error instanceof Error ? error.message : '无法完成云备份');
    } finally {
      setWorking(false);
    }
  };

  const exportData = async () => {
    try {
      setExporting(true);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File(Paths.cache, `shiliange-export-${stamp}.json`);
      file.create({ overwrite: true, intermediates: true });
      file.write(JSON.stringify({ exportedAt: new Date().toISOString(), schemaVersion: data.schemaVersion, data }, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: '导出食练格数据',
          mimeType: 'application/json',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('数据已导出', file.uri);
      }
    } catch (error) {
      Alert.alert('导出失败', error instanceof Error ? error.message : '无法生成导出文件');
    } finally {
      setExporting(false);
    }
  };

  const enableCloud = () => {
    Alert.alert(
      '开启云备份',
      '云端使用服务端加密保存快照，但这不是端到端加密。',
      [
        { text: '取消', style: 'cancel' },
        { text: '同意并开启', onPress: () => updateConsents({ cloudBackup: true }).catch(showError) },
      ],
    );
  };

  const deleteCloud = () => {
    Alert.alert(
      '删除云端备份？',
      '在线快照将进入删除流程并关闭自动备份，本机记录不会删除。',
      [
        { text: '取消', style: 'cancel' },
        { text: '删除并关闭', style: 'destructive', onPress: () => updateConsents({ cloudBackup: false }).catch(showError) },
      ],
    );
  };

  const confirmReset = () => {
    Alert.alert(
      '清除本机全部数据？',
      mode === 'api'
        ? '本机缓存会被删除，随后重新读取后端数据；此操作不会删除服务器上的账号或云端记录。'
        : '饮食、训练、体重、目标与设置都会删除，随后重新进入首次使用流程。此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        { text: '清除全部数据', style: 'destructive', onPress: () => resetAll().catch(showError) },
      ],
    );
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader title="数据与云备份" subtitle="本地优先 · 单设备备份" onBack={onBack} />

      <Card style={styles.backupHero}>
        <View style={[styles.heroIcon, !cloudEnabled && styles.heroIconOff]}>
          {cloudEnabled ? <Cloud color={colors.primary} size={27} /> : <CloudOff color={colors.textMuted} size={27} />}
        </View>
        <View style={styles.heroText}>
          <View style={styles.backupLabelRow}>
            <Text style={styles.heroLabel}>云备份</Text>
            <StatusPill
              label={cloudEnabled ? (data.backup.state === 'failed' ? '需重试' : '已开启') : '仅本机'}
              tone={cloudEnabled && data.backup.state !== 'failed' ? 'success' : data.backup.state === 'failed' ? 'danger' : 'neutral'}
            />
          </View>
          <Text style={styles.heroTitle}>
            {!cloudEnabled ? '仅保存在本机' : data.backup.state === 'syncing' ? '正在备份…' : data.backup.state === 'failed' ? '上次备份失败' : '已安全备份'}
          </Text>
          <Text style={styles.heroDetail}>{cloudEnabled ? `最后成功：${data.backup.lastSuccessfulLabel}` : '换机前请先导出本地 JSON'}</Text>
        </View>
      </Card>

      {cloudEnabled ? (
        <SecondaryButton icon={<RefreshCw color={colors.primary} size={18} />} label="立即备份" loading={working} onPress={runBackup} />
      ) : (
        <PrimaryButton icon={<Cloud color={colors.white} size={18} />} label="开启云备份" onPress={enableCloud} />
      )}

      <SectionLabel>你的数据</SectionLabel>
      <Card>
        <MenuRow icon={Download} label="导出全部数据" onPress={exportData} tone="green" value={exporting ? '生成中' : 'JSON'} />
        <MenuRow
          icon={DatabaseBackup}
          label="换机恢复演示"
          onPress={() => Alert.alert('换机恢复', `将校验 ${data.backup.lastSuccessfulLabel} 的最近快照，确认无误后才会激活新设备。`)}
          tone="blue"
          last
        />
      </Card>

      <Notice>当前版本的云备份是状态与协议原型；本地 JSON 导出会真实生成文件并调用系统分享。</Notice>

      <SectionLabel>云端操作</SectionLabel>
      <Card>
        {cloudEnabled ? (
          <MenuRow icon={Trash2} label="删除云端备份" onPress={deleteCloud} tone="coral" last />
        ) : (
          <MenuRow icon={Cloud} label="重新开启云备份" onPress={enableCloud} tone="green" last />
        )}
      </Card>

      <SectionLabel>本机操作</SectionLabel>
      <Card>
        <MenuRow icon={RotateCcw} label="清除本机全部数据" onPress={confirmReset} tone="coral" last />
      </Card>
    </Screen>
  );
}

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  const { data, updateConsents } = useApp();
  const [saving, setSaving] = useState(false);
  if (!data) return null;

  const update = async (patch: Parameters<typeof updateConsents>[0]) => {
    try {
      setSaving(true);
      await updateConsents(patch);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleHealth = (next: boolean) => {
    Alert.alert(
      next ? '同意健康资料处理' : '撤回健康资料处理同意',
      next
        ? '仅用于保存身体资料、饮食、训练与生成一般健康管理计划。'
        : '撤回后会同时关闭云备份；已有本机记录不会自动删除。',
      [
        { text: '取消', style: 'cancel' },
        { text: next ? '同意' : '撤回', style: next ? 'default' : 'destructive', onPress: () => update({ healthProfileProcessing: next }) },
      ],
    );
  };

  const toggleCloud = (next: boolean) => {
    if (next && !data.consents.healthProfileProcessing) {
      Alert.alert('需要健康资料处理同意', '请先开启健康资料处理，再开启云备份。');
      return;
    }
    Alert.alert(
      next ? '开启云备份' : '关闭云备份',
      next ? '云端快照使用服务端加密，这不是端到端加密。' : '关闭后不再上传新快照，本机数据保留。',
      [
        { text: '取消', style: 'cancel' },
        { text: next ? '同意并开启' : '关闭', onPress: () => update({ cloudBackup: next }) },
      ],
    );
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader title="隐私与账户" subtitle="同意可撤回 · 权限最小化" onBack={onBack} />

      <Card style={styles.privacyHero}>
        <View style={styles.privacyIcon}><ShieldCheck color={colors.blue} size={27} /></View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>健康资料由你控制</Text>
          <Text style={styles.heroDetail}>本机优先保存，授权用途分开说明，可随时撤回。</Text>
        </View>
      </Card>

      <SectionLabel>单独同意</SectionLabel>
      <Card>
        <ToggleRow
          detail="用于身体资料、饮食、训练和一般健康管理计划"
          disabled={saving}
          label="健康资料处理"
          onValueChange={toggleHealth}
          value={data.consents.healthProfileProcessing}
        />
        <View style={styles.toggleDivider} />
        <ToggleRow
          detail="将本机快照发送到云端，便于换机恢复"
          disabled={saving || !data.consents.healthProfileProcessing}
          label="云备份"
          onValueChange={toggleCloud}
          value={data.consents.cloudBackup}
        />
      </Card>

      <SectionLabel>保护方式</SectionLabel>
      <Card>
        <Fact icon={LockKeyhole} label="本地数据库" value="SQLCipher 加密" />
        <Fact icon={KeyRound} label="密钥" value="系统安全存储" />
        <Fact icon={Download} label="数据权利" value="可导出、可删除" last />
      </Card>

      <Notice tone="warning">食练格提供一般健康管理工具，不替代医生、注册营养师或专业教练的诊断与处方。</Notice>
    </Screen>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  last = false,
}: {
  icon: typeof LockKeyhole;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.factRow, !last && styles.factBorder]}>
      <View style={styles.factIcon}><Icon color={colors.primary} size={18} /></View>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function showError(error: unknown) {
  Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试');
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  backupHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  heroIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  heroIconOff: {
    backgroundColor: colors.surfaceMuted,
  },
  heroText: {
    minWidth: 0,
    flex: 1,
  },
  backupLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  heroTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  heroDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
    lineHeight: 17,
  },
  privacyHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  privacyIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.blueSoft,
  },
  toggleDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
    backgroundColor: colors.border,
  },
  factRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  factBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  factIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  factLabel: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  factValue: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
  },
});
