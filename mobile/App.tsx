import { NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Home, UserRound } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState, LoadingState, Screen } from './src/components/ui';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { DataScreen, PrivacyScreen } from './src/screens/DataPrivacyScreens';
import { FoodsScreen } from './src/screens/FoodsScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { MyScreen } from './src/screens/MyScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { TemplatesScreen } from './src/screens/TemplatesScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TrainingPlanScreen } from './src/screens/TrainingPlanScreen';
import { TrendsScreen } from './src/screens/TrendsScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { AppProvider, useApp } from './src/store/AppProvider';
import { colors, radii, spacing, typeScale } from './src/theme';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const navigationTheme: NavigationTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.canvas,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.coral,
  },
  fonts: {
    regular: { fontFamily: 'sans-serif', fontWeight: '400' },
    medium: { fontFamily: 'sans-serif-medium', fontWeight: '500' },
    bold: { fontFamily: 'sans-serif', fontWeight: '700' },
    heavy: { fontFamily: 'sans-serif', fontWeight: '800' },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <AppGate />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function AppGate() {
  const { status, error, retry, data, label } = useApp();

  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <LoadingState label={`正在通过${label}读取数据`} />
      </Screen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error?.message ?? '应用数据不可用'} onRetry={() => retry().catch(() => undefined)} />
      </Screen>
    );
  }

  if (data.onboardingRequired) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator initialRouteName="Main" screenOptions={{ animation: 'slide_from_right', headerShown: false }}>
        <RootStack.Screen component={MainTabs} name="Main" />
        <RootStack.Screen name="Workout">
          {({ navigation }) => <WorkoutScreen onBack={navigation.goBack} />}
        </RootStack.Screen>
        <RootStack.Screen name="Goals">
          {({ navigation }) => <GoalsScreen onBack={navigation.goBack} />}
        </RootStack.Screen>
        <RootStack.Screen name="TrainingPlan">
          {({ navigation }) => <TrainingPlanScreen onBack={navigation.goBack} />}
        </RootStack.Screen>
        <RootStack.Screen name="Trends">
          {({ navigation }) => <TrendsScreen onBack={navigation.goBack} />}
        </RootStack.Screen>
        <RootStack.Screen name="Foods">
          {({ navigation }) => <FoodsScreen onBack={navigation.goBack} />}
        </RootStack.Screen>
        <RootStack.Screen name="Templates">
          {({ navigation }) => <TemplatesScreen onBack={navigation.goBack} />}
        </RootStack.Screen>
        <RootStack.Screen name="Data">
          {({ navigation }) => <DataScreen onBack={navigation.goBack} />}
        </RootStack.Screen>
        <RootStack.Screen name="Privacy">
          {({ navigation }) => <PrivacyScreen onBack={navigation.goBack} />}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function MainTabs({ navigation }: NativeStackScreenProps<RootStackParamList, 'Main'>) {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="Today"
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2} />,
          tabBarLabel: '今日',
          title: '今日',
        }}
      >
        {() => (
          <TodayScreen
            onOpenData={() => navigation.navigate('Data')}
            onOpenPrivacy={() => navigation.navigate('Privacy')}
            onOpenWorkout={() => navigation.navigate('Workout')}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="My"
        options={{
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} strokeWidth={2} />,
          tabBarLabel: '我的',
          title: '我的',
        }}
      >
        {() => <MyScreen onNavigate={(route) => navigation.navigate(route)} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: 60,
    paddingTop: spacing.xs,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    elevation: 8,
  },
  tabItem: {
    marginHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  tabLabel: {
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
});
