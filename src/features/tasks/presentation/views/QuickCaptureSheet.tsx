import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Keyboard } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import type { CaptureOverrides } from '../../application/useCases/captureTask';
import { daysBetween } from '../../domain/Day';
import { parseCapture } from '../../domain/QuickCapture';
import type { TaskPriority } from '../../domain/Task';
import { findListByName, type TaskList } from '../../domain/TaskList';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import { CalendarPanel } from './CalendarPanel';
import {
  CalendarGlyph,
  PriorityGlyph,
  ProjectGlyph,
  TagGlyph,
  TrashGlyph,
} from './FieldGlyphs';
import { ListPanel } from './ListPanel';
import { projectTone } from '../models/projectAppearance';
import {
  buttonTextAttrs,
  buttonTextMetrics,
} from '../../../../app/theme/buttonText';
import { PressableScale } from './PressableScale';
import {
  SheetActionsRow,
  SheetActionsSpacer,
  SheetCancelButton,
  SheetPrimaryButton,
} from './SheetActions';
import { SLIDE } from '../animation/motion';

/** What an existing task looks like when the same sheet is used to change it. */
export interface SheetSubject {
  title: string;
  priority: TaskPriority;
  dueAtMs: number | null;
  listId: string | null;
}

interface QuickCaptureSheetProps {
  copy: TaskCopy;
  language: AppLanguage;
  lists: readonly TaskList[];
  nowMs: number;
  /** Used from a list's own “add task” action. */
  initialListId?: string | null;
  /** Present when editing. The text is then stored as written — nothing is
   * parsed out of it, because renaming a task to "ligar urgente" means those
   * words. */
  editing?: SheetSubject;
  onCancel: () => void;
  /** Deleting lives here because the row no longer carries a trash: it is the
   * sheet a tap already opens, and the screen still confirms. */
  onDelete?: () => void;
  onSubmit: (
    typed: string,
    overrides: CaptureOverrides,
    tookMs: number,
  ) => void;
}

/**
 * One field, and what the app understood.
 *
 * Nothing is hidden until save: the chips under the field update on every
 * keystroke, so the person can see that "sexta 9h" became a date before they
 * commit to it.
 *
 * The chips are also the controls. Punctuation like `!alta` is a shortcut for
 * whoever learns it, never the only road in — anyone who would rather not type
 * it taps the chip instead, and a tap always beats what the text was read as.
 */
