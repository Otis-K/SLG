import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleUserRound,
  ClipboardList,
  Cloud,
  CloudOff,
  Copy,
  DatabaseBackup,
  Download,
  Dumbbell,
  FileArchive,
  Grid2X2,
  HelpCircle,
  Home,
  Info,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  Utensils,
  Weight,
  WifiOff,
  X,
} from 'lucide-react';
import {
  ACTIVITY_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  HEALTH_RISK_OPTIONS,
  MEAL_META,
  NUTRIENT_FIELDS,
  ONBOARDING_DEFAULTS,
  PACE_OPTIONS,
  PROFILE_LIMITS,
  SEX_OPTIONS,
  TRAINING_DAY_OPTIONS,
  TRAINING_PLACE_OPTIONS,
  TRAINING_SESSION_MINUTES,
  WEEK_DAYS,
  WIREFRAME_SCENES,
} from './data.js';
import { appDataSource } from './data-source/index.js';
import { useAppData } from './hooks/useAppData.js';

const VIEW_META = {
  onboarding: { label: '首次使用', icon: CircleUserRound },
  home: { label: '今日', icon: Home },
  food: { label: '记录饮食', icon: Utensils },
  workout: { label: '训练执行', icon: Dumbbell },
  my: { label: '我的', icon: UserRound },
  goals: { label: '饮食目标', icon: Target },
  plan: { label: '训练计划', icon: ClipboardList },
  trends: { label: '数据趋势', icon: TrendingUp },
  data: { label: '数据与备份', icon: DatabaseBackup },
  privacy: { label: '隐私与账户', icon: ShieldCheck },
};

