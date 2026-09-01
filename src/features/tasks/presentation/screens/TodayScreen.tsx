import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { markSheetPress, useRenderCount } from '../../../../app/perf/sheetPerf';
import { type Task } from '../../domain/Task';
import {
  INBOX_LIST_ID,
  type ListColor,
  type ProjectIcon,
} from '../../domain/TaskList';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import { formatDayLabel } from '../models/dateLabel';
import { homeSections, type HomeGrouping } from '../models/homeSections';
import { projectTone } from '../models/projectAppearance';
import {
  initialCollapsedSectionIds,
  reconcileCollapsedSectionIds,
  sectionDisclosurePolicy,
} from '../models/sectionDisclosure';
import {
  contentEnter,
  DISCLOSURE,
  fadeEnter,
  sectionLayout,
} from '../../../../app/animation/motion';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { AgoraCard } from '../views/AgoraCard';
import { CaughtUpCard, EmptyStateCard } from '../views/CaughtUpCard';
import { ConfirmDialog } from '../views/ConfirmDialog';
import {
  CalendarGlyph,
  ChevronGlyph,
  FilterGlyph,
  PriorityGlyph,
  ProjectGlyph,
  TagGlyph,
} from '../views/FieldGlyphs';
import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';
import { FloatingAction } from '../views/FloatingAction';
import { PressableScale } from '../views/PressableScale';
import { QuickCaptureSheet } from '../views/QuickCaptureSheet';
import { ScreenHeader } from '../views/ScreenHeader';
import { SectionHeader } from '../views/SectionHeader';
import { TaskRow, type FocusRowState } from '../views/TaskRow';

interface TodayScreenProps {
  copy: TaskCopy;
  language: AppLanguage;
  viewModel: TasksViewModel;
  /** Opens the focus screen on this task, where the length is chosen before
   * anything starts. The intent crosses screens, so it is owned by the
   * composition root rather than by this one. */
  onChooseFocusDuration?: (task: Task) => void;
  /** The block that is running, if any: the row it belongs to leads to the
   * session instead of to the edit sheet. */
  focus?: {
    taskId: string;
    label: string;
    phase: 'running' | 'paused' | 'finished';
    onOpen: () => void;
  } | null;
}

/**
 * The deadline lens: late work, today's deadlines, then what is coming. It
 * informs a decision without inventing a list of compulsory daily tasks.
 */