export function QuickCaptureSheet({
  copy,
  language,
  lists,
  nowMs,
  initialListId,
  editing,
  onCancel,
  onDelete,
  onSubmit,
}: QuickCaptureSheetProps) {
  const theme = useTheme();
  const isEditing = editing != null;
  // The stopwatch for the whole point of this screen. `nowMs` only ticks once
  // a minute, so the wall clock is what times a thing measured in seconds.
  const openedAt = useRef(Date.now());
  const [typed, setTyped] = useState(editing?.title ?? '');
  const input = useRef<ComponentRef<typeof Field>>(null);
  const draft = useMemo(() => parseCapture(typed, nowMs), [nowMs, typed]);
  const canSave = typed.trim().length > 0;
  // The sheet rides the keyboard on the UI thread. `KeyboardAvoidingView` is
  // not enough here: the app draws edge to edge, so the window never shrinks
  // and the sheet would sit behind the keys.
  const keyboard = useAnimatedKeyboard();
  const lift = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));

  // Undefined means "not touched", so what the text said still stands. Once a
  // chip is tapped it holds, even if the person keeps typing.
  const [priorityOverride, setPriorityOverride] = useState<TaskPriority | null>(
    editing?.priority ?? null,
  );
  const [dueOverride, setDueOverride] = useState<number | null | undefined>(
    editing == null ? undefined : editing.dueAtMs,
  );
  const [listOverride, setListOverride] = useState<string | null | undefined>(
    editing == null ? initialListId ?? undefined : editing.listId,
  );
  // This name is provisional: cancelling this task must not leave an empty
  // list behind. The use case creates both together only on save.
  const [newListName, setNewListName] = useState<string | null>(null);

  const [panel, setPanel] = useState<'none' | 'date' | 'list' | 'listNew'>(
    'none',
  );

  const priority = priorityOverride ?? draft.priority;
  const dueAtMs = dueOverride === undefined ? draft.dueAtMs : dueOverride;
  const typedList = findListByName(lists, draft.listName);
  const listId =
    listOverride === undefined ? typedList?.id ?? null : listOverride;
  const chosenList = lists.find(list => list.id === listId) ?? null;
  const listLabel =
    newListName != null
      ? newListName
      : listOverride === undefined && draft.listName != null
      ? draft.listName
      : chosenList?.name ?? copy.capture.noList;
  // Editing never re-reads the text, so an estimate typed months ago does not
  // reappear as a chip on a title being renamed.
  const estimateMinutes = isEditing ? null : draft.estimatedMinutes;
  const estimateLabel =
    estimateMinutes == null ? '' : copy.capture.minutes(estimateMinutes);
  const priorityColor =
    priority === 'high'
      ? theme.colors.danger
      : priority === 'medium'
      ? theme.colors.accentInk
      : theme.colors.muted;
  const dateLabel =
    dueAtMs == null
      ? copy.capture.noDate
      : formatChipDate(
          dueAtMs,
          nowMs,
          copy,
          dueOverride === undefined && draft.hasTimeOfDay,
        );

  useEffect(() => {
    // The keyboard is the point of this screen; opening it is not the user's
    // job.
    const timer = setTimeout(() => input.current?.focus(), 80);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Back closes the sheet. Without this it closed the app, which is a
    // spectacular answer to "never mind".
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onCancel();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onCancel]);

  /** Priority has three states and no detail behind them, so it steps in
   * place: opening a panel to choose one of three would be a ceremony. */
  function cyclePriority() {
    const order: TaskPriority[] = ['low', 'medium', 'high'];

    setPriorityOverride(order[(order.indexOf(priority) + 1) % order.length]);
  }

  /** Date and list have more answers than a tap can cycle through, so each
   * opens its own panel. The keyboard steps aside to make room for it. */
  function openPanel(next: 'date' | 'list') {
    setPanel(current => {
      const opening = current !== next;

      if (opening) Keyboard.dismiss();

      return opening ? next : 'none';
    });
  }

  function save() {
    if (!canSave) return;

    onSubmit(
      typed,
      {
        ...(priorityOverride == null ? {} : { priority: priorityOverride }),
        ...(dueOverride === undefined ? {} : { dueAtMs: dueOverride }),
        ...(newListName == null && listOverride === undefined
          ? {}
          : newListName == null
          ? { listId: listOverride }
          : { newListName }),
      },
      Date.now() - openedAt.current,
    );
    setTyped('');
    // The sheet closes on save. Keeping it open hid the very thing the person
    // was waiting to see — the task landing on the day behind it — and left
    // them unsure whether anything had been saved at all.
    onCancel();
  }

  return (
    <Overlay>
      <Scrim entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)}>
        <ScrimTouch
          accessibilityLabel={copy.capture.cancel}
          accessibilityRole="button"
          onPress={onCancel}
        />
      </Scrim>
      <Lift style={lift}>
        <Sheet
          entering={SlideInDown.duration(SLIDE.duration).easing(SLIDE.easing)}
          exiting={SlideOutDown.duration(200)}
        >
          <Grabber />
          <Field
            accessibilityLabel={copy.capture.placeholder}
            autoCorrect={false}
            blurOnSubmit={false}
            multiline
            onChangeText={setTyped}
            onSubmitEditing={save}
            placeholder={copy.capture.placeholder}
            ref={input}
            returnKeyType="done"
            testID="capture-field"
            value={typed}
          />

          <Chips>
            {/* Three unrelated things, so three different shapes: a date is a
                square-cornered field that opens a calendar, a priority is a
                coloured attention mark, a list is a dot with a
                name. Nothing here is a generic pill any more. */}
            <DateChip
              $open={panel === 'date'}
              $set={dueAtMs != null}
              accessibilityLabel={dateLabel}
              accessibilityState={{ expanded: panel === 'date' }}
              onPress={() => openPanel('date')}
              testID="capture-chip-date"
            >
              <ChipGlyph>
                <CalendarGlyph
                  color={
                    dueAtMs == null
                      ? theme.colors.muted
                      : theme.colors.accentInk
                  }
                />
              </ChipGlyph>
              <ChipText $color={dueAtMs == null ? 'muted' : 'accent'}>
                {dateLabel}
              </ChipText>
            </DateChip>

            <PriorityChip
              $tone={priority}
              accessibilityLabel={copy.capture.priority[priority]}
              onPress={cyclePriority}
              testID="capture-chip-priority"
            >
              <ChipGlyph>
                <PriorityGlyph
                  color={priorityColor}
                  level={priority === 'low' ? 1 : priority === 'medium' ? 2 : 3}
                  size={16}
                />
              </ChipGlyph>
              <PriorityText $tone={priority}>
                {copy.capture.priority[priority]}
              </PriorityText>
            </PriorityChip>

            <ListChip
              $open={panel === 'list'}
              accessibilityLabel={listLabel}
              accessibilityState={{ expanded: panel === 'list' }}
              onPress={() => openPanel('list')}
              testID="capture-chip-list"
            >
              <ChipGlyph>
                {chosenList == null || newListName != null ? (
                  <TagGlyph color={theme.colors.muted} />
                ) : (
                  <ProjectGlyph
                    color={projectTone(theme, chosenList.color)}
                    icon={chosenList.icon}
                  />
                )}
              </ChipGlyph>
              <ChipText $color={chosenList == null ? 'muted' : 'text'}>
                {listLabel}
              </ChipText>
            </ListChip>

            {estimateMinutes == null ? null : (
              <ListChip $open={false} accessibilityLabel={estimateLabel}>
                <ChipText $color="muted">{estimateLabel}</ChipText>
              </ListChip>
            )}
          </Chips>

          {panel === 'date' ? (
            <CalendarPanel
              copy={copy}
              language={language}
              nowMs={nowMs}
              onSelect={due => {
                setDueOverride(due);
                setPanel('none');
              }}
              selectedMs={dueAtMs}
            />
          ) : null}

          {panel === 'list' ? (
            <ListPanel
              copy={copy}
              lists={lists}
              onSelect={id => {
                setListOverride(id);
                setNewListName(null);
                setPanel('none');
              }}
              onCreateNew={() => setPanel('listNew')}
              selectedId={listId}
            />
          ) : null}

          {panel === 'listNew' ? (
            <NewListComposer>
              <NewListField
                autoCapitalize="sentences"
                autoCorrect
                autoFocus
                onChangeText={value => setNewListName(value)}
                placeholder={copy.lists.namePlaceholder}
                testID="capture-new-list-field"
                value={newListName ?? ''}
              />
              <NewListActions>
                <NewListCancel
                  accessibilityLabel={copy.capture.cancel}
                  onPress={() => {
                    setNewListName(null);
                    setPanel('list');
                  }}
                >
                  <NewListCancelText>{copy.capture.cancel}</NewListCancelText>
                </NewListCancel>
                <NewListUse
                  accessibilityLabel={copy.lists.create}
                  disabled={(newListName ?? '').trim().length === 0}
                  onPress={() => setPanel('none')}
                >
                  <NewListUseText>{copy.lists.create}</NewListUseText>
                </NewListUse>
              </NewListActions>
            </NewListComposer>
          ) : null}

          {panel === 'none' ? (
            <>
              <Hint>
                {isEditing ? copy.capture.editHint : copy.capture.hint}
              </Hint>
              {isEditing ? null : <Syntax>{copy.capture.syntax}</Syntax>}
            </>
          ) : null}

          <SheetActionsRow>
            <SheetCancelButton label={copy.capture.cancel} onPress={onCancel} />

            {isEditing && onDelete != null ? (
              <Delete
                accessibilityLabel={copy.today.remove}
                hitSlop={8}
                onPress={onDelete}
                scaleTo={0.88}
                testID="capture-delete"
              >
                <TrashGlyph color={theme.colors.danger} size={18} />
              </Delete>
            ) : null}

            <SheetActionsSpacer />
            <SheetPrimaryButton
              disabled={!canSave}
              label={copy.capture.save}
              onPress={save}
              testID="capture-save"
            />
          </SheetActionsRow>
        </Sheet>
      </Lift>
    </Overlay>
  );
}

