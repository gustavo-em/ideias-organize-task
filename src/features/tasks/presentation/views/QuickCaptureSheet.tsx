import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Dimensions, Keyboard } from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { useSheetOpenTrace } from '../../../../app/perf/sheetPerf';
import type { CaptureOverrides } from '../../application/useCases/captureTask';
import { daysBetween, endOfDay } from '../../domain/Day';
import { parseCapture } from '../../domain/QuickCapture';
import type { TaskPriority } from '../../domain/Task';
import { findListByName, type TaskList } from '../../domain/TaskList';
import type { AppLanguage, TaskCopy } from '../localization/taskCopy';
import { CalendarPanel } from './CalendarPanel';
import {
  CalendarGlyph,
  ChevronGlyph,
  PlayGlyph,
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
import {
  disclosureEnter,
  fadeExit,
  scrimEnter,
  scrimExit,
  sectionLayout,
  sheetExit,
  sheetSlideEnter,
} from '../../../../app/animation/motion';

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
  /** Starts a focus block on the task being edited. Absent while another
   * block is running, so a second one can never be opened by mistake. */
  onFocus?: () => void;
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
  onFocus,
  onCancel,
  onDelete,
  onSubmit,
}: QuickCaptureSheetProps) {
  const theme = useTheme();
  const traceOpen = useSheetOpenTrace('QuickCaptureSheet');
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
  //
  // The keyboard height is measured from the bottom of the *window*, and this
  // overlay does not reach it: the screens live above the tab bar, inside a
  // safe area of their own. That difference — measured here rather than guessed
  // from an inset — was the strip of page that kept showing between the sheet
  // and the keys.
  const keyboard = useAnimatedKeyboard();
  const overlay = useRef<ComponentRef<typeof Overlay>>(null);
  const distanceToWindowBottom = useSharedValue(0);
  const restingBottomPadding = theme.spacing.large + 8;
  const keyboardBottomPadding = theme.spacing.medium;
  const measureOverlay = () => {
    overlay.current?.measureInWindow(
      (_x: number, y: number, _width: number, height: number) => {
        const windowHeight = Dimensions.get('window').height;

        distanceToWindowBottom.value = Math.max(0, windowHeight - (y + height));
      },
    );
  };
  const lift = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: -Math.max(
          keyboard.height.value - distanceToWindowBottom.value,
          0,
        ),
      },
    ],
  }));
  // Standing on the keys, the sheet needs less floor than it does standing on
  // the gesture bar; at rest the deeper padding comes back.
  const floor = useAnimatedStyle(() => ({
    paddingBottom:
      keyboard.height.value > 0 ? keyboardBottomPadding : restingBottomPadding,
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

  const [panel, setPanel] = useState<
    'none' | 'date' | 'list' | 'listNew' | 'syntax'
  >('none');
  // The sheet opens on its smallest layer: a field and two ways in. Editing is
  // the exception — the chips are the whole point of reopening a task. This is
  // local state on purpose: every new capture starts minimal again.
  const [expanded, setExpanded] = useState(isEditing);

  const priority = priorityOverride ?? draft.priority;
  // A task written now is a task for now: a new capture starts on today rather
  // than with no date at all. What the text says still wins — typing "sexta"
  // moves it — and the chip stays a way out, to another day or to none.
  const defaultDueAtMs = isEditing ? null : endOfDay(nowMs);
  const dueAtMs =
    dueOverride === undefined ? draft.dueAtMs ?? defaultDueAtMs : dueOverride;
  const isUsingDefaultDue =
    dueOverride === undefined && draft.dueAtMs == null && dueAtMs != null;
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
  // High priority is emphasis, not alarm: `danger` is kept for the destructive
  // action.
  // The default ("média") is not a choice yet: it only takes the strong
  // outline once the text or the chip says so, or the other two chips read as
  // unset next to one that looks picked.
  const priorityChosen =
    priorityOverride != null || draft.priority !== 'medium';
  const priorityColor =
    priority === 'high'
      ? theme.colors.text
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

  // A chip that already carries an answer shows itself, expanded or not: what
  // the text was understood as is never hidden behind a disclosure.
  const showDate = expanded || dueAtMs != null;
  const showPriority = expanded || priorityChosen;
  const showList =
    expanded ||
    listId != null ||
    newListName != null ||
    (listOverride === undefined && draft.listName != null);
  const showChips =
    showDate || showPriority || showList || estimateMinutes != null;

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

  /** Collapsing takes the whole layer down with it: a calendar left open over
   * a chip that no longer exists has nothing to point back at. The writing
   * shortcuts are not part of that layer, so they stay. */
  function toggleExpanded() {
    const next = !expanded;

    setExpanded(next);
    if (!next && panel !== 'syntax') setPanel('none');
  }

  function save() {
    if (!canSave) return;

    onSubmit(
      typed,
      {
        ...(priorityOverride == null ? {} : { priority: priorityOverride }),
        ...(dueOverride === undefined
          ? // Saving without touching the date keeps the day the chip has been
            // showing all along: today.
            isUsingDefaultDue
            ? { dueAtMs }
            : {}
          : { dueAtMs: dueOverride }),
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
    <Overlay onLayout={measureOverlay} ref={overlay}>
      <Scrim entering={scrimEnter()} exiting={scrimExit()}>
        <ScrimTouch
          accessibilityLabel={copy.capture.cancel}
          accessibilityRole="button"
          onPress={onCancel}
        />
      </Scrim>
      <Lift style={lift}>
        <Sheet
          entering={sheetSlideEnter()}
          exiting={sheetExit()}
          onLayout={traceOpen}
          style={floor}
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

          {showChips ? (
            <Chips layout={sectionLayout()}>
              {/* Three unrelated things, so three different shapes: a date is a
                square-cornered field that opens a calendar, a priority is a
                coloured attention mark, a list is a dot with a
                name. Nothing here is a generic pill any more. */}
              {showDate ? (
                <Animated.View
                  entering={disclosureEnter()}
                  exiting={fadeExit()}
                >
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
                </Animated.View>
              ) : null}

              {showPriority ? (
                <Animated.View
                  entering={disclosureEnter()}
                  exiting={fadeExit()}
                >
                  <PriorityChip
                    $chosen={priorityChosen}
                    $tone={priority}
                    accessibilityLabel={copy.capture.priority[priority]}
                    onPress={cyclePriority}
                    testID="capture-chip-priority"
                  >
                    <ChipGlyph>
                      <PriorityGlyph
                        color={priorityColor}
                        level={
                          priority === 'low' ? 1 : priority === 'medium' ? 2 : 3
                        }
                        size={16}
                      />
                    </ChipGlyph>
                    <PriorityText $tone={priority}>
                      {copy.capture.priority[priority]}
                    </PriorityText>
                  </PriorityChip>
                </Animated.View>
              ) : null}

              {showList ? (
                <Animated.View
                  entering={disclosureEnter()}
                  exiting={fadeExit()}
                >
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
                </Animated.View>
              ) : null}

              {estimateMinutes == null ? null : (
                <Animated.View
                  entering={disclosureEnter()}
                  exiting={fadeExit()}
                >
                  <ListChip $open={false} accessibilityLabel={estimateLabel}>
                    <ChipText $color="muted">{estimateLabel}</ChipText>
                  </ListChip>
                </Animated.View>
              )}
            </Chips>
          ) : null}

          <Controls>
            <MoreToggle
              accessibilityLabel={
                expanded ? copy.capture.lessOptions : copy.capture.moreOptions
              }
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={toggleExpanded}
              scaleTo={0.96}
              testID="capture-more"
            >
              <ChevronGlyph color={theme.colors.mutedStrong} up={expanded} />
              <MoreToggleText>
                {expanded ? copy.capture.lessOptions : copy.capture.moreOptions}
              </MoreToggleText>
            </MoreToggle>

            {isEditing ? null : (
              <SyntaxToggle
                $open={panel === 'syntax'}
                accessibilityLabel={copy.capture.syntaxTitle}
                accessibilityRole="button"
                accessibilityState={{ expanded: panel === 'syntax' }}
                onPress={() =>
                  setPanel(current =>
                    current === 'syntax' ? 'none' : 'syntax',
                  )
                }
                scaleTo={0.92}
                testID="capture-syntax"
              >
                <SyntaxToggleText $open={panel === 'syntax'}>
                  ?
                </SyntaxToggleText>
              </SyntaxToggle>
            )}
          </Controls>

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

          {panel === 'syntax' ? (
            <SyntaxPanel entering={disclosureEnter()} exiting={fadeExit()}>
              <SyntaxTitle>{copy.capture.syntaxTitle}</SyntaxTitle>
              {copy.capture.examples.map(example => (
                <SyntaxLine key={example}>{example}</SyntaxLine>
              ))}
              <SyntaxHelp>{copy.capture.syntaxHelp}</SyntaxHelp>
            </SyntaxPanel>
          ) : null}

          {panel === 'none' && (expanded || isEditing) ? (
            <Hint>{isEditing ? copy.capture.editHint : copy.capture.hint}</Hint>
          ) : null}

          <ActionsShift layout={sectionLayout()}>
            <SheetActionsRow>
              <SheetCancelButton
                label={copy.capture.cancel}
                onPress={onCancel}
              />

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

              {isEditing && onFocus != null ? (
                <FocusAction
                  accessibilityLabel={copy.focus.action}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onFocus}
                  scaleTo={0.94}
                  testID="sheet-focus"
                >
                  <PlayGlyph color={theme.colors.accentInk} size={16} />
                </FocusAction>
              ) : null}

              <SheetActionsSpacer />
              <SheetPrimaryButton
                disabled={!canSave}
                label={copy.capture.save}
                onPress={save}
                testID="capture-save"
              />
            </SheetActionsRow>
          </ActionsShift>
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
  /* The floor is animated above: deep at rest, to clear the gesture bar, and
     shallower on the keys. */
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.large}px 0px;
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

/* One line, always. Wrapping put a second row under the field in Portuguese
   and pushed everything below it down; the chips now slide sideways instead. */
const Chips = styled(Animated.ScrollView).attrs(({ theme }) => ({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  keyboardShouldPersistTaps: 'handled' as const,
  contentContainerStyle: {
    alignItems: 'center' as const,
    gap: theme.spacing.small - 2,
    paddingRight: theme.spacing.small,
  },
}))`
  flex-grow: 0;
  /* A scroller measured by its content made the whole column as wide as the
     chips inside it, and everything below inherited that width — which is how
     the help button ended up past the right edge of the phone. */
  align-self: stretch;
  width: 100%;
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
const PriorityChip = styled(ChipBase)<{
  $tone: TaskPriority;
  $chosen: boolean;
}>`
  border-radius: ${({ theme }) => theme.radii.pill}px;
  border-color: ${({ theme, $tone, $chosen }) =>
    !$chosen
      ? theme.colors.border
      : $tone === 'high'
      ? theme.colors.text
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
      ? theme.colors.text
      : $tone === 'medium'
      ? theme.colors.accentInk
      : theme.colors.muted};
`;

const Hint = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  margin-top: ${({ theme }) => theme.spacing.small + 4}px;
`;

/* The two ways out of the smallest layer, on the same line: the chips on the
   left, the writing shortcuts on the right. No box of its own — the sheet is
   already the container. */
const Controls = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  /* Bound to the sheet's own width, so the control on the right lands inside
     the padding instead of past the screen. */
  align-self: stretch;
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.small + 4}px;
`;

const MoreToggle = styled(PressableScale)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.tiny + 2}px;
  min-height: 48px;
  flex-shrink: 1;
  padding: 0px ${({ theme }) => theme.spacing.small}px;
`;

const MoreToggleText = styled.Text.attrs(buttonTextAttrs)`
  ${({ theme }) => buttonTextMetrics(theme.type.caption)}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.mutedStrong};
`;

/** Help is a question, so it looks like one: a quiet round target, lit the same
 * way an open chip is. */
const SyntaxToggle = styled(PressableScale)<{ $open: boolean }>`
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  border: 1px solid
    ${({ theme, $open }) =>
      $open ? theme.colors.accentInk : theme.colors.border};
  background-color: ${({ theme, $open }) =>
    $open ? theme.colors.cardElevated : 'transparent'};
`;

const SyntaxToggleText = styled.Text.attrs(buttonTextAttrs)<{
  $open: boolean;
}>`
  ${({ theme }) => buttonTextMetrics(theme.type.caption)}
  font-weight: 800;
  color: ${({ theme, $open }) =>
    $open ? theme.colors.accentInk : theme.colors.muted};
`;

/** Takes the slot the calendar and the list panel use, so the sheet never
 * grows two things at once. */
const SyntaxPanel = styled(Animated.View)`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
  gap: ${({ theme }) => theme.spacing.tiny}px;
`;

const SyntaxTitle = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
`;

const SyntaxLine = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
`;

const SyntaxHelp = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;

/* Only carries the layout transition: the actions must slide, never jump, when
   a layer opens above them. */
const ActionsShift = styled(Animated.View)`
  align-self: stretch;
  width: 100%;
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
/* Quiet next to Save: starting a block is a second way out of the sheet, not
   the thing the sheet exists for. Carrying its word as well as Cancelar,
   Excluir and Salvar made the row wider than the phone, and Salvar — the one
   thing the sheet exists for — was the end that fell off it. The glyph and the
   spoken label stay; the printed word goes. */
const FocusAction = styled(PressableScale)`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill}px;
`;

const Delete = styled(PressableScale)`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill}px;
`;