export function TodayScreen({
  copy,
  language,
  viewModel,
  onChooseFocusDuration,
  focus = null,
}: TodayScreenProps) {
  const theme = useTheme();
  useRenderCount('TodayScreen');
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const todayRestTop = useRef(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [grouping, setGrouping] = useState<HomeGrouping>('deadline');
  // The lens decides what the whole screen means, so hiding it behind a
  // toggle hid the answer to "why is it ordered like this".
  const [filtersOpen, setFiltersOpen] = useState(true);
  const sectionsForGrouping = useCallback(
    (nextGrouping: HomeGrouping) =>
      homeSections(
        viewModel.tasks,
        nextGrouping,
        viewModel.nowMs,
        language,
        copy,
        viewModel.lists,
      ),
    [copy, language, viewModel.lists, viewModel.nowMs, viewModel.tasks],
  );
  const sections = useMemo(
    () => sectionsForGrouping(grouping),
    [grouping, sectionsForGrouping],
  );
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<
    ReadonlySet<string>
  >(() => initialCollapsedSectionIds('deadline', sections));
  const disclosureInitialized = useRef(sections.length > 0);

  useEffect(() => {
    if (!disclosureInitialized.current && sections.length > 0) {
      disclosureInitialized.current = true;
      setCollapsedSectionIds(initialCollapsedSectionIds(grouping, sections));
      return;
    }

    setCollapsedSectionIds(current =>
      reconcileCollapsedSectionIds(current, grouping, sections),
    );
  }, [grouping, sections]);

  const editTask = useCallback((task: Task) => {
    markSheetPress('QuickCaptureSheet');
    setEditing(task);
  }, []);
  const toggleTask = useCallback(
    (taskId: string) => viewModel.toggle(taskId),
    [viewModel],
  );

  // One object per change of the block, not one per row: the rows are memoized
  // and a fresh object on every render would redraw the whole day each second.
  const focusRow = useMemo<FocusRowState | null>(
    () =>
      focus == null
        ? null
        : { label: focus.label, phase: focus.phase, onOpen: focus.onOpen },
    [focus],
  );

  const changeGrouping = useCallback(
    (nextGrouping: HomeGrouping) => {
      if (nextGrouping === grouping) return;

      const nextSections = sectionsForGrouping(nextGrouping);
      disclosureInitialized.current = true;
      setCollapsedSectionIds(
        initialCollapsedSectionIds(nextGrouping, nextSections),
      );
      setGrouping(nextGrouping);
    },
    [grouping, sectionsForGrouping],
  );

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSectionIds(current => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  }, []);

  // The deadline lens is the only one that leads with a small "now" card —
  // switching to project or priority is an explicit choice to see the whole
  // organizing dimension, so it renders as a plain grouped list instead.
  const isDeadlineLens = grouping === 'deadline';
  const agoraSection = isDeadlineLens
    ? sections.find(section => section.id === 'today')
    : undefined;
  // The band shows one task. The others due today are not hidden — they get
  // the same section every other day gets, and "mais N hoje" scrolls to it.
  const todayRest =
    isDeadlineLens && agoraSection != null && agoraSection.tasks.length > 1
      ? { ...agoraSection, tasks: agoraSection.tasks.slice(1) }
      : null;
  const restSections = isDeadlineLens
    ? [
        ...(todayRest == null ? [] : [todayRest]),
        ...sections.filter(section => section.id !== 'today'),
      ]
    : sections;
  const isFullyEmpty = viewModel.tasks.length === 0;
  const isCaughtUpToday =
    isDeadlineLens &&
    !isFullyEmpty &&
    (agoraSection == null || agoraSection.tasks.length === 0);
  const nextTask = isCaughtUpToday ? restSections[0]?.tasks[0] ?? null : null;

  function listInfoOf(task: Task) {
    const list =
      task.listId === INBOX_LIST_ID ? null : viewModel.listOf(task.listId);

    return {
      name: list?.name ?? null,
      color: list?.color ?? null,
      icon: list?.icon ?? null,
    };
  }

  return (
    <Screen>
      <Content
        contentContainerStyle={styles.scroll}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
      >
        {/* No headline. "Em aberto" never changed, said what the screen
            below already showed, and spent the first third of the phone
            saying it. The date carries the context; the lens under it says
            how the list is ordered. */}
        <ScreenHeader
          count={viewModel.openTaskCount}
          countLabel={copy.today.taskCount(viewModel.openTaskCount)}
          eyebrow={copy.tabs.today}
          subtitle={formatDayLabel(viewModel.nowMs, language)}
          testID="today-header"
          trailing={
            <FilterToggle
              accessibilityLabel={copy.today.groupBy}
              accessibilityState={{ expanded: filtersOpen }}
              hitSlop={6}
              onPress={() => setFiltersOpen(open => !open)}
              scaleTo={0.9}
            >
              <FilterGlyph color={theme.colors.mutedStrong} size={17} />
              {/* The same chevron the section headings use: this control opens
                  the strip right below it, so it has to say whether that strip
                  is open instead of looking like a second way in. */}
              <DisclosureChevron expanded={filtersOpen} />
            </FilterToggle>
          }
        />

        {filtersOpen ? (
          <Grouping entering={fadeEnter()}>
            <GroupingLabel>{copy.today.groupBy}</GroupingLabel>
            <GroupingRow>
              <GroupingButton
                $selected={grouping === 'deadline'}
                accessibilityLabel={copy.today.grouping.deadline}
                accessibilityState={{ selected: grouping === 'deadline' }}
                onPress={() => changeGrouping('deadline')}
                scaleTo={0.97}
                testID="today-group-deadline"
              >
                <GroupingGlyph>
                  <CalendarGlyph
                    color={
                      grouping === 'deadline'
                        ? theme.colors.accentInk
                        : theme.colors.mutedStrong
                    }
                  />
                </GroupingGlyph>
                <GroupingButtonText $selected={grouping === 'deadline'}>
                  {copy.today.grouping.deadline}
                </GroupingButtonText>
              </GroupingButton>

              <GroupingButton
                $selected={grouping === 'list'}
                accessibilityLabel={copy.today.grouping.list}
                accessibilityState={{ selected: grouping === 'list' }}
                onPress={() => changeGrouping('list')}
                scaleTo={0.97}
                testID="today-group-list"
              >
                <GroupingGlyph>
                  <TagGlyph
                    color={
                      grouping === 'list'
                        ? theme.colors.accentInk
                        : theme.colors.mutedStrong
                    }
                  />
                </GroupingGlyph>
                <GroupingButtonText $selected={grouping === 'list'}>
                  {copy.today.grouping.list}
                </GroupingButtonText>
              </GroupingButton>

              <GroupingButton
                $selected={grouping === 'priority'}
                accessibilityLabel={copy.today.grouping.priority}
                accessibilityState={{ selected: grouping === 'priority' }}
                onPress={() => changeGrouping('priority')}
                scaleTo={0.97}
                testID="today-group-priority"
              >
                <GroupingGlyph>
                  <PriorityGlyph
                    color={
                      grouping === 'priority'
                        ? theme.colors.accentInk
                        : theme.colors.mutedStrong
                    }
                    size={16}
                  />
                </GroupingGlyph>
                <GroupingButtonText $selected={grouping === 'priority'}>
                  {copy.today.grouping.priority}
                </GroupingButtonText>
              </GroupingButton>
            </GroupingRow>
          </Grouping>
        ) : null}

        {isFullyEmpty ? (
          <EmptyStateCard copy={copy} onCapture={() => setIsCapturing(true)} />
        ) : null}

        {isCaughtUpToday ? (
          <CaughtUpCard
            copy={copy}
            nextTaskTitle={nextTask?.title ?? null}
            onViewAll={() => setFiltersOpen(false)}
          />
        ) : null}

        {isDeadlineLens && !isFullyEmpty && agoraSection != null ? (
          <AgoraCard
            copy={copy}
            focus={
              focus?.taskId === agoraSection.tasks[0]?.id && focusRow != null
                ? focusRow
                : undefined
            }
            listOf={listInfoOf}
            nowMs={viewModel.nowMs}
            /* One block at a time, here too: with a block running, the band's
               time action would open the session of another task. */
            onChooseDuration={
              focus != null ? undefined : task => onChooseFocusDuration?.(task)
            }
            onShowRest={() =>
              scrollRef.current?.scrollTo({
                y: Math.max(0, todayRestTop.current - theme.spacing.medium),
                animated: true,
              })
            }
            onToggle={taskId => viewModel.toggle(taskId)}
            tasks={agoraSection.tasks}
          />
        ) : null}

        {restSections.map((section, sectionIndex) => {
          const policy = sectionDisclosurePolicy(
            grouping,
            section.id,
            section.tasks.length,
          );
          const expanded =
            !policy.collapsible || !collapsedSectionIds.has(section.id);

          return (
            <Section
              entering={contentEnter(sectionIndex)}
              key={section.id}
              layout={sectionTransition}
              onLayout={
                section === todayRest
                  ? event => {
                      todayRestTop.current = event.nativeEvent.layout.y;
                    }
                  : undefined
              }
            >
              <SectionHeader
                collapseHint={copy.today.collapse}
                collapsible={policy.collapsible}
                count={section.tasks.length}
                countLabel={copy.today.taskCount(section.tasks.length)}
                emphasis={section.id === 'overdue'}
                expandHint={copy.today.expand}
                expanded={expanded}
                icon={
                  section.project == null ? undefined : (
                    <ProjectGlyph
                      color={projectTone(theme, section.project.color)}
                      icon={section.project.icon}
                      size={15}
                    />
                  )
                }
                onToggle={() => toggleSection(section.id)}
                title={section.title}
              />

              {expanded
                ? section.tasks.map((task, index) => (
                    <HomeTaskRow
                      copy={copy}
                      focus={
                        focus?.taskId === task.id && focusRow != null
                          ? focusRow
                          : undefined
                      }
                      index={index}
                      key={task.id}
                      lens={grouping}
                      // The inbox is passed like any other list. Hiding it
                      // left the fact column blank on exactly the tasks that
                      // had never been filed, which is not what blank means.
                      listColor={viewModel.listOf(task.listId)?.color ?? null}
                      listIcon={viewModel.listOf(task.listId)?.icon ?? null}
                      listName={viewModel.listOf(task.listId)?.name ?? null}
                      nowMs={viewModel.nowMs}
                      onEditTask={editTask}
                      onToggleTask={toggleTask}
                      sectionId={section.id}
                      task={task}
                    />
                  ))
                : null}
            </Section>
          );
        })}
      </Content>

      <FloatingAction
        label={copy.today.capture}
        onPress={() => {
          markSheetPress('QuickCaptureSheet');
          setIsCapturing(true);
        }}
        testID="today-capture"
      />

      {isCapturing ? (
        <QuickCaptureSheet
          copy={copy}
          language={language}
          lists={viewModel.lists}
          nowMs={viewModel.nowMs}
          onCancel={() => setIsCapturing(false)}
          onSubmit={viewModel.capture}
        />
      ) : null}

      {editing == null ? null : (
        <QuickCaptureSheet
          copy={copy}
          editing={{
            title: editing.title,
            priority: editing.priority,
            dueAtMs: editing.dueAtMs,
            listId: editing.listId,
          }}
          language={language}
          lists={viewModel.lists}
          nowMs={viewModel.nowMs}
          onCancel={() => setEditing(null)}
          onDelete={() => {
            const subject = editing;
            setEditing(null);
            setDeleting(subject);
          }}
          /* One block at a time: while one is running, the sheet of another
             task does not offer to start a second one. */
          onFocus={
            onChooseFocusDuration == null || focus != null
              ? undefined
              : () => {
                  const subject = editing;
                  setEditing(null);
                  onChooseFocusDuration(subject);
                }
          }
          onSubmit={(typed, overrides) => {
            viewModel.edit(editing.id, { title: typed, ...overrides });
            setEditing(null);
          }}
        />
      )}

      {deleting == null ? null : (
        <ConfirmDialog
          cancelLabel={copy.today.removeCancel}
          confirmLabel={copy.today.remove}
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            viewModel.remove(deleting.id);
            setDeleting(null);
          }}
          testID="task-confirm"
          title={copy.today.removeConfirm(deleting.title)}
        />
      )}
    </Screen>
  );
}