function formatChipDate(
  dueAtMs: number,
  nowMs: number,
  copy: TaskCopy,
  hasTime: boolean,
): string {
  const due = new Date(dueAtMs);
  const now = new Date(nowMs);
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  // The chip and the card have to agree: reading "amanhã" here and "29/8" on
  // the card that follows makes the person doubt both.
  const day = sameDay
    ? copy.capture.today
    : daysBetween(nowMs, dueAtMs) === 1
    ? copy.capture.tomorrow
    : `${due.getDate()}/${due.getMonth() + 1}`;

  if (!hasTime) return day;

  const time = `${due.getHours().toString().padStart(2, '0')}:${due
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  return `${day} · ${time}`;
}

const Overlay = styled.View`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  justify-content: flex-end;
`;

const Scrim = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: ${({ theme }) => theme.colors.scrim};
`;

const ScrimTouch = styled.Pressable`
  flex: 1;
`;

const Lift = styled(Animated.View)`
  width: 100%;
`;

const Sheet = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.background};
  border-top-left-radius: ${({ theme }) => theme.radii.extraLarge}px;
  border-top-right-radius: ${({ theme }) => theme.radii.extraLarge}px;
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large + 8}px;
`;

const Grabber = styled.View`
  width: 36px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.border};
  align-self: center;
  margin-bottom: ${({ theme }) => theme.spacing.medium}px;
