import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { type Task } from '../../domain/Task';
import { INBOX_LIST_ID } from '../../domain/TaskList';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import { formatDayLabel } from '../models/dateLabel';
import { homeSections, type HomeGrouping } from '../models/homeSections';
import { projectTone } from '../models/projectAppearance';
import {
  initialCollapsedSectionIds,
  reconcileCollapsedSectionIds,
  sectionDisclosurePolicy,
} from '../models/sectionDisclosure';
import { DISCLOSURE } from '../animation/motion';
import type { TasksViewModel } from '../view-models/useTasksViewModel';
import { AgoraCard } from '../views/AgoraCard';
import { CaughtUpCard, EmptyStateCard } from '../views/CaughtUpCard';
import { ConfirmDialog } from '../views/ConfirmDialog';
import {
  CalendarGlyph,
  FilterGlyph,
  PriorityGlyph,
  ProjectGlyph,
  TagGlyph,
} from '../views/FieldGlyphs';
import { FloatingAction } from '../views/FloatingAction';
import { PressableScale } from '../views/PressableScale';
import { QuickCaptureSheet } from '../views/QuickCaptureSheet';
import { ScreenHeader } from '../views/ScreenHeader';
import { SectionHeader } from '../views/SectionHeader';
import { TaskCard } from '../views/TaskCard';

interface TodayScreenProps {
  copy: TaskCopy;
  language: AppLanguage;
  viewModel: TasksViewModel;
}

/**
 * The deadline lens: late work, today's deadlines, then what is coming. It
 * informs a decision without inventing a list of compulsory daily tasks.
 */
export function TodayScreen({ copy, language, viewModel }: TodayScreenProps) {
  const theme = useTheme();
  const [isCapturing, setIsCapturing] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [grouping, setGrouping] = useState<HomeGrouping>('deadline');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    [
      copy,
      language,
      viewModel.lists,
      viewModel.nowMs,
      viewModel.tasks,
    ],
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
      setCollapsedSectionIds(
        initialCollapsedSectionIds(grouping, sections),
      );
      return;
    }

    setCollapsedSectionIds(current =>
      reconcileCollapsedSectionIds(current, grouping, sections),
    );
  }, [grouping, sections]);

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
  const restSections = isDeadlineLens
    ? sections.filter(section => section.id !== 'today')
    : sections;
  const isFullyEmpty = viewModel.tasks.length === 0;
  const isCaughtUpToday =
    isDeadlineLens &&
    !isFullyEmpty &&
    (agoraSection == null || agoraSection.tasks.length === 0);
  const nextTask = isCaughtUpToday
    ? restSections[0]?.tasks[0] ?? null
    : null;

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
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow={formatDayLabel(viewModel.nowMs, language)}
          title={copy.today.title}
          trailing={
            <FilterToggle
              accessibilityLabel={copy.today.groupBy}
              accessibilityState={{ expanded: filtersOpen }}
              hitSlop={6}
              onPress={() => setFiltersOpen(open => !open)}
              scaleTo={0.9}
            >
              <FilterGlyph color={theme.colors.mutedStrong} size={17} />
            </FilterToggle>
          }
        />

        {filtersOpen ? (
          <Grouping entering={FadeIn.duration(180)}>
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
              <CalendarGlyph
                color={
                  grouping === 'deadline'
                    ? theme.colors.accentInk
                    : theme.colors.mutedStrong
                }
              />
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
              <TagGlyph
                color={
                  grouping === 'list'
                    ? theme.colors.accentInk
                    : theme.colors.mutedStrong
                }
              />
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
              <PriorityGlyph
                color={
                  grouping === 'priority'
                    ? theme.colors.accentInk
                    : theme.colors.mutedStrong
                }
                size={16}
              />
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
            listOf={listInfoOf}
            nowMs={viewModel.nowMs}
            onDelete={task => setDeleting(task)}
            onEdit={task => setEditing(task)}
            onToggle={taskId => viewModel.toggle(taskId)}
            tasks={agoraSection.tasks}
          />
        ) : null}

        {restSections.map(section => {
          const policy = sectionDisclosurePolicy(
            grouping,
            section.id,
            section.tasks.length,
          );
          const expanded =
            !policy.collapsible || !collapsedSectionIds.has(section.id);

          return (
            <Section key={section.id} layout={sectionLayout}>
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
                    <TaskCard
                      compact
                      copy={copy}
                      index={index}
                      key={task.id}
                      listColor={
                        task.listId === INBOX_LIST_ID
                          ? null
                          : viewModel.listOf(task.listId)?.color ?? null
                      }
                      listIcon={
                        task.listId === INBOX_LIST_ID
                          ? null
                          : viewModel.listOf(task.listId)?.icon ?? null
                      }
                      listName={
                        task.listId === INBOX_LIST_ID
                          ? null
                          : viewModel.listOf(task.listId)?.name ?? null
                      }
                      nowMs={viewModel.nowMs}
                      onDelete={() => setDeleting(task)}
                      onEdit={() => setEditing(task)}
                      onToggle={() => viewModel.toggle(task.id)}
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
        onPress={() => setIsCapturing(true)}
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
const styles = StyleSheet.create({ scroll: { paddingBottom: 168 } });

const sectionLayout = LinearTransition.duration(DISCLOSURE.duration)
  .easing(DISCLOSURE.easing)
  .reduceMotion(ReduceMotion.System);

const Screen = styled.View`
  flex: 1;
`;

const Content = styled.ScrollView`
  flex: 1;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
`;

const FilterToggle = styled(PressableScale)`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
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
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accent : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.cardElevated : theme.colors.card};
`;

const GroupingButtonText = styled.Text<{ $selected: boolean }>`
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.accentInk : theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  font-weight: 800;
`;

const Section = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.large}px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.small}px;
`;