/** Room under the last card for the floating capture button. The FAB sits
 * at bottom:32 with a 54px+ pill and its own shadow, so the scroll needs
 * clearance past that plus a real gap, or the last expanded row hides
 * behind it. */
interface HomeTaskRowProps {
  copy: TaskCopy;
  index: number;
  lens: HomeGrouping;
  listColor: ListColor | null;
  listIcon: ProjectIcon | null;
  listName: string | null;
  nowMs: number;
  sectionId: string;
  task: Task;
  onEditTask: (task: Task) => void;
  onToggleTask: (taskId: string) => void;
  focus?: FocusRowState;
}

/**
 * One row of the day, wrapped so its props hold still.
 *
 * Opening a sheet only changes state on the screen, and the row used to get a
 * pair of freshly built handlers on every one of those renders — so every task
 * on screen re-rendered in the frame the sheet was trying to animate in.
 */
const HomeTaskRow = memo(function HomeTaskRowView({
  copy,
  index,
  lens,
  listColor,
  listIcon,
  listName,
  nowMs,
  sectionId,
  task,
  onEditTask,
  onToggleTask,
  focus,
}: HomeTaskRowProps) {
  const handleEdit = useCallback(() => onEditTask(task), [onEditTask, task]);
  const handleToggle = useCallback(
    () => onToggleTask(task.id),
    [onToggleTask, task.id],
  );

  return (
    <TaskRow
      copy={copy}
      focus={focus}
      index={index}
      lens={lens}
      listColor={listColor}
      listIcon={listIcon}
      listName={listName}
      nowMs={nowMs}
      onEdit={handleEdit}
      onToggle={handleToggle}
      sectionId={sectionId}
      task={task}
    />
  );
});