`;

const Field = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
}))`
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body + 1}px;
  padding: 13px 14px;
  min-height: 52px;
`;

const Chips = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small - 2}px;
  margin-top: ${({ theme }) => theme.spacing.small + 4}px;
`;

/** Shared skeleton. What differs between the three is deliberate, and lives
 * in the components below. */
const ChipBase = styled(PressableScale)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
  border-width: 1px;
`;

/** Square-cornered, like a field you fill in — and it opens a calendar. */
const DateChip = styled(ChipBase)<{ $open: boolean; $set: boolean }>`
  border-radius: ${({ theme }) => theme.radii.small}px;
  border-color: ${({ theme, $open, $set }) =>
    $open || $set ? theme.colors.accentInk : theme.colors.border};
  background-color: ${({ theme, $open }) =>
    $open ? theme.colors.cardElevated : 'transparent'};
`;

/** The only chip that carries colour, because priority is the only one of the
 * three that means severity. */
const PriorityChip = styled(ChipBase)<{ $tone: TaskPriority }>`
  border-radius: ${({ theme }) => theme.radii.pill}px;
  border-color: ${({ theme, $tone }) =>
    $tone === 'high'
      ? theme.colors.danger
      : $tone === 'medium'
      ? theme.colors.accentInk
      : theme.colors.border};
  background-color: transparent;
`;

/** A rounded tag, carrying the list's own colour as its dot. */
const ListChip = styled(ChipBase)<{ $open: boolean }>`
  border-radius: ${({ theme }) => theme.radii.pill}px;
  border-color: ${({ theme, $open }) =>
    $open ? theme.colors.accentInk : theme.colors.border};
  background-color: ${({ theme, $open }) =>
    $open ? theme.colors.cardElevated : 'transparent'};
`;

const ChipText = styled.Text.attrs(buttonTextAttrs)<{
  $color: 'muted' | 'text' | 'accent';
}>`
  ${({ theme }) => buttonTextMetrics(theme.type.caption)}
  font-weight: 700;
  color: ${({ theme, $color }) =>
    $color === 'muted'
      ? theme.colors.muted
      : $color === 'accent'
      ? theme.colors.accentInk
      : theme.colors.text};
`;

/* The three chips carry glyphs drawn at different sizes; a box of their own
   keeps the words beside them on one baseline. */
const ChipGlyph = styled.View`
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
`;

const PriorityText = styled.Text.attrs(buttonTextAttrs)<{
  $tone: TaskPriority;
}>`
  ${({ theme }) => buttonTextMetrics(theme.type.caption)}
  font-weight: 700;
  color: ${({ theme, $tone }) =>
    $tone === 'high'
      ? theme.colors.danger
      : $tone === 'medium'
      ? theme.colors.accentInk
      : theme.colors.muted};
`;

const Hint = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  margin-top: ${({ theme }) => theme.spacing.small + 4}px;
`;

const Syntax = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;

const NewListComposer = styled.View`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const NewListField = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
}))`
  border: 1px solid ${({ theme }) => theme.colors.accentInk};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  padding: 11px 13px;
`;

const NewListActions = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const NewListCancel = styled(PressableScale)`
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
`;

const NewListCancelText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.mutedStrong};
  ${({ theme }) => buttonTextMetrics(theme.type.caption)}
  font-weight: 700;
`;

const NewListUse = styled(PressableScale)`
  min-height: 48px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme, disabled }) =>
    disabled ? theme.colors.cardElevated : theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.small}px;
  padding: 0px ${({ theme }) => theme.spacing.medium}px;
`;

const NewListUseText = styled.Text.attrs(buttonTextAttrs)`
  color: ${({ theme }) => theme.colors.onAccent};
  ${({ theme }) => buttonTextMetrics(theme.type.caption)}
  font-weight: 800;
`;

/** The one destructive control in the sheet, and the only red in it. */
const Delete = styled(PressableScale)`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
`;