const cnDate = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function sumMeals(meals) {
  return Object.values(meals)
    .flat()
    .reduce(
      (total, item) => ({
        calories: total.calories + (Number(item.calories) || 0),
        protein: total.protein + (Number(item.protein) || 0),
        carbs: total.carbs + (Number(item.carbs) || 0),
        fat: total.fat + (Number(item.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

function mealCalories(items) {
  return Math.round(items.reduce((total, item) => total + (Number(item.calories) || 0), 0));
}

function inferMeal() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10.5) return 'breakfast';
  if (hour >= 10.5 && hour < 14.5) return 'lunch';
  if (hour >= 17 && hour < 21.5) return 'dinner';
  return 'snack';
}

function IconButton({ label, children, className = '', ...props }) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

function AppLogo({ compact = false }) {
  return (
    <div className={`app-logo ${compact ? 'app-logo--compact' : ''}`} aria-label="食练格">
      <span className="logo-mark" aria-hidden="true">
        <Grid2X2 size={compact ? 16 : 18} strokeWidth={2.4} />
      </span>
      <span>食练格</span>
    </div>
  );
}

function StatusPill({ icon: Icon, children, tone = 'neutral' }) {
  return (
    <span className={`status-pill status-pill--${tone}`}>
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function App() {
  const [mode, setMode] = useState('prototype');
  const [view, setView] = useState('home');
  const [resetKey, setResetKey] = useState(0);

  const jumpTo = (nextView) => {
    setMode('prototype');
    setView(nextView);
  };

  return (
    <main className="prototype-studio">
      <aside className="studio-sidebar" aria-label="原型工作台">
        <div className="studio-brand">
          <AppLogo />
          <span>移动端原型 · v0.1</span>
        </div>

        <div className="mode-switch" role="group" aria-label="查看模式">
          <button className={mode === 'prototype' ? 'is-active' : ''} onClick={() => setMode('prototype')}>
            交互原型
          </button>
          <button className={mode === 'wireframe' ? 'is-active' : ''} onClick={() => setMode('wireframe')}>
            线框总览
          </button>
          <button className={mode === 'prd' ? 'is-active' : ''} onClick={() => setMode('prd')}>
            PRD
          </button>
        </div>

        <nav className="scene-nav" aria-label="原型页面">
          <span className="sidebar-label">页面与流程</span>
          {Object.entries(VIEW_META).map(([id, item]) => {
            const Icon = item.icon;
            return (
              <button
                key={id}
                className={mode === 'prototype' && view === id ? 'is-active' : ''}
                onClick={() => jumpTo(id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        <div className="studio-meta">
          <div>
            <span className="meta-dot" />
            P0 交互范围
          </div>
          <button
            className="text-button"
            onClick={() => {
              setResetKey((key) => key + 1);
              setView('home');
            }}
          >
            <RotateCcw size={15} aria-hidden="true" />
            重置数据
          </button>
        </div>
      </aside>

      <section className={`studio-stage studio-stage--${mode}`}>
        {mode === 'wireframe' ? (
          <WireframeOverview />
        ) : mode === 'prd' ? (
          <PrdOverview />
        ) : (
          <div className="device-wrap">
            <div className="device-label">
              <span>390 × 844</span>
              <span className="device-label-status">
                <StatusPill tone={appDataSource.mode === 'mock' ? 'warning' : 'success'}>
                  {appDataSource.mode === 'mock' ? 'Mock 演示数据' : '真实 API 数据'}
                </StatusPill>
                <StatusPill tone="success" icon={CheckCircle2}>可交互</StatusPill>
              </span>
            </div>
            <div className="phone-frame">
              <MobileApp key={resetKey} requestedView={view} onViewChange={setView} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function MobileApp(props) {
  const appData = useAppData();
  if (appData.status === 'loading') return <AppDataLoading sourceLabel={appData.dataSource.label} />;
  if (appData.status === 'error') return <AppDataError error={appData.error} onRetry={appData.reload} sourceLabel={appData.dataSource.label} />;
  return <LoadedMobileApp {...props} bootstrap={appData.data} dataSource={appData.dataSource} />;
}

function AppDataLoading({ sourceLabel }) {
  return (
    <div className="mobile-app">
      <div className="mobile-status" aria-hidden="true"><span>09:41</span><span>5G&nbsp;&nbsp;92%</span></div>
      <div className="app-data-state" role="status">
        <LoaderCircle className="spin" size={28} />
        <strong>正在读取业务数据</strong>
        <p>数据来源：{sourceLabel}</p>
      </div>
    </div>
  );
}

function AppDataError({ error, onRetry, sourceLabel }) {
  return (
    <div className="mobile-app">
      <div className="mobile-status" aria-hidden="true"><span>09:41</span><span>5G&nbsp;&nbsp;--</span></div>
      <div className="app-data-state app-data-state--error" role="alert">
        <WifiOff size={30} />
        <strong>业务数据读取失败</strong>
        <p>{error?.message || '无法读取数据'}。当前来源：{sourceLabel}。</p>
        <button className="primary-button" onClick={onRetry}><RefreshCw size={17} />重新读取</button>
      </div>
    </div>
  );
}

function LoadedMobileApp({ requestedView, onViewChange, bootstrap, dataSource }) {
  const [view, setView] = useState(requestedView || 'home');
  const [targets, setTargets] = useState(() => bootstrap.nutritionPlan.targets);
  const [mealBudgets, setMealBudgets] = useState(() => bootstrap.nutritionPlan.mealBudgets || []);
  const [meals, setMeals] = useState(() => bootstrap.meals);
  const [dateOffset, setDateOffset] = useState(0);
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [foodSheetOpen, setFoodSheetOpen] = useState(false);
  const [foodStage, setFoodStage] = useState('browse');
  const [mealTarget, setMealTarget] = useState(inferMeal());
  const [selectedFood, setSelectedFood] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [foodCatalog, setFoodCatalog] = useState(() => bootstrap.foodCatalog);
  const [customFoods, setCustomFoods] = useState([]);
  const [favorites, setFavorites] = useState(new Set(bootstrap.foodCatalog.filter((food) => food.favorite).map((food) => food.id)));
  const [toast, setToast] = useState(null);
  const [workoutActive, setWorkoutActive] = useState(bootstrap.workout.active);
  const [workoutCompleted, setWorkoutCompleted] = useState(bootstrap.workout.completed);
  const [exercises, setExercises] = useState(() => bootstrap.workout.exercises);
  const [trainingPlan, setTrainingPlan] = useState(() => bootstrap.trainingPlan);
  const [backupState, setBackupState] = useState(bootstrap.backup.state);
  const [cloudBackup, setCloudBackup] = useState(bootstrap.consents.cloudBackup);
  const [healthConsent, setHealthConsent] = useState(bootstrap.consents.healthProfileProcessing);
  const [modal, setModal] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [weightValue, setWeightValue] = useState(String(bootstrap.profile.latestWeightKg));
  const toastTimer = useRef(null);
  const lastTrigger = useRef(null);

  useEffect(() => {
    setView(requestedView || 'home');
    if (requestedView === 'food') {
      openFoodSheet();
      setView('home');
    }
  }, [requestedView]);

  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message, actionLabel, onAction) => {
    clearTimeout(toastTimer.current);
    setToast({ message, actionLabel, onAction });
    toastTimer.current = setTimeout(() => setToast(null), 5600);
  };

  const navigate = (nextView) => {
    clearTimeout(toastTimer.current);
    setToast(null);
    setView(nextView);
    document.querySelector('.app-scroll')?.scrollTo({ top: 0 });
  };

  const currentMeals = dateOffset === 0 ? meals : { breakfast: [], lunch: [], dinner: [], snack: [] };
  const totals = useMemo(() => sumMeals(currentMeals), [currentMeals]);
  const currentDate = addDays(new Date(), dateOffset);

  function openFoodSheet(fixedMeal = null, entry = null) {
    if (dateOffset > 0 || !healthConsent) return;
    lastTrigger.current = document.activeElement;
    setMealTarget(fixedMeal || inferMeal());
    setSelectedFood(entry || null);
    setEditingEntry(entry ? { meal: fixedMeal, entryId: entry.entryId } : null);
    setFoodStage(entry ? 'portion' : 'browse');
    setFoodSheetOpen(true);
  }

  function closeFoodSheet() {
    setFoodSheetOpen(false);
    setFoodStage('browse');
    setSelectedFood(null);
    setEditingEntry(null);
    setTimeout(() => lastTrigger.current?.focus?.(), 0);
  }

  function addFood(food, targetMeal = mealTarget) {
    const entry = { ...food, entryId: `${food.id}-${Date.now()}` };
    setMeals((current) => ({ ...current, [targetMeal]: [...current[targetMeal], entry] }));
    closeFoodSheet();
    showToast(`${food.name}已记入${MEAL_META[targetMeal].label}`, '撤销', () => {
      setMeals((current) => ({
        ...current,
        [targetMeal]: current[targetMeal].filter((item) => item.entryId !== entry.entryId),
      }));
      setToast(null);
    });
  }

  function savePortion(food) {
    if (editingEntry) {
      setMeals((current) => ({
        ...current,
        [editingEntry.meal]: current[editingEntry.meal].map((item) =>
          item.entryId === editingEntry.entryId ? { ...food, entryId: item.entryId } : item,
        ),
      }));
      closeFoodSheet();
      showToast('份量已更新');
      return;
    }
    addFood(food);
  }

  function deleteEntry(meal, entryId) {
    const index = meals[meal].findIndex((item) => item.entryId === entryId);
    const removed = meals[meal][index];
    setMeals((current) => ({
      ...current,
      [meal]: current[meal].filter((item) => item.entryId !== entryId),
    }));
    showToast(`已删除${removed.name}`, '撤销', () => {
      setMeals((current) => {
        const restored = [...current[meal]];
        restored.splice(index, 0, removed);
        return { ...current, [meal]: restored };
      });
      setToast(null);
    });
  }

  function copyEntry(meal, entry) {
    const copy = { ...entry, entryId: `${entry.id}-copy-${Date.now()}` };
    setMeals((current) => ({ ...current, [meal]: [...current[meal], copy] }));
    showToast(`已复制${entry.name}`, '撤销', () => {
      setMeals((current) => ({ ...current, [meal]: current[meal].filter((item) => item.entryId !== copy.entryId) }));
      setToast(null);
    });
  }

  function toggleFavorite(id) {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function completeWorkout() {
    setWorkoutCompleted(true);
    setWorkoutActive(false);
    navigate('home');
    showToast('训练已完成并保存');
  }

  function updateExercise(exerciseId, updater) {
    setExercises((current) => current.map((exercise) => (exercise.id === exerciseId ? updater(exercise) : exercise)));
  }

  const shared = {
    navigate,
    showToast,
    setModal,
  };

  return (
    <div className="mobile-app">
      <div className="mobile-status" aria-hidden="true">
        <span>09:41</span>
        <span>5G&nbsp;&nbsp;92%</span>
      </div>

      <div className="app-scroll">
        {view === 'home' ? (
          <TodayScreen
            targets={targets}
            totals={totals}
            meals={currentMeals}
            dateOffset={dateOffset}
            currentDate={currentDate}
            setDateOffset={setDateOffset}
            expandedMeal={expandedMeal}
            setExpandedMeal={setExpandedMeal}
            openFoodSheet={openFoodSheet}
            deleteEntry={deleteEntry}
            copyEntry={copyEntry}
            workoutActive={workoutActive}
            workoutCompleted={workoutCompleted}
            onStartWorkout={() => {
              setWorkoutActive(true);
              navigate('workout');
            }}
            backupState={backupState}
            cloudBackup={cloudBackup}
            healthConsent={healthConsent}
            weightValue={weightValue}
            setWeightValue={setWeightValue}
            trainingPlan={trainingPlan}
            workout={bootstrap.workout}
            completedSetCount={exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.done).length, 0)}
            backupLastSuccessfulLabel={bootstrap.backup.lastSuccessfulLabel}
            {...shared}
          />
        ) : null}
        {view === 'my' ? (
          <MyScreen
            profile={bootstrap.profile}
            targets={targets}
            weightValue={weightValue}
            backupState={backupState}
            cloudBackup={cloudBackup}
            trainingPlan={trainingPlan}
            trainingTemplateCount={bootstrap.trainingTemplates.length}
            completedTrainingCount={bootstrap.trends.training.completedSessions}
            {...shared}
          />
        ) : null}
        {view === 'workout' ? (
          <WorkoutScreen
            exercises={exercises}
            updateExercise={updateExercise}
            workoutActive={workoutActive}
            setWorkoutActive={setWorkoutActive}
            workoutTitle={bootstrap.workout.title}
            sessionMinutes={trainingPlan.sessionMinutes}
            onComplete={completeWorkout}
            {...shared}
          />
        ) : null}
        {view === 'goals' ? <GoalsScreen targets={targets} mealBudgets={mealBudgets} setTargets={setTargets} {...shared} /> : null}
        {view === 'plan' ? <PlanScreen trainingPlan={trainingPlan} trainingTemplateOptions={bootstrap.trainingTemplateOptions} setTrainingPlan={setTrainingPlan} {...shared} /> : null}
        {view === 'trends' ? <TrendsScreen targets={targets} trends={bootstrap.trends} {...shared} /> : null}
        {view === 'foods' ? (
          <MyFoodsScreen foodCatalog={foodCatalog} customFoods={customFoods} favorites={favorites} toggleFavorite={toggleFavorite} {...shared} />
        ) : null}
        {view === 'templates' ? <TemplatesScreen templates={bootstrap.trainingTemplates} {...shared} /> : null}
        {view === 'data' ? (
          <DataScreen
            backupState={backupState}
            setBackupState={setBackupState}
            cloudBackup={cloudBackup}
            setCloudBackup={setCloudBackup}
            lastSuccessfulLabel={bootstrap.backup.lastSuccessfulLabel}
            {...shared}
          />
        ) : null}
        {view === 'privacy' ? (
          <PrivacyScreen
            healthConsent={healthConsent}
            setHealthConsent={setHealthConsent}
            cloudBackup={cloudBackup}
            setCloudBackup={setCloudBackup}
            {...shared}
          />
        ) : null}
        {view === 'onboarding' ? (
          <OnboardingScreen
            step={onboardingStep}
            setStep={setOnboardingStep}
            setHealthConsent={setHealthConsent}
            setTargets={setTargets}
            setWeightValue={setWeightValue}
            setTrainingPlan={setTrainingPlan}
            setMealBudgets={setMealBudgets}
            dataSource={dataSource}
            {...shared}
          />
        ) : null}
      </div>

      {view === 'home' || view === 'my' ? <BottomNav current={view} navigate={navigate} /> : null}

      {foodSheetOpen ? (
        <FoodSheet
          stage={foodStage}
          setStage={setFoodStage}
          mealTarget={mealTarget}
          setMealTarget={setMealTarget}
          selectedFood={selectedFood}
          setSelectedFood={setSelectedFood}
          onClose={closeFoodSheet}
          onQuickAdd={addFood}
          onSavePortion={savePortion}
          foodCatalog={foodCatalog}
          customFoods={customFoods}
          setCustomFoods={setCustomFoods}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      ) : null}

      {modal ? <AppModal modal={modal} onClose={() => setModal(null)} /> : null}

      {toast ? (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.actionLabel ? (
            <button onClick={toast.onAction}>{toast.actionLabel}</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BottomNav({ current, navigate }) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <button className={current === 'home' ? 'is-active' : ''} aria-current={current === 'home' ? 'page' : undefined} onClick={() => navigate('home')}>
        <Home size={21} aria-hidden="true" />
        <span>今日</span>
      </button>
      <button className={current === 'my' ? 'is-active' : ''} aria-current={current === 'my' ? 'page' : undefined} onClick={() => navigate('my')}>
        <UserRound size={21} aria-hidden="true" />
        <span>我的</span>
      </button>
    </nav>
  );
}

function TodayScreen({
  targets,
  totals,
  meals,
  dateOffset,
  currentDate,
  setDateOffset,
  expandedMeal,
  setExpandedMeal,
  openFoodSheet,
  deleteEntry,
  copyEntry,
  workoutActive,
  workoutCompleted,
  onStartWorkout,
  backupState,
  cloudBackup,
  healthConsent,
  weightValue,
  setWeightValue,
  trainingPlan,
  workout,
  completedSetCount,
  backupLastSuccessfulLabel,
  navigate,
  showToast,
}) {
  const remaining = targets.calories - Math.round(totals.calories);
  const isFuture = dateOffset > 0;
  const [weightOpen, setWeightOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="screen today-screen">
      <header className="app-header home-header">
        <AppLogo compact />
        <IconButton label="查看隐私与账户" onClick={() => navigate('privacy')}>
          <ShieldCheck size={20} />
        </IconButton>
      </header>

      <div className="date-switcher">
        <IconButton label="前一天" onClick={() => setDateOffset((value) => value - 1)}>
          <ChevronLeft size={21} />
        </IconButton>
        <button className="date-button" onClick={() => setCalendarOpen((open) => !open)}>
          <span>{dateOffset === 0 ? `今天 · ${cnDate.format(currentDate)}` : cnDate.format(currentDate)}</span>
          <CalendarDays size={17} aria-hidden="true" />
        </button>
        <IconButton label="后一天" onClick={() => setDateOffset((value) => value + 1)}>
          <ChevronRight size={21} />
        </IconButton>
        {calendarOpen ? (
          <div className="calendar-popover">
            <input
              aria-label="选择日期"
              type="date"
              value={currentDate.toISOString().slice(0, 10)}
              onChange={(event) => {
                const selected = new Date(`${event.target.value}T12:00:00`);
                const today = new Date();
                today.setHours(12, 0, 0, 0);
                setDateOffset(Math.round((selected - today) / 86400000));
                setCalendarOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>

      {!healthConsent ? (
        <button className="consent-banner" onClick={() => navigate('privacy')}>
          <LockKeyhole size={18} aria-hidden="true" />
          <span><strong>健康记录已关闭</strong><small>重新同意后才能保存记录</small></span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      ) : null}

      <section className="nutrition-summary" aria-label="今日营养概览">
        <div className="calorie-headline">
          <div>
            <span className="eyebrow">{remaining >= 0 ? '今日剩余' : '今日已超过'}</span>
            <strong>{Math.abs(remaining).toLocaleString()} <small>kcal</small></strong>
          </div>
          <div className="calorie-ratio">
            <span>已摄入 {Math.round(totals.calories)}</span>
            <span>目标 {targets.calories}</span>
          </div>
        </div>
        <div className="main-progress" aria-label={`已摄入 ${Math.round(totals.calories)}，目标 ${targets.calories}`}>
          <span style={{ width: `${Math.min(100, (totals.calories / targets.calories) * 100)}%` }} />
        </div>
        <div className="macro-grid">
          <Macro label="蛋白质" value={totals.protein} target={targets.protein} tone="green" />
          <Macro label="碳水" value={totals.carbs} target={targets.carbs} tone="yellow" />
          <Macro label="脂肪" value={totals.fat} target={targets.fat} tone="coral" />
        </div>
      </section>

      <button
        className="primary-button record-food-button"
        onClick={() => openFoodSheet()}
        disabled={isFuture || !healthConsent}
      >
        <Plus size={20} aria-hidden="true" />
        {isFuture ? '未来日期仅查看计划' : '记录饮食'}
      </button>

      <section className="meal-list" aria-label="当天餐次">
        {Object.entries(MEAL_META).map(([id, meta]) => (
          <MealRow
            key={id}
            id={id}
            meta={meta}
            items={meals[id]}
            expanded={expandedMeal === id}
            onToggle={() => setExpandedMeal((current) => (current === id ? null : id))}
            onAdd={() => openFoodSheet(id)}
            onEdit={(entry) => openFoodSheet(id, entry)}
            onDelete={(entryId) => deleteEntry(id, entryId)}
            onCopy={(entry) => copyEntry(id, entry)}
            disabled={isFuture || !healthConsent}
          />
        ))}
      </section>

      <section className="secondary-section workout-summary">
        <div className="section-heading-row">
          <div className="section-icon section-icon--coral"><Dumbbell size={19} /></div>
          <div>
            <span className="eyebrow">今日训练</span>
            <h2>{workout.title}{workoutCompleted ? ' · 已完成' : workoutActive ? ' · 进行中' : ''}</h2>
          </div>
          {workoutCompleted ? <StatusPill tone="success" icon={Check}>{completedSetCount} 组</StatusPill> : null}
        </div>
        <p>{workoutCompleted ? `${trainingPlan.sessionMinutes} 分钟 · 训练量已记入趋势` : `${trainingPlan.title} · 预计 ${trainingPlan.sessionMinutes} 分钟`}</p>
        {!workoutCompleted ? (
          <button className="secondary-button" onClick={onStartWorkout} disabled={isFuture}>
            {workoutActive ? <RefreshCw size={17} /> : <Dumbbell size={17} />}
            {workoutActive ? '继续训练' : '开始训练'}
          </button>
        ) : null}
      </section>

      <section className="secondary-section weight-section">
        <button className="disclosure-row" onClick={() => setWeightOpen((open) => !open)}>
          <span className="section-icon section-icon--blue"><Weight size={19} /></span>
          <span><small>体重</small><strong>{weightValue} kg</strong></span>
          {weightOpen ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
        </button>
        {weightOpen ? (
          <div className="weight-editor">
            <label>
              当前体重
              <input type="number" inputMode="decimal" value={weightValue} onChange={(event) => setWeightValue(event.target.value)} />
              <span>kg</span>
            </label>
            <button className="compact-button" onClick={() => showToast('体重已保存')}>保存</button>
          </div>
        ) : null}
      </section>

      <button className="backup-inline" onClick={() => navigate('data')}>
        {backupState === 'failed' || !cloudBackup ? <CloudOff size={15} /> : <Cloud size={15} />}
        <span>
          {!cloudBackup ? '仅保存在本机' : backupState === 'syncing' ? '正在备份…' : backupState === 'failed' ? '备份失败，本地记录不受影响' : `已备份 · ${backupLastSuccessfulLabel}`}
        </span>
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function Macro({ label, value, target, tone }) {
  const rounded = Math.round(value);
  return (
    <div className="macro-item">
      <div><span>{label}</span><strong>{rounded}<small>/{target}g</small></strong></div>
      <div className={`macro-progress macro-progress--${tone}`}>
        <span style={{ width: `${Math.min(100, (rounded / target) * 100)}%` }} />
      </div>
    </div>
  );
}

function MealRow({ id, meta, items, expanded, onToggle, onAdd, onEdit, onDelete, onCopy, disabled }) {
  return (
    <div className={`meal-row ${expanded ? 'is-expanded' : ''}`}>
      <div className="meal-row-main">
        <button
          className="meal-disclosure"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? '收起' : '展开'}${meta.label}`}
        >
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          <span>{meta.label}</span>
          <small>{items.length ? `${items.length}项 · ${mealCalories(items)} kcal` : '尚未记录'}</small>
        </button>
        <IconButton label={`添加${meta.label}`} onClick={onAdd} disabled={disabled}>
          <Plus size={19} />
        </IconButton>
      </div>
      {expanded ? (
        <div className="meal-entries">
          {items.length ? items.map((entry) => (
            <div className="meal-entry" key={entry.entryId}>
              <button className="meal-entry-body" onClick={() => onEdit(entry)}>
                <span className={`food-swatch food-swatch--${entry.tone}`}>{entry.name.slice(0, 1)}</span>
                <span><strong>{entry.name}</strong><small>{entry.amount} {entry.unit}</small></span>
                <span>{Math.round(entry.calories)} kcal</span>
              </button>
              <IconButton label={`复制${entry.name}`} onClick={() => onCopy(entry)}><Copy size={16} /></IconButton>
              <IconButton label={`删除${entry.name}`} className="danger-icon" onClick={() => onDelete(entry.entryId)}><Trash2 size={16} /></IconButton>
            </div>
          )) : <p className="empty-inline">还没有记录，点击右侧加号开始。</p>}
        </div>
      ) : null}
    </div>
  );
}

function ScreenHeader({ title, subtitle, onBack, action }) {
  return (
    <header className="screen-header">
      <IconButton label="返回" onClick={onBack}><ArrowLeft size={21} /></IconButton>
      <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
      <div className="screen-header-action">{action || null}</div>
    </header>
  );
}

function MyScreen({ profile, targets, weightValue, backupState, cloudBackup, trainingPlan, trainingTemplateCount, completedTrainingCount, navigate, showToast }) {
  const menuGroups = [
    {
      label: '目标与计划',
      items: [
        { icon: Target, tone: 'green', label: '饮食目标与餐次预算', value: `${targets.calories} kcal`, view: 'goals' },
        { icon: ClipboardList, tone: 'coral', label: '每周训练计划', value: `${trainingPlan.daysPerWeek} 天`, view: 'plan' },
      ],
    },
    {
      label: '数据与内容',
      items: [
        { icon: BarChart3, tone: 'blue', label: '数据趋势', value: '本周', view: 'trends' },
        { icon: Utensils, tone: 'yellow', label: '我的食物与收藏', view: 'foods' },
        { icon: Dumbbell, tone: 'coral', label: '训练模板', value: `${trainingTemplateCount} 个`, view: 'templates' },
      ],
    },
    {
      label: '设置',
      items: [
        { icon: Settings2, tone: 'neutral', label: '单位与显示', value: '公制', action: () => showToast('单位与显示设置已打开') },
        {
          icon: cloudBackup ? DatabaseBackup : CloudOff,
          tone: cloudBackup && backupState !== 'failed' ? 'green' : 'neutral',
          label: '数据导出与云备份',
          value: cloudBackup ? (backupState === 'failed' ? '需重试' : '已开启') : '仅本机',
          view: 'data',
        },
        { icon: ShieldCheck, tone: 'blue', label: '隐私与账户', view: 'privacy' },
        { icon: HelpCircle, tone: 'neutral', label: '帮助与反馈', action: () => showToast('帮助与反馈入口已打开') },
      ],
    },
  ];

  return (
    <div className="screen my-screen">
      <header className="app-header my-title"><h1>我的</h1></header>
      <button className="profile-row" onClick={() => showToast('个人资料编辑器已打开')}>
        <span className="avatar">{profile.avatarText}</span>
        <span><strong>{profile.displayName}</strong><small>{profile.goalLabel} · 当前 {weightValue} kg</small></span>
        <span className="profile-edit-icon" aria-hidden="true"><Pencil size={17} /></span>
      </button>

      <div className="goal-strip" aria-label="当前目标摘要">
        <div><span>每日目标</span><strong>{targets.calories}<small> kcal</small></strong></div>
        <div><span>蛋白质</span><strong>{targets.protein}<small> g</small></strong></div>
        <div><span>本周训练</span><strong>{completedTrainingCount}<small> / {trainingPlan.daysPerWeek}</small></strong></div>
      </div>

      {menuGroups.map((group) => (
        <section className="menu-section" key={group.label}>
          <h2>{group.label}</h2>
          <div className="menu-list">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={() => item.view ? navigate(item.view) : item.action?.()}>
                  <span className={`section-icon section-icon--${item.tone}`}><Icon size={18} /></span>
                  <span>{item.label}</span>
                  {item.value ? <small>{item.value}</small> : null}
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <div className="build-label">食练格 v0.1 · 数据属于你</div>
    </div>
  );
}

function FoodSheet({
  stage,
  setStage,
  mealTarget,
  setMealTarget,
  selectedFood,
  setSelectedFood,
  onClose,
  onQuickAdd,
  onSavePortion,
  foodCatalog,
  customFoods,
  setCustomFoods,
  favorites,
  toggleFavorite,
}) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('recent');
  const [amount, setAmount] = useState(selectedFood?.amount || 1);
  const [unit, setUnit] = useState(selectedFood?.unit || '份');
  const [customForm, setCustomForm] = useState({ name: '', amount: 100, unit: '克', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const searchRef = useRef(null);

  useEffect(() => {
    if (stage === 'browse') setTimeout(() => searchRef.current?.focus(), 80);
  }, [stage]);

  useEffect(() => {
    if (selectedFood) {
      setAmount(selectedFood.amount);
      setUnit(selectedFood.unit);
    }
  }, [selectedFood]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const allFoods = [...foodCatalog, ...customFoods];
  const visibleFoods = allFoods.filter((food) => {
    if (tab === 'favorites' && !favorites.has(food.id)) return false;
    return food.name.toLowerCase().includes(query.trim().toLowerCase());
  });

  const openPortion = (food) => {
    setSelectedFood(food);
    setAmount(food.amount);
    setUnit(food.unit);
    setStage('portion');
  };

  const ratio = selectedFood ? Number(amount) / Number(selectedFood.amount || 1) : 1;
  const adjustedFood = selectedFood ? {
    ...selectedFood,
    amount: Number(amount),
    unit,
    calories: selectedFood.calories * ratio,
    protein: selectedFood.protein * ratio,
    carbs: selectedFood.carbs * ratio,
    fat: selectedFood.fat * ratio,
    detail: `${amount} ${unit}`,
  } : null;

  const saveCustom = () => {
    if (!customForm.name.trim() || Number(customForm.calories) <= 0) return;
    const food = {
      ...customForm,
      id: `custom-${Date.now()}`,
      detail: `${customForm.amount} ${customForm.unit} · 私人食物`,
      tone: 'green',
      calories: Number(customForm.calories),
      protein: Number(customForm.protein),
      carbs: Number(customForm.carbs),
      fat: Number(customForm.fat),
      amount: Number(customForm.amount),
    };
    setCustomFoods((current) => [...current, food]);
    onQuickAdd(food);
  };

  return (
    <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="bottom-sheet food-sheet" role="dialog" aria-modal="true" aria-label="记录饮食">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          {stage !== 'browse' ? (
            <IconButton label="返回食物列表" onClick={() => setStage('browse')}><ArrowLeft size={20} /></IconButton>
          ) : <span className="header-spacer" />}
          <div><h2>{stage === 'browse' ? '记录饮食' : stage === 'portion' ? '确认份量' : '创建私人食物'}</h2><p>{MEAL_META[mealTarget].label}</p></div>
          <IconButton label="关闭" onClick={onClose}><X size={20} /></IconButton>
        </header>

        {stage === 'browse' ? (
          <div className="sheet-content browse-content">
            <div className="meal-segment" role="group" aria-label="选择餐次">
              {Object.entries(MEAL_META).map(([id, meta]) => (
                <button key={id} className={mealTarget === id ? 'is-active' : ''} onClick={() => setMealTarget(id)}>{meta.label}</button>
              ))}
            </div>
            <label className="search-field">
              <Search size={18} aria-hidden="true" />
              <input ref={searchRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索食物、品牌或拼音" />
              {query ? <IconButton label="清空搜索" onClick={() => setQuery('')}><X size={16} /></IconButton> : null}
            </label>
            <div className="list-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'recent'} className={tab === 'recent' ? 'is-active' : ''} onClick={() => setTab('recent')}>最近</button>
              <button role="tab" aria-selected={tab === 'favorites'} className={tab === 'favorites' ? 'is-active' : ''} onClick={() => setTab('favorites')}>收藏</button>
            </div>
            <div className="food-results">
              {visibleFoods.length ? visibleFoods.map((food) => (
                <div className="food-result" key={food.id}>
                  <button className="food-result-main" onClick={() => openPortion(food)}>
                    <span className={`food-swatch food-swatch--${food.tone}`}>{food.name.slice(0, 1)}</span>
                    <span><strong>{food.name}</strong><small>{food.detail}</small></span>
                    <span>{Math.round(food.calories)}<small> kcal</small></span>
                  </button>
                  <IconButton label={favorites.has(food.id) ? `取消收藏${food.name}` : `收藏${food.name}`} onClick={() => toggleFavorite(food.id)}>
                    <Star size={17} fill={favorites.has(food.id) ? 'currentColor' : 'none'} />
                  </IconButton>
                  <IconButton label={`快速记录${food.name}`} className="quick-add" onClick={() => onQuickAdd(food)}>
                    <Plus size={19} />
                  </IconButton>
                </div>
              )) : (
                <div className="empty-state compact-empty">
                  <Search size={24} />
                  <strong>没有找到“{query}”</strong>
                  <p>你可以创建一条仅自己可见的食物记录。</p>
                  <button className="secondary-button" onClick={() => setStage('custom')}><Plus size={17} />创建私人食物</button>
                </div>
              )}
            </div>
            {visibleFoods.length ? <button className="sheet-footer-action" onClick={() => setStage('custom')}><Plus size={17} />创建私人食物</button> : null}
          </div>
        ) : null}

        {stage === 'portion' && adjustedFood ? (
          <div className="sheet-content portion-content">
            <div className="selected-food-heading">
              <span className={`food-swatch food-swatch--${selectedFood.tone}`}>{selectedFood.name.slice(0, 1)}</span>
              <div><h3>{selectedFood.name}</h3><p>{selectedFood.detail}</p></div>
            </div>
            <section className="portion-control">
              <span className="field-label">食用份量</span>
              <div className="stepper-row">
                <IconButton label="减少份量" onClick={() => setAmount((value) => Math.max(unit === '克' || unit === '毫升' ? 10 : 0.5, Number(value) - (unit === '克' || unit === '毫升' ? 10 : 0.5)))}>
                  <Minus size={20} />
                </IconButton>
                <input aria-label="份量" type="number" value={amount} min="0.5" step={unit === '克' || unit === '毫升' ? 10 : 0.5} onChange={(event) => setAmount(event.target.value)} />
                <select aria-label="份量单位" value={unit} onChange={(event) => setUnit(event.target.value)}>
                  {[selectedFood.unit, '克', '份'].filter((value, index, values) => values.indexOf(value) === index).map((option) => <option key={option}>{option}</option>)}
                </select>
                <IconButton label="增加份量" onClick={() => setAmount((value) => Number(value) + (unit === '克' || unit === '毫升' ? 10 : 0.5))}>
                  <Plus size={20} />
                </IconButton>
              </div>
            </section>
            <section className="nutrition-preview">
              <div><span>能量</span><strong>{Math.round(adjustedFood.calories)}<small> kcal</small></strong></div>
              <div><span>蛋白质</span><strong>{adjustedFood.protein.toFixed(1)}<small> g</small></strong></div>
              <div><span>碳水</span><strong>{adjustedFood.carbs.toFixed(1)}<small> g</small></strong></div>
              <div><span>脂肪</span><strong>{adjustedFood.fat.toFixed(1)}<small> g</small></strong></div>
            </section>
            <div className="source-note"><Info size={16} /><span>营养值按已确认的标准份量同比换算。</span></div>
            <button className="primary-button sheet-primary" onClick={() => onSavePortion(adjustedFood)}><Check size={19} />保存到{MEAL_META[mealTarget].label}</button>
          </div>
        ) : null}

        {stage === 'custom' ? (
          <div className="sheet-content custom-food-form">
            <label>食物名称<input value={customForm.name} onChange={(event) => setCustomForm({ ...customForm, name: event.target.value })} placeholder="例如：妈妈做的牛肉面" /></label>
            <div className="form-grid two-col">
              <label>标准份量<input type="number" value={customForm.amount} onChange={(event) => setCustomForm({ ...customForm, amount: event.target.value })} /></label>
              <label>单位<select value={customForm.unit} onChange={(event) => setCustomForm({ ...customForm, unit: event.target.value })}><option>克</option><option>毫升</option><option>份</option><option>碗</option><option>个</option></select></label>
            </div>
            <label>能量（kcal）<input type="number" value={customForm.calories} onChange={(event) => setCustomForm({ ...customForm, calories: event.target.value })} /></label>
            <div className="form-grid three-col">
              {['protein', 'carbs', 'fat'].map((key) => (
                <label key={key}>{key === 'protein' ? '蛋白质' : key === 'carbs' ? '碳水' : '脂肪'}<input type="number" value={customForm[key]} onChange={(event) => setCustomForm({ ...customForm, [key]: event.target.value })} /></label>
              ))}
            </div>
            <div className="source-note"><LockKeyhole size={16} /><span>这条食物仅自己可见，不会进入公共食物库。</span></div>
            <button className="primary-button sheet-primary" disabled={!customForm.name.trim() || Number(customForm.calories) <= 0} onClick={saveCustom}><Save size={18} />创建并记录</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function WorkoutScreen({ exercises, updateExercise, workoutActive, setWorkoutActive, workoutTitle, sessionMinutes, onComplete, navigate, showToast }) {
  const completedSets = exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.done).length, 0);
  const totalSets = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);

  return (
    <div className="screen detail-screen workout-screen">
      <ScreenHeader title={workoutTitle} subtitle={workoutActive ? '训练已自动保存' : `预计 ${sessionMinutes} 分钟`} onBack={() => navigate('home')} />
      <div className="workout-progress-row">
        <div className="workout-progress"><span style={{ width: `${(completedSets / totalSets) * 100}%` }} /></div>
        <strong>{completedSets}/{totalSets} 组</strong>
      </div>

      <div className="exercise-list">
        {exercises.map((exercise) => (
          <ExerciseBlock key={exercise.id} exercise={exercise} updateExercise={updateExercise} />
        ))}
      </div>

      <button
        className="secondary-button add-exercise-button"
        onClick={() => showToast('动作库已打开（线框状态）')}
      ><Plus size={18} />添加动作</button>
      <button
        className="primary-button complete-workout-button"
        onClick={() => {
          setWorkoutActive(true);
          onComplete();
        }}
      ><Check size={19} />完成训练</button>
    </div>
  );
}

function ExerciseBlock({ exercise, updateExercise }) {
  const addSet = () => updateExercise(exercise.id, (current) => {
    const last = current.sets[current.sets.length - 1] || { weight: 0, reps: 10 };
    return { ...current, sets: [...current.sets, { ...last, id: `${current.id}-${Date.now()}`, done: false }] };
  });

  const updateSet = (setId, patch) => updateExercise(exercise.id, (current) => ({
    ...current,
    sets: current.sets.map((set) => set.id === setId ? { ...set, ...patch } : set),
  }));

  const deleteSet = (setId) => updateExercise(exercise.id, (current) => ({
    ...current,
    sets: current.sets.filter((set) => set.id !== setId),
  }));

  return (
    <section className="exercise-block">
      <header><div><h2>{exercise.name}</h2><p>{exercise.note}</p></div></header>
      <div className="set-table-header"><span>组</span><span>kg</span><span>次数</span><span>完成</span><span /></div>
      {exercise.sets.map((set, index) => (
        <div className={`set-row ${set.done ? 'is-done' : ''}`} key={set.id}>
          <span>{index + 1}</span>
          <input aria-label={`${exercise.name}第${index + 1}组重量`} type="number" value={set.weight} onChange={(event) => updateSet(set.id, { weight: Number(event.target.value) })} />
          <input aria-label={`${exercise.name}第${index + 1}组次数`} type="number" value={set.reps} onChange={(event) => updateSet(set.id, { reps: Number(event.target.value) })} />
          <button className="set-check" aria-label={set.done ? `取消完成第${index + 1}组` : `完成第${index + 1}组`} onClick={() => updateSet(set.id, { done: !set.done })}>{set.done ? <Check size={17} /> : null}</button>
          <IconButton label={`删除第${index + 1}组`} onClick={() => deleteSet(set.id)}><Trash2 size={15} /></IconButton>
        </div>
      ))}
      <button className="inline-command" onClick={addSet}><Plus size={16} />添加一组</button>
    </section>
  );
}

function GoalsScreen({ targets, mealBudgets: planMealBudgets, setTargets, navigate, showToast }) {
  const [draft, setDraft] = useState(targets);
  const [showMealBudgets, setShowMealBudgets] = useState(false);
  const [preview, setPreview] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const delta = Number(draft.calories) - Number(targets.calories);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: Number(value) }));

  return (
    <div className="screen detail-screen goals-screen">
      <ScreenHeader title="饮食目标" subtitle="当前版本 · 8月1日起" onBack={() => navigate('my')} />
      <section className="settings-block">
        <div className="block-heading"><div><h2>每日能量</h2><p>使用手动目标，不会被建议自动覆盖</p></div><StatusPill tone="neutral">手动</StatusPill></div>
        <label className="range-field">
          <div><span>目标能量</span><strong>{draft.calories} kcal</strong></div>
          <input type="range" min="1200" max="3000" step="50" value={draft.calories} onChange={(event) => update('calories', event.target.value)} />
        </label>
      </section>

      <section className="settings-block">
        <h2>三大营养素</h2>
        <div className="numeric-list">
          {NUTRIENT_FIELDS.map((field) => (
            <label key={field.id}><span>{field.label}</span><input type="number" min="0" value={draft[field.id]} onChange={(event) => update(field.id, event.target.value)} /><small>{field.unit}</small></label>
          ))}
        </div>
      </section>

      <section className="settings-block">
        <label className="switch-row">
          <span><strong>餐次预算</strong><small>按早餐、午餐、晚餐和加餐分配</small></span>
          <input type="checkbox" checked={showMealBudgets} onChange={(event) => setShowMealBudgets(event.target.checked)} />
          <span className="switch-ui" aria-hidden="true" />
        </label>
        {showMealBudgets ? (
          <div className="budget-grid">
            {planMealBudgets.length
              ? planMealBudgets.map((meal) => <span key={meal.id || meal.label}>{meal.label} {meal.ratio}</span>)
              : <span className="budget-empty">当前计划未设置餐次预算</span>}
          </div>
        ) : null}
      </section>

      {!preview ? (
        <button className="primary-button sticky-action" onClick={() => setPreview(true)}><SlidersHorizontal size={18} />预览变更</button>
      ) : (
        <section className="change-preview">
          <header><div><span className="eyebrow">变更预览</span><h2>{delta === 0 ? '目标数值没有变化' : `每日能量${delta > 0 ? '增加' : '减少'} ${Math.abs(delta)} kcal`}</h2></div><IconButton label="关闭预览" onClick={() => setPreview(false)}><X size={18} /></IconButton></header>
          <label>生效日期<input type="date" min={new Date().toISOString().slice(0, 10)} value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></label>
          <p>历史日报仍使用当时生效的目标版本。</p>
          <button className="primary-button" onClick={() => { setTargets(draft); navigate('my'); showToast('新目标已创建并按日期生效'); }}><Check size={18} />确认创建新版本</button>
        </section>
      )}
    </div>
  );
}

function planToWeekDays(trainingPlan) {
  const slotsByFrequency = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
  };
  const slots = slotsByFrequency[trainingPlan.daysPerWeek] || slotsByFrequency[3];
  return WEEK_DAYS.map((day, index) => {
    const sessionIndex = slots.indexOf(index);
    return { ...day, template: sessionIndex >= 0 ? trainingPlan.sessions[sessionIndex] : null };
  });
}

function PlanScreen({ trainingPlan, trainingTemplateOptions, setTrainingPlan, navigate, showToast }) {
  const [days, setDays] = useState(() => planToWeekDays(trainingPlan));
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const activeDays = days.filter((day) => day.template);

  return (
    <div className="screen detail-screen plan-screen">
      <ScreenHeader title="每周训练计划" subtitle={`当前计划 · 每周 ${activeDays.length} 天`} onBack={() => navigate('my')} />
      <section className="week-overview" aria-label="一周计划概览">
        {days.map((day) => <button key={day.id} className={day.template ? 'is-active' : ''}><span>{day.short}</span><small>{day.template ? '练' : '休'}</small></button>)}
      </section>

      <section className="settings-block plan-days">
        <h2>一周安排</h2>
        {days.map((day) => (
          <div className="plan-day-row" key={day.id}>
            <span>{day.label}</span>
            <select
              aria-label={`${day.label}训练模板`}
              value={day.template || ''}
              onChange={(event) => setDays((current) => current.map((item) => item.id === day.id ? { ...item, template: event.target.value || null } : item))}
            >
              <option value="">休息</option>
              {trainingTemplateOptions.map((template) => <option key={template}>{template}</option>)}
            </select>
          </div>
        ))}
      </section>

      <section className="settings-block">
        <h2>版本生效</h2>
        <label className="date-field">生效日期<input type="date" min={new Date().toISOString().slice(0, 10)} value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></label>
        <p className="form-note">新计划生效后，旧计划会截止，但历史训练不会改变。</p>
      </section>
      <button className="primary-button sticky-action" disabled={!activeDays.length} onClick={() => {
        setTrainingPlan((current) => ({
          ...current,
          daysPerWeek: activeDays.length,
          title: activeDays.length === 3 ? '全身三练' : `${activeDays.length} 日训练`,
          sessions: activeDays.map((day) => day.template),
        }));
        navigate('my');
        showToast('训练计划新版本已启用');
      }}><Check size={18} />确认计划</button>
    </div>
  );
}

function TrendsScreen({ targets, trends, navigate }) {
  const [metric, setMetric] = useState('diet');
  const maxValue = Math.max(targets.calories, ...trends.diet.map((item) => item.value || 0));
  return (
    <div className="screen detail-screen trends-screen">
      <ScreenHeader title="数据趋势" subtitle={trends.periodLabel} onBack={() => navigate('my')} />
      <div className="segmented-control" role="group" aria-label="趋势类型">
        <button className={metric === 'diet' ? 'is-active' : ''} onClick={() => setMetric('diet')}>饮食</button>
        <button className={metric === 'training' ? 'is-active' : ''} onClick={() => setMetric('training')}>训练</button>
        <button className={metric === 'weight' ? 'is-active' : ''} onClick={() => setMetric('weight')}>体重</button>
      </div>

      {metric === 'diet' ? (
        <>
          <section className="trend-summary"><span>本周日均</span><strong>{trends.dietAverageKcal.toLocaleString()} <small>kcal</small></strong><p>{trends.validDietDays} 个有效记录日</p></section>
          <section className="bar-chart" aria-label="本周能量摄入柱状图">
            <div className="target-line" style={{ bottom: `${(targets.calories / maxValue) * 100}%` }}><span>目标</span></div>
            {trends.diet.map((item) => (
              <div className="bar-column" key={item.day}>
                <div className={`bar ${item.value === null ? 'is-missing' : ''}`} style={{ height: item.value === null ? '3px' : `${(item.value / maxValue) * 100}%` }}><span>{item.value || '缺'}</span></div>
                <small>{item.day}</small>
              </div>
            ))}
          </section>
          <div className="trend-insight"><Info size={17} /><span>周四没有记录，趋势保持缺口，不进行插值。</span></div>
        </>
      ) : metric === 'training' ? (
        <div className="metric-list"><div><span>完成训练</span><strong>{trends.training.completedSessions} 次</strong></div><div><span>训练时长</span><strong>{trends.training.durationMinutes} 分钟</strong></div><div><span>完成组数</span><strong>{trends.training.completedSets} 组</strong></div></div>
      ) : (
        <div className="weight-trend"><strong>{trends.weight.latestKg} kg</strong><span>较周初 {trends.weight.deltaKg > 0 ? '+' : ''}{trends.weight.deltaKg} kg</span><div className="simple-line" aria-hidden="true"><i /><i /><i /><i /><i /></div></div>
      )}
    </div>
  );
}

function MyFoodsScreen({ foodCatalog, customFoods, favorites, toggleFavorite, navigate, showToast }) {
  const items = [...foodCatalog.filter((food) => favorites.has(food.id)), ...customFoods];
  return (
    <div className="screen detail-screen">
      <ScreenHeader title="我的食物" subtitle={`${items.length} 条收藏与私人食物`} onBack={() => navigate('my')} action={<IconButton label="创建私人食物" onClick={() => showToast('请从今日页记录面板创建')}><Plus size={20} /></IconButton>} />
      <div className="simple-list">
        {items.map((food) => (
          <div key={food.id}><span className={`food-swatch food-swatch--${food.tone}`}>{food.name.slice(0, 1)}</span><span><strong>{food.name}</strong><small>{food.detail}</small></span><IconButton label={`取消收藏${food.name}`} onClick={() => toggleFavorite(food.id)}><Star size={17} fill="currentColor" /></IconButton></div>
        ))}
      </div>
    </div>
  );
}

function TemplatesScreen({ templates, navigate, showToast }) {
  return (
    <div className="screen detail-screen">
      <ScreenHeader title="训练模板" subtitle="模板更新不会改写历史训练" onBack={() => navigate('my')} action={<IconButton label="新建训练模板" onClick={() => showToast('新模板草稿已创建')}><Plus size={20} /></IconButton>} />
      <div className="template-list">
        {templates.map((template) => <button key={template.id}><span className="section-icon section-icon--coral"><Dumbbell size={18} /></span><span><strong>{template.name}</strong><small>{template.detail}</small></span><ChevronRight size={18} /></button>)}
      </div>
    </div>
  );
}

function DataScreen({ backupState, setBackupState, cloudBackup, setCloudBackup, lastSuccessfulLabel, navigate, showToast, setModal }) {
  const runBackup = () => {
    setBackupState('syncing');
    setTimeout(() => {
      setBackupState('synced');
      showToast('云备份已完成');
    }, 1200);
  };

  const openExport = () => setModal({
    title: '导出全部数据',
    body: '将生成 ZIP，包含饮食、训练、体重、目标、计划、收藏和设置。',
    confirmLabel: '生成 ZIP',
    icon: FileArchive,
    onConfirm: () => showToast('数据 ZIP 已生成，可通过系统分享'),
  });

  const deleteBackup = () => setModal({
    title: '删除云端备份？',
    body: '所有在线快照将进入删除流程，同时关闭自动备份。本机记录不会删除。',
    confirmLabel: '删除并关闭',
    danger: true,
    icon: Trash2,
    onConfirm: () => { setCloudBackup(false); showToast('云端删除处理中，本机记录已保留'); },
  });

  return (
    <div className="screen detail-screen data-screen">
      <ScreenHeader title="数据与云备份" subtitle="本地优先 · 单设备备份" onBack={() => navigate('my')} />
      <section className="backup-hero">
        <span className={`backup-icon ${cloudBackup ? '' : 'is-off'}`}>{cloudBackup ? <Cloud size={27} /> : <CloudOff size={27} />}</span>
        <div><span>云备份</span><h2>{!cloudBackup ? '仅保存在本机' : backupState === 'syncing' ? '正在备份…' : backupState === 'failed' ? '上次备份失败' : '已安全备份'}</h2><p>{cloudBackup ? `最后成功：${lastSuccessfulLabel}` : '换机前请先导出本地 ZIP'}</p></div>
      </section>

      {cloudBackup ? (
        <button className="secondary-button full-width" disabled={backupState === 'syncing'} onClick={runBackup}>
          {backupState === 'syncing' ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
          {backupState === 'syncing' ? '备份中' : '立即备份'}
        </button>
      ) : null}

      <section className="menu-section standalone-menu">
        <h2>你的数据</h2>
        <div className="menu-list">
          <button onClick={openExport}><span className="section-icon section-icon--green"><Download size={18} /></span><span>导出全部数据</span><small>ZIP</small><ChevronRight size={18} /></button>
          <button onClick={() => setModal({ title: '换机恢复', body: `将从${lastSuccessfulLabel}的最新快照恢复。校验完成后，再确认激活新设备。`, confirmLabel: '开始校验', icon: DatabaseBackup, onConfirm: () => showToast('快照校验通过，等待确认激活') })}><span className="section-icon section-icon--blue"><DatabaseBackup size={18} /></span><span>换机恢复演示</span><ChevronRight size={18} /></button>
        </div>
      </section>

      <section className="danger-zone">
        <h2>云端操作</h2>
        {cloudBackup ? <button onClick={deleteBackup}><Trash2 size={18} />删除云端备份</button> : <button onClick={() => setModal({ title: '开启云备份', body: '云端使用 KMS 信封加密，但服务端可以解密；这不是端到端加密。', confirmLabel: '同意并开启', icon: Cloud, onConfirm: () => { setCloudBackup(true); showToast('云备份已开启'); } })}><Cloud size={18} />重新开启云备份</button>}
      </section>
    </div>
  );
}

function PrivacyScreen({ healthConsent, setHealthConsent, cloudBackup, setCloudBackup, navigate, showToast, setModal }) {
  const toggleHealth = () => {
    if (!healthConsent) {
      setModal({ title: '健康记录处理', body: '同意后可在本机保存饮食、训练和体重记录，并计算汇总与趋势。', confirmLabel: '明示同意', icon: ShieldCheck, onConfirm: () => { setHealthConsent(true); showToast('健康记录处理已开启'); } });
      return;
    }
    setModal({ title: '撤回健康记录同意？', body: '记录入口将关闭。你可以先导出数据；确认后本机健康库与在线健康数据进入删除流程。', confirmLabel: '确认撤回', danger: true, icon: LockKeyhole, onConfirm: () => { setHealthConsent(false); setCloudBackup(false); showToast('健康档案已锁定，云备份已关闭'); } });
  };

  const toggleCloud = () => {
    if (!cloudBackup) {
      setModal({ title: '开启云备份', body: '用于单设备换机恢复。服务端可解密备份，这不是端到端加密。', confirmLabel: '单独同意并开启', icon: Cloud, onConfirm: () => { setCloudBackup(true); showToast('云备份同意已记录'); } });
      return;
    }
    setModal({ title: '撤回云备份同意？', body: '在途上传会停止，在线快照进入 15 个日历日删除流程。本机记录不受影响。', confirmLabel: '撤回并删除云备份', danger: true, icon: CloudOff, onConfirm: () => { setCloudBackup(false); showToast('云备份已关闭，本机记录仍可使用'); } });
  };

  return (
    <div className="screen detail-screen privacy-screen">
      <ScreenHeader title="隐私与账户" subtitle="当前仅显示 P0 已上线范围" onBack={() => navigate('my')} />
      <section className="settings-block consent-block">
        <h2>单独同意</h2>
        <button className="consent-row" onClick={toggleHealth}>
          <span className="section-icon section-icon--green"><Activity size={18} /></span>
          <span><strong>健康记录处理</strong><small>饮食、训练、体重与目标</small></span>
          <StatusPill tone={healthConsent ? 'success' : 'neutral'}>{healthConsent ? '已同意' : '已关闭'}</StatusPill>
          <ChevronRight size={17} />
        </button>
        <button className="consent-row" onClick={toggleCloud} disabled={!healthConsent}>
          <span className="section-icon section-icon--blue"><Cloud size={18} /></span>
          <span><strong>云备份</strong><small>可选 · 服务端可解密</small></span>
          <StatusPill tone={cloudBackup ? 'success' : 'neutral'}>{cloudBackup ? '已同意' : '未开启'}</StatusPill>
          <ChevronRight size={17} />
        </button>
      </section>

      <section className="menu-section standalone-menu">
        <h2>数据权利</h2>
        <div className="menu-list">
          <button onClick={() => navigate('data')}><span className="section-icon section-icon--green"><Download size={18} /></span><span>导出个人数据</span><ChevronRight size={18} /></button>
          <button onClick={() => showToast('同意记录与处理者清单已打开')}><span className="section-icon section-icon--neutral"><FileArchive size={18} /></span><span>同意记录与处理者清单</span><ChevronRight size={18} /></button>
        </div>
      </section>

      <section className="danger-zone account-actions">
        <h2>账户操作</h2>
        <button onClick={() => setModal({ title: '退出账号？', body: '本机登录资料和密钥将清除。独立游客数据不会删除。', confirmLabel: '退出账号', icon: LogOut, onConfirm: () => showToast('已退出账号') })}><LogOut size={18} />退出账号</button>
        <button onClick={() => setModal({ title: '清除本机数据？', body: '这会删除当前设备上的游客记录，无法从云端恢复。', confirmLabel: '清除本机数据', danger: true, icon: Trash2, onConfirm: () => showToast('本机游客数据已清除') })}><Trash2 size={18} />清除本机数据</button>
        <button className="danger-text" onClick={() => setModal({ title: '注销账号？', body: '登录凭证立即失效，在线业务数据和备份将按删除时限清除。', confirmLabel: '申请注销', danger: true, icon: Trash2, onConfirm: () => showToast('注销申请已提交') })}><Trash2 size={18} />注销账号</button>
      </section>
    </div>
  );
}

function createHealthRiskState() {
  return Object.fromEntries(HEALTH_RISK_OPTIONS.map((option) => [option.id, false]));
}

function OnboardingScreen({
  step,
  setStep,
  setHealthConsent,
  setTargets,
  setWeightValue,
  setTrainingPlan,
  setMealBudgets,
  dataSource,
  navigate,
  showToast,
}) {
  const [profile, setProfile] = useState(() => ({ ...ONBOARDING_DEFAULTS }));
  const [healthStatus, setHealthStatus] = useState('');
  const [healthRisks, setHealthRisks] = useState(createHealthRiskState);
  const [consentChecked, setConsentChecked] = useState(false);
  const [plan, setPlan] = useState(null);
  const [planStatus, setPlanStatus] = useState('idle');
  const [planError, setPlanError] = useState(null);
  const [activationStatus, setActivationStatus] = useState('idle');

  const { age: ageLimits, heightCm: heightLimits, weightKg: weightLimits } = PROFILE_LIMITS;
  const age = Number(profile.age);
  const height = Number(profile.height);
  const currentWeight = Number(profile.currentWeight);
  const targetWeight = profile.goal === 'maintain' ? currentWeight : Number(profile.targetWeight);
  const basicValid = Number.isInteger(age) && age >= ageLimits.autoPlanMin && age <= ageLimits.max
    && profile.sex
    && height >= heightLimits.min && height <= heightLimits.max;
  const targetInRange = currentWeight >= weightLimits.min && currentWeight <= weightLimits.max
    && targetWeight >= weightLimits.min && targetWeight <= weightLimits.max;
  const targetDirectionValid = profile.goal === 'lose'
    ? targetWeight < currentWeight
    : profile.goal === 'gain'
      ? targetWeight > currentWeight
      : targetWeight === currentWeight;
  const targetValid = targetInRange && targetDirectionValid;
  const trainingValid = profile.activity && profile.experience && profile.trainingPlace;
  const selectedRisks = Object.values(healthRisks).some(Boolean);
  const healthAnswered = healthStatus === 'none' || (healthStatus === 'risk' && selectedRisks);
  const autoPlanEligible = age <= ageLimits.autoPlanMax && healthStatus === 'none';
  const setField = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const goalLabel = GOAL_OPTIONS.find((option) => option.id === profile.goal)?.summaryLabel;

  const finishManual = (hasConsent = true) => {
    setHealthConsent(hasConsent);
    if (hasConsent && targetInRange) setWeightValue(String(currentWeight));
    setStep(0);
    navigate('home');
    showToast(hasConsent ? '已进入手动记录模式' : '当前仅可浏览公开资料');
  };

  const requestPlanPreview = async () => {
    if (!basicValid || !targetValid || !trainingValid || !autoPlanEligible) return;
    setPlanStatus('loading');
    setPlanError(null);
    try {
      const suggestion = await dataSource.previewPlans({
        ...profile,
        age,
        height,
        currentWeight,
        targetWeight,
        trainingDays: Number(profile.trainingDays),
        sessionMinutes: Number(profile.sessionMinutes),
      });
      setPlan(suggestion);
      setPlanStatus('success');
      setStep(4);
    } catch (error) {
      setPlan(null);
      setPlanError(error);
      setPlanStatus('error');
    }
  };

  const activatePlan = async () => {
    if (!plan) return;
    setActivationStatus('loading');
    setPlanError(null);
    try {
      const activated = await dataSource.activatePlans({
        suggestionId: plan.suggestionId,
        targets: plan.targets,
        trainingPlan: plan.training,
        currentWeightKg: currentWeight,
      });
      const activeTargets = activated?.targets || plan.targets;
      const activeTrainingPlan = activated?.trainingPlan || plan.training;
      setTargets(activeTargets);
      setMealBudgets(plan.meals.map((meal, index) => ({
        id: Object.keys(MEAL_META)[index],
        label: meal.label,
        ratio: meal.ratio,
      })));
      setWeightValue(String(activated?.currentWeightKg ?? currentWeight));
      setTrainingPlan(activeTrainingPlan);
      setHealthConsent(true);
      setActivationStatus('success');
      setStep(0);
      navigate('home');
      showToast(`饮食与训练计划已通过${dataSource.label}启用`);
    } catch (error) {
      setPlanError(error);
      setActivationStatus('error');
    }
  };

  return (
    <div className="screen onboarding-screen">
      <header className="onboarding-header"><AppLogo /><span>步骤 {Math.min(step + 1, 5)}/5</span></header>
      <div className="onboarding-progress"><span style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>

      {step === 0 ? (
        <section className="onboarding-panel onboarding-panel--form">
          <span className="onboarding-icon"><CircleUserRound size={30} /></span>
          <h1>先认识你的身体</h1>
          <p>这些信息用于估算基础能量需求。生理性别只参与公式计算，不用于公开展示。</p>

          <div className="onboarding-form two-col">
            <label className="onboarding-field">
              <span>年龄</span>
              <span className="unit-input"><input aria-label="年龄" type="number" inputMode="numeric" min={ageLimits.min} max={ageLimits.max} value={profile.age} onChange={(event) => setField('age', event.target.value)} placeholder="例如 28" /><small>岁</small></span>
            </label>
            <label className="onboarding-field">
              <span>身高</span>
              <span className="unit-input"><input aria-label="身高" type="number" inputMode="decimal" min={heightLimits.min} max={heightLimits.max} value={profile.height} onChange={(event) => setField('height', event.target.value)} placeholder="例如 175" /><small>cm</small></span>
            </label>
          </div>

          <div className="onboarding-field">
            <span>生理性别 <small>用于能量估算</small></span>
            <div className="onboarding-segment" role="group" aria-label="生理性别">
              {SEX_OPTIONS.map((option) => (
                <button key={option.id} className={profile.sex === option.id ? 'is-selected' : ''} onClick={() => setField('sex', option.id)}>{option.label}</button>
              ))}
            </div>
          </div>

          {profile.age && age < ageLimits.autoPlanMin ? <div className="warning-note warning-note--danger"><Info size={17} />当前版本无法为未成年人创建健康档案或自动计划。</div> : null}
          {profile.age && age > ageLimits.autoPlanMax ? <div className="warning-note"><Info size={17} />可继续使用手动记录，当前版本不会为 {ageLimits.autoPlanMax + 1} 岁及以上用户生成自动计划。</div> : null}
          <p className="field-help">年龄 {ageLimits.autoPlanMin}–{ageLimits.max} 岁，身高 {heightLimits.min}–{heightLimits.max} cm。资料不会显示在公开页面。</p>
          <button className="primary-button onboarding-action" disabled={!basicValid} onClick={() => setStep(1)}>继续<ChevronRight size={18} /></button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="onboarding-panel onboarding-panel--form">
          <span className="onboarding-icon"><Target size={30} /></span>
          <h1>你的目标是什么？</h1>
          <p>先选择方向，再告诉我们当前体重和想达到的体重。</p>

          <div className="onboarding-segment onboarding-segment--three" role="group" aria-label="体重目标">
            {GOAL_OPTIONS.map((option) => (
              <button key={option.id} className={profile.goal === option.id ? 'is-selected' : ''} onClick={() => setProfile((current) => ({ ...current, goal: option.id, targetWeight: option.id === 'maintain' ? current.currentWeight : current.targetWeight }))}>{option.label}</button>
            ))}
          </div>

          <div className="onboarding-form two-col">
            <label className="onboarding-field">
              <span>当前体重</span>
              <span className="unit-input"><input aria-label="当前体重" type="number" inputMode="decimal" min={weightLimits.min} max={weightLimits.max} step="0.1" value={profile.currentWeight} onChange={(event) => setProfile((current) => ({ ...current, currentWeight: event.target.value, targetWeight: current.goal === 'maintain' ? event.target.value : current.targetWeight }))} placeholder="例如 72.4" /><small>kg</small></span>
            </label>
            <label className="onboarding-field">
              <span>目标体重</span>
              <span className="unit-input"><input aria-label="目标体重" type="number" inputMode="decimal" min={weightLimits.min} max={weightLimits.max} step="0.1" disabled={profile.goal === 'maintain'} value={profile.goal === 'maintain' ? profile.currentWeight : profile.targetWeight} onChange={(event) => setField('targetWeight', event.target.value)} placeholder="例如 68" /><small>kg</small></span>
            </label>
          </div>

          <div className="onboarding-field">
            <span>期望速度 <small>不会为赶日期采用极端热量</small></span>
            <div className="onboarding-segment" role="group" aria-label="目标速度">
              {PACE_OPTIONS.map((option) => <button key={option.id} className={profile.pace === option.id ? 'is-selected' : ''} onClick={() => setField('pace', option.id)}>{option.label}</button>)}
            </div>
          </div>

          {currentWeight > 0 && targetWeight > 0 && !targetDirectionValid ? (
            <div className="warning-note warning-note--danger"><Info size={17} />{profile.goal === 'lose' ? '减脂目标需低于当前体重。' : profile.goal === 'gain' ? '增肌目标需高于当前体重。' : '保持体重时目标与当前体重相同。'}</div>
          ) : null}
          {targetValid ? <div className="goal-summary"><span>{currentWeight} kg</span><ChevronRight size={16} /><strong>{targetWeight} kg</strong><small>{goalLabel}</small></div> : null}
          <div className="onboarding-controls"><button className="text-button" onClick={() => setStep(0)}>返回</button><button className="primary-button" disabled={!targetValid} onClick={() => setStep(2)}>继续<ChevronRight size={18} /></button></div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="onboarding-panel onboarding-panel--dense">
          <span className="onboarding-icon"><Dumbbell size={30} /></span>
          <h1>你的日常与训练条件</h1>
          <p>日常活动不含计划训练，避免重复计算。训练计划会适配经验、时间和场地。</p>

          <div className="onboarding-field">
            <span>日常活动水平 <small>不含健身训练</small></span>
            <div className="option-grid option-grid--two">
              {ACTIVITY_OPTIONS.map((option) => <button key={option.id} aria-label={option.label} className={profile.activity === option.id ? 'is-selected' : ''} onClick={() => setField('activity', option.id)}><strong>{option.label}</strong><small>{option.detail}</small></button>)}
            </div>
          </div>

          <div className="onboarding-field">
            <span>训练经验</span>
            <div className="onboarding-segment onboarding-segment--three" role="group" aria-label="训练经验">
              {EXPERIENCE_OPTIONS.map((option) => <button key={option.id} className={profile.experience === option.id ? 'is-selected' : ''} onClick={() => setField('experience', option.id)}>{option.label}</button>)}
            </div>
          </div>

          <div className="onboarding-field">
            <span>每周可训练</span>
            <div className="onboarding-segment onboarding-segment--four" role="group" aria-label="每周训练天数">
              {TRAINING_DAY_OPTIONS.map((days) => <button key={days} className={profile.trainingDays === days ? 'is-selected' : ''} onClick={() => setField('trainingDays', days)}>每周{days}天</button>)}
            </div>
          </div>

          <div className="onboarding-field">
            <span>训练场地</span>
            <div className="onboarding-segment onboarding-segment--three" role="group" aria-label="训练场地">
              {TRAINING_PLACE_OPTIONS.map((option) => <button key={option.id} className={profile.trainingPlace === option.id ? 'is-selected' : ''} onClick={() => setField('trainingPlace', option.id)}>{option.label}</button>)}
            </div>
          </div>

          <div className="onboarding-field">
            <span>单次可用时间</span>
            <div className="onboarding-segment onboarding-segment--three" role="group" aria-label="单次训练时间">
              {TRAINING_SESSION_MINUTES.map((minutes) => <button key={minutes} className={profile.sessionMinutes === minutes ? 'is-selected' : ''} onClick={() => setField('sessionMinutes', minutes)}>每次{minutes}分钟</button>)}
            </div>
          </div>

          <div className="onboarding-controls"><button className="text-button" onClick={() => setStep(1)}>返回</button><button className="primary-button" disabled={!trainingValid} onClick={() => setStep(3)}>继续<ChevronRight size={18} /></button></div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="onboarding-panel">
          <span className="onboarding-icon"><ShieldCheck size={30} /></span>
          <h1>健康边界与数据同意</h1>
          <p>自动计划仅用于一般健康管理。请确认是否存在需要专业指导的情况。</p>

          <div className="choice-list health-choice-list">
            <button aria-label="以上情况均无" className={healthStatus === 'none' ? 'is-selected' : ''} onClick={() => { setHealthStatus('none'); setHealthRisks(createHealthRiskState()); }}><CheckCircle2 size={20} />以上情况均无<small>可继续生成一般健康管理计划</small></button>
            <button aria-label="存在特殊情况" className={healthStatus === 'risk' ? 'is-selected' : ''} onClick={() => setHealthStatus('risk')}><Info size={20} />存在特殊情况<small>将转为手动记录，不生成自动计划</small></button>
          </div>

          {healthStatus === 'risk' ? (
            <div className="risk-checklist" aria-label="特殊健康情况">
              {HEALTH_RISK_OPTIONS.map((option) => <label key={option.id}><input type="checkbox" checked={healthRisks[option.id]} onChange={(event) => setHealthRisks((current) => ({ ...current, [option.id]: event.target.checked }))} />{option.label}</label>)}
            </div>
          ) : null}

          {healthStatus === 'risk' || age > ageLimits.autoPlanMax ? <div className="warning-note"><Info size={17} />你仍可使用饮食、训练和体重的手动记录；如需个性化方案，请咨询医生、注册营养师或专业教练。</div> : null}

          <label className="explicit-consent"><input aria-label="同意健康资料处理" type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} /><span><strong>我已阅读并单独同意健康资料处理</strong><small>用于在本机保存资料、记录和生成计划；不包含账号、相机或云备份授权。</small></span></label>
          <div className="privacy-facts"><span><LockKeyhole size={16} />本地数据库加密</span><span><Download size={16} />支持导出和删除</span></div>

          {planStatus === 'error' ? (
            <div className="warning-note warning-note--danger" role="alert">
              <WifiOff size={17} />
              <span>计划生成失败：{planError?.message || '无法读取计划服务'}。不会改用 Mock 计划。</span>
            </div>
          ) : null}
          <div className="onboarding-controls"><button className="text-button" onClick={() => setStep(2)}>返回</button><button className="primary-button" disabled={!consentChecked || !healthAnswered || planStatus === 'loading'} onClick={() => { if (autoPlanEligible) requestPlanPreview(); else finishManual(true); }}>{planStatus === 'loading' ? <LoaderCircle className="spin" size={18} /> : null}{autoPlanEligible ? (planStatus === 'loading' ? '正在生成计划' : planStatus === 'error' ? '重试生成计划' : '生成计划预览') : '进入手动记录'}{planStatus !== 'loading' ? <ChevronRight size={18} /> : null}</button></div>
          {autoPlanEligible ? <button className="browse-only" disabled={!consentChecked} onClick={() => finishManual(true)}>不生成计划，直接手动记录</button> : null}
          <button className="browse-only" onClick={() => finishManual(false)}>暂不同意，仅浏览公开资料</button>
        </section>
      ) : null}

      {step === 4 && plan ? (
        <section className="onboarding-panel onboarding-plan-preview">
          <span className="onboarding-icon"><ClipboardList size={30} /></span>
          <div className="preview-heading"><div><h1>这是为你生成的起步计划</h1><p>{goalLabel} · {currentWeight} → {targetWeight} kg{plan.estimatedWeeks ? ` · 约 ${plan.estimatedWeeks} 周` : ''}</p></div><StatusPill tone={dataSource.mode === 'mock' ? 'warning' : 'success'}>{dataSource.mode === 'mock' ? 'Mock 演示估算' : '真实 API 建议'}</StatusPill></div>

          <section className="generated-plan-section">
            <header><span className="section-icon section-icon--green"><Utensils size={18} /></span><div><h2>饮食控制计划</h2><p>每日目标与四餐预算</p></div></header>
            <div className="plan-calorie"><span>每日能量</span><strong>{plan.targets.calories.toLocaleString()} <small>kcal</small></strong></div>
            <div className="plan-macros">
              <span><small>蛋白质</small><strong>{plan.targets.protein} g</strong></span>
              <span><small>碳水</small><strong>{plan.targets.carbs} g</strong></span>
              <span><small>脂肪</small><strong>{plan.targets.fat} g</strong></span>
            </div>
            <div className="meal-budget-preview">{plan.meals.map((meal) => <span key={meal.label}><small>{meal.label} {meal.ratio}</small><strong>{meal.calories} kcal</strong></span>)}</div>
          </section>

          <section className="generated-plan-section">
            <header><span className="section-icon section-icon--coral"><Dumbbell size={18} /></span><div><h2>训练计划</h2><p>{plan.training.place} · 每次 {plan.training.sessionMinutes} 分钟</p></div></header>
            <div className="training-plan-head"><strong>{plan.training.title}</strong><span>每周 {plan.training.daysPerWeek} 天</span></div>
            <div className="training-session-list">{plan.training.sessions.map((session, index) => <span key={session}><small>第 {index + 1} 次</small><strong>{session}</strong></span>)}</div>
          </section>

          <div className="estimate-note"><Info size={17} /><span>{dataSource.mode === 'mock' ? '此页使用明确标记的 Mock 策略，仅用于验证交互。' : '此页由真实计划接口返回，策略版本必须由后端记录。'}不构成医疗建议；你可在“我的”中调整。</span></div>
          {activationStatus === 'error' ? <div className="warning-note warning-note--danger" role="alert"><WifiOff size={17} /><span>启用失败：{planError?.message || '无法保存计划'}。当前计划仍未生效。</span></div> : null}
          <div className="onboarding-controls"><button className="text-button" disabled={activationStatus === 'loading'} onClick={() => setStep(3)}>返回修改</button><button className="primary-button" disabled={activationStatus === 'loading'} onClick={activatePlan}>{activationStatus === 'loading' ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}{activationStatus === 'loading' ? '正在启用' : activationStatus === 'error' ? '重试启用计划' : '确认并启用计划'}</button></div>
        </section>
      ) : null}
    </div>
  );
}

function AppModal({ modal, onClose }) {
  const Icon = modal.icon || Info;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="app-modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title">
        <span className={`modal-icon ${modal.danger ? 'is-danger' : ''}`}><Icon size={24} /></span>
        <h2 id="modal-title">{modal.title}</h2>
        <p>{modal.body}</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>取消</button>
          <button className={modal.danger ? 'danger-button' : 'primary-button'} onClick={() => { modal.onConfirm?.(); onClose(); }}>{modal.confirmLabel || '确认'}</button>
        </div>
      </section>
    </div>
  );
}

const PRD_SCOPE = [
  { title: '账户与建档', detail: '游客优先；采集年龄、性别、身高、当前/目标体重、目标与训练条件。' },
  { title: '饮食记录', detail: '四餐、搜索、最近、收藏、自定义、份量编辑、删除、复制和日/周趋势。' },
  { title: '饮食计划', detail: '每日能量、三大营养素、四餐预算与预计周期，不生成具体菜谱。' },
  { title: '训练记录', detail: '模板、动作、组次、重量、时长、距离和 RPE；支持中断恢复。' },
  { title: '训练计划', detail: '周频率、训练模板和单次时长；新版本不改写历史记录。' },
  { title: '数据管理', detail: '体重、趋势、导出、删除、隐私同意和可选单设备云备份。' },
];

const PRD_FLOWS = [
  ['01', '首次建档', '身体资料与体重目标', '活动与训练条件', '风险筛查与单独同意', '双计划预览并确认'],
  ['02', '快速饮食', '首页记录饮食', '自动餐次与搜索', '确认或沿用份量', '本地保存并立即汇总'],
  ['03', '训练执行', '开始今日训练', '逐组记录与自动保存', '完成并填写 RPE', '首页与趋势同步更新'],
  ['04', '调整计划', '修改目标或条件', '生成新草稿', '预览影响和生效日', '确认后归档旧版本'],
];

const PRD_METRICS = [
  ['≤ 10 秒', '高频饮食复记中位时长'],
  ['≤ 3 次', '从首页完成高频复记点击数'],
  ['≥ 90%', '记录开始到保存完成率'],
  ['≤ 8%', '搜索无可用结果率'],
  ['≥ 5 秒', '删除后的撤销窗口'],
  ['< 2 秒', '中端 Android 已有数据首页可用'],
  ['P95 < 200 ms', '本地记录写入耗时'],
  ['≥ 99.5%', 'Crash-free sessions'],
];

function PrdOverview() {
  return (
    <article className="prd-board">
      <header className="prd-hero">
        <div className="prd-title-row"><AppLogo /><StatusPill tone="success">PRD v1.0 · P0</StatusPill></div>
        <span className="prd-eyebrow">产品定位</span>
        <h1>轻量的饮食优先健身记录工具</h1>
        <p>食练格面向希望控制饮食并持续训练的一般健康用户，以“今日 / 我的”两级导航完成记录、计划、复盘与数据管理。</p>
        <div className="prd-principles" aria-label="产品原则">
          <span><Utensils size={18} /><strong>饮食优先</strong><small>首页唯一一级操作</small></span>
          <span><Activity size={18} /><strong>同日闭环</strong><small>记录、训练、趋势联动</small></span>
          <span><ShieldCheck size={18} /><strong>本地优先</strong><small>离线可用，数据可控</small></span>
          <span><Grid2X2 size={18} /><strong>轻量克制</strong><small>无商城、社区和广告</small></span>
        </div>
      </header>

      <section className="prd-section prd-audience">
        <div className="prd-section-heading"><span>01</span><div><h2>目标用户</h2><p>服务普通健康管理，不替代医疗诊断或疾病营养处方。</p></div></div>
        <div className="prd-two-column">
          <div><h3>核心用户</h3><ul><li>需要中文食物、常用份量和快速复记的饮食管理型上班族</li><li>需要组次重量与蛋白质目标的普通健身者</li><li>看重游客模式、离线、导出和明确权限的记录者</li></ul></div>
          <div><h3>安全降级</h3><ul><li>1–17 岁不建立健康档案</li><li>18–79 岁且风险筛查通过，才可生成自动计划</li><li>80 岁及以上或存在孕哺、进食障碍、处方/康复风险时，仅提供手动记录与专业咨询提示</li></ul></div>
        </div>
      </section>

      <section className="prd-section">
        <div className="prd-section-heading"><span>02</span><div><h2>P0 范围</h2><p>先把高频记录和计划闭环做稳，识别、社区、多端同步等能力留到 P1。</p></div></div>
        <div className="prd-scope-grid">
          {PRD_SCOPE.map((item) => <div key={item.title}><CheckCircle2 size={18} /><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>)}
        </div>
        <p className="prd-out-scope"><strong>P1：</strong>照片识别、条码/OCR、具体菜品周计划、多端并发同步、提醒、月趋势与健康平台接入。</p>
      </section>

      <section className="prd-section">
        <div className="prd-section-heading"><span>03</span><div><h2>关键流程</h2><p>任何自动计划都先生成草稿，只有用户确认后才同时生效。</p></div></div>
        <div className="prd-flow-list">
          {PRD_FLOWS.map(([index, title, ...steps]) => (
            <div className="prd-flow" key={index}>
              <span>{index}</span><strong>{title}</strong>
              <div>{steps.map((step, stepIndex) => <span key={step}>{step}{stepIndex < steps.length - 1 ? <ChevronRight size={15} /> : null}</span>)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="prd-section">
        <div className="prd-section-heading"><span>04</span><div><h2>数据边界</h2><p>页面只依赖统一数据源；Mock 与真实 API 显式选择，错误时禁止静默混用。</p></div></div>
        <div className="prd-data-table" role="table" aria-label="数据所有权">
          <div className="prd-data-head" role="row"><span>类别</span><span>内容</span><span>代码位置 / 真相源</span></div>
          <div role="row"><strong>前端配置</strong><span>标签、单位、建档选项、输入边界、线框场景</span><code>src/config/frontendConfig.js</code></div>
          <div role="row"><strong>Mock 假数据</strong><span>演示用户、记录、计划、趋势与备份状态；只用于原型</span><code>src/data-source/mock</code></div>
          <div role="row"><strong>真实业务数据</strong><span>用户资料、饮食/训练记录、目标、计划与同意状态</span><code>Real API / 正式版本地加密仓库</code></div>
        </div>
        <div className="prd-data-flow" aria-label="数据读取流程">
          <span><small>运行配置</small><strong>VITE_DATA_SOURCE</strong></span><ChevronRight size={18} />
          <span><small>统一门面</small><strong>dataSource</strong></span><ChevronRight size={18} />
          <span><small>显式选择</small><strong>Mock 或 API</strong></span><ChevronRight size={18} />
          <span><small>共享校验</small><strong>领域数据</strong></span><ChevronRight size={18} />
          <span><small>页面</small><strong>加载 / 成功 / 错误</strong></span>
        </div>
        <p className="prd-rule"><WifiOff size={17} /><span><strong>关键规则：</strong>API 请求失败时展示错误与重试，不回退 Mock；正式 App 的饮食、训练、体重记录以设备加密本地仓库为交互真相源。</span></p>
      </section>

      <section className="prd-section prd-api-section">
        <div className="prd-section-heading"><span>05</span><div><h2>API 边界</h2><p>Mock 与 API 返回相同 schema，页面不需要知道数据来自哪里。</p></div></div>
        <div className="prd-api-grid">
          <code><b>GET</b> /api/v1/app-bootstrap<small>读取用户、今日记录、计划、趋势和状态</small></code>
          <code><b>POST</b> /api/v1/plan-suggestions<small>根据建档资料生成两份可预览草稿</small></code>
          <code><b>POST</b> /api/v1/plans/activate<small>用户一次确认后同时激活饮食与训练计划</small></code>
        </div>
        <p className="prd-api-note">计划建议必须返回策略版本和 suggestionId；草稿未确认前不得改变首页或 active 计划。</p>
      </section>

      <section className="prd-section">
        <div className="prd-section-heading"><span>06</span><div><h2>验收指标</h2><p>北极星指标：每周有效饮食记录天数；有效日需至少两个不同餐次各有一条未删除记录。</p></div></div>
        <div className="prd-metric-grid">{PRD_METRICS.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        <div className="prd-acceptance-list">
          <span><Check size={16} />390×844 首屏完整显示营养摘要、主操作和四餐</span>
          <span><Check size={16} />风险或策略缺失时转手动记录，不生成自动计划</span>
          <span><Check size={16} />相同输入与策略版本生成相同草稿，重试不产生重复记录</span>
          <span><Check size={16} />离线可增删改与汇总，100 条离线记录可完整备份恢复</span>
        </div>
      </section>
    </article>
  );
}

function WireframeOverview() {
  return (
    <div className="wireframe-board">
      <header><div><AppLogo /><h1>核心线框总览</h1></div><StatusPill tone="neutral">P0 · {WIREFRAME_SCENES.length} 个关键界面</StatusPill></header>
      <div className="wireframe-grid">
        {WIREFRAME_SCENES.map((frame) => <WirePhone key={frame.id} frame={frame} />)}
      </div>
    </div>
  );
}

function WirePhone({ frame }) {
  return (
    <figure className="wire-phone">
      <figcaption>{frame.label}</figcaption>
      <div className="wire-screen">
        <div className="wire-status"><span /><span /></div>
        <div className="wire-header"><i /><b /><i /></div>
        {frame.type === 'onboarding' ? (
          <><div className="wire-progress" />{[1,2,3].map((n) => <div className="wire-form-block" key={n}><b /><span /><span /></div>)}<div className="wire-primary" /></>
        ) : null}
        {frame.type === 'preview' ? (
          <><div className="wire-progress" /><div className="wire-summary"><b /><span /><span /><span /></div><div className="wire-form-block"><b /><span /><span /></div><div className="wire-form-block"><b /><span /><span /></div><div className="wire-primary" /></>
        ) : null}
        {frame.type === 'today' ? (
          <><div className="wire-summary"><b /><span /><span /><span /></div><div className="wire-primary" />{[1,2,3,4].map((n) => <div className="wire-row" key={n}><i /><span /><b /></div>)}<div className="wire-block" /></>
        ) : null}
        {frame.type === 'food' ? (
          <><div className="wire-segment" /><div className="wire-search" />{[1,2,3,4,5].map((n) => <div className="wire-food" key={n}><i /><span /><b /></div>)}</>
        ) : null}
        {frame.type === 'workout' ? (
          <><div className="wire-progress" />{[1,2,3].map((n) => <div className="wire-exercise" key={n}><b /><span /><div /><div /></div>)}<div className="wire-primary" /></>
        ) : null}
        {frame.type === 'my' ? (
          <><div className="wire-profile"><i /><span /></div><div className="wire-stats" />{[1,2,3,4,5,6].map((n) => <div className="wire-row" key={n}><i /><span /><b /></div>)}</>
        ) : null}
        {frame.type === 'goal' ? (
          <>{[1,2,3].map((n) => <div className="wire-form-block" key={n}><b /><span /><span /></div>)}<div className="wire-primary" /></>
        ) : null}
        {frame.type === 'privacy' ? (
          <><div className="wire-block" />{[1,2,3,4,5].map((n) => <div className="wire-row" key={n}><i /><span /><b /></div>)}<div className="wire-danger" /></>
        ) : null}
        {frame.type === 'today' || frame.type === 'my' ? <div className="wire-nav"><i /><i /></div> : null}
      </div>
    </figure>
  );
}

export default App;