/** The disclosure state of the grouping strip, drawn like every other
 * disclosure in the app: pointing right when closed, down when open. */
function DisclosureChevron({ expanded }: { expanded: boolean }) {
  const theme = useTheme();
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, DISCLOSURE);
  }, [expanded, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-90 + progress.value * 90}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ChevronGlyph color={theme.colors.mutedStrong} size={16} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({ scroll: { paddingBottom: 168 } });

const sectionTransition = sectionLayout();

const Screen = styled.View`
  flex: 1;
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

const FilterToggle = styled(PressableScale)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 56px;
  min-height: 48px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
`;

const Grouping = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const GroupingLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
`;

const GroupingRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.tiny + 2}px;
`;

const GroupingButton = styled(PressableScale)<{ $selected: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.tiny + 2}px;
  min-height: 48px;
  padding: 0px 10px;
  /* The selected chip is read by its shape — a thicker accent ring — so the
     state does not depend on a pale fill alone. */
  border-width: ${({ $selected }) => ($selected ? 1.5 : 1)}px;
  border-style: solid;
  border-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.accent : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.cardElevated : theme.colors.card};
`;

/* A fixed box for the glyph: the three of them are drawn at different sizes,
   and without a box of their own the labels beside them sat at three different
   heights. */
const GroupingGlyph = styled.View`
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
`;

const GroupingButtonText = styled.Text.attrs(buttonTextAttrs)<{
  $selected: boolean;
}>`
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.accentInk : theme.colors.mutedStrong};
  ${({ theme }) => buttonTextMetrics(theme.type.caption + 1)}
  font-weight: ${({ $selected }) => ($selected ? 600 : 800)};
`;

const Section = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.large}px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.small}px;
`;
