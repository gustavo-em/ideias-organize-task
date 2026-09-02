import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { rowEnter, rowExit, rowLayout } from '../../../../app/animation/motion';
import {
  isSubtaskDone,
  MAX_SUBTASKS,
  type Subtask,
} from '../../domain/Subtask';
import type { TaskCopy } from '../localization/taskCopy';
import { PlusGlyph, TrashGlyph } from './FieldGlyphs';
import { HairlineRule } from './HairlineRule';
import { PressableScale } from './PressableScale';
import { TaskCheckbox } from './TaskCheckbox';

interface SubtaskListProps {
  copy: TaskCopy;
  subtasks: readonly Subtask[];
  onAdd: (title: string) => void;
  onRename: (subtaskId: string, title: string) => void;
  onToggle?: (subtaskId: string) => void;
  onDelete: (subtaskId: string) => void;
  /** Read when the block goes away, to tell the two ways out apart: saving
   * keeps what was half-written, cancelling throws it away with everything
   * else the sheet was holding. */
  shouldKeepPending?: () => boolean;
  /**
   * `edit` is the block inside a task that exists. `draft` is the same block
   * while the task is still being written: nothing can be ticked yet, so no
   * box is drawn, and the field only appears once it is asked for.
   */
  mode?: 'edit' | 'draft';
  /** What is half-written in the composer, told to the sheet as it is typed,
   * so saving can keep it instead of dropping it on unmount. */
  onDraftChange?: (text: string) => void;
}

/** Drawn small, touched large: the box beside a step never outweighs the box
 * beside the task itself. */
const BOX_SIZE = 20;
const BOX_SLOP = 14;

/**
 * The steps inside one task.
 *
 * A task item is already a card, so nothing here is a box: the section is held
 * together by its heading, the hairline that runs out of it, and a single fine
 * rule down the left of the indent. One level only — no row offers a way to
 * open a list inside itself.
 */
export function SubtaskList({
  copy,
  subtasks,
  onAdd,
  onRename,
  onToggle,
  onDelete,
  shouldKeepPending,
  mode = 'edit',
  onDraftChange,
}: SubtaskListProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const composer = useRef<ComponentRef<typeof AddField>>(null);
  const isDraft = mode === 'draft';
  // While writing a task the field is asked for, not offered: the layer opens
  // on a single line of words, and only whoever wants steps sees a field.
  const [composerOpen, setComposerOpen] = useState(!isDraft);
  const done = subtasks.filter(isSubtaskDone).length;
  const atLimit = subtasks.length >= MAX_SUBTASKS;
  const allDone = !isDraft && subtasks.length > 0 && done === subtasks.length;
  // Nothing is ticked in a draft, so the fraction would read 0/4 all the way
  // through. The plain number is only worth drawing once the list is longer
  // than a glance.
  const showCount = isDraft ? subtasks.length > 3 : subtasks.length > 0;

  function changeDraft(value: string) {
    setDraft(value);
    onDraftChange?.(value);
  }

  function commitDraft() {
    const value = draft.trim();

    if (value.length === 0) return;

    onAdd(value);
    changeDraft('');
    if (isDraft) {
      // The list is read out, because a new line below the field is not
      // something a screen reader would otherwise notice.
      AccessibilityInfo.announceForAccessibility(copy.subtasks.item(value));
    }
    // The keyboard stays: writing three steps should be three lines, not three
    // taps back into the same field.
    composer.current?.focus();
  }

  function removeSubtaskAt(subtaskId: string, title: string) {
    onDelete(subtaskId);
    if (isDraft) {
      AccessibilityInfo.announceForAccessibility(copy.subtasks.remove(title));
    }
  }

  /** A draft keeps its steps in the sheet above, so a retyped title is applied
   * as it is written: nothing is left pending to be lost when Save unmounts
   * the block, and cancelling still throws the whole draft away. */
  function changeRename(value: string) {
    setEditingTitle(value);
    if (isDraft && editingId != null) onRename(editingId, value);
  }

  function commitRename() {
    if (editingId == null) return;

    onRename(editingId, editingTitle);
    setEditingId(null);
    setEditingTitle('');
  }

  // What is half-written when the sheet closes.
  //
  // Saving unmounts these fields, and an unmount is not a blur: without this, a
  // name being retyped and a step being written would vanish on the way out.
  // Cancelling is the other half of the same question — it throws away the
  // title and the chips, so it throws away these too, and never writes a step
  // the person just decided against.
  //
  // A draft answers the same question earlier: the sheet is told what is in the
  // field as it is typed, and keeps it itself, so nothing is written from an
  // unmount that happens after the task was already submitted.
  const pending = useRef({
    draft,
    editingId,
    editingTitle,
    isDraft,
    onAdd,
    onRename,
    shouldKeepPending,
  });

  pending.current = {
    draft,
    editingId,
    editingTitle,
    isDraft,
    onAdd,
    onRename,
    shouldKeepPending,
  };

  useEffect(
    () => () => {
      const last = pending.current;

      if (last.isDraft) return;
      if (last.shouldKeepPending?.() === false) return;

      if (last.editingId != null) {
        last.onRename(last.editingId, last.editingTitle);
      }
      if (last.draft.trim().length > 0) last.onAdd(last.draft);
    },
    [],
  );

  return (
    <Section>
      <Heading>
        <HeadingLabel>{copy.subtasks.title}</HeadingLabel>
        {showCount ? (
          <HeadingCount
            accessibilityLabel={
              isDraft
                ? copy.subtasks.count(subtasks.length)
                : copy.subtasks.progress(done, subtasks.length)
            }
            testID="subtask-count"
          >
            {isDraft ? `${subtasks.length}` : `${done}/${subtasks.length}`}
          </HeadingCount>
        ) : null}
        <HairlineRule />
      </Heading>

      {subtasks.length === 0 ? null : (
        <Group>
          {subtasks.map((subtask, index) => {
            const isDone = isSubtaskDone(subtask);

            return (
              <Line
                entering={rowEnter(index)}
                exiting={rowExit()}
                key={subtask.id}
                layout={rowLayout()}
              >
                {/* A step of a task that does not exist yet cannot be done,
                    so the draft draws no box at all. */}
                {isDraft || onToggle == null ? null : (
                  <TaskCheckbox
                    // Says which kind of box it is: the task's own checkbox is
                    // the same role, and a screen reader would otherwise read
                    // two indistinguishable checkboxes.
                    accessibilityLabel={copy.subtasks.item(subtask.title)}
                    checked={isDone}
                    hitSlop={BOX_SLOP}
                    onToggle={() => onToggle(subtask.id)}
                    size={BOX_SIZE}
                    testID={`subtask-checkbox-${subtask.id}`}
                  />
                )}

                {editingId === subtask.id ? (
                  <RenameField
                    accessibilityLabel={copy.subtasks.rename(subtask.title)}
                    autoFocus
                    blurOnSubmit
                    onBlur={commitRename}
                    onChangeText={changeRename}
                    onSubmitEditing={commitRename}
                    returnKeyType="done"
                    testID={`subtask-rename-${subtask.id}`}
                    value={editingTitle}
                  />
                ) : (
                  <LineText
                    accessibilityHint={copy.subtasks.rename(subtask.title)}
                    accessibilityLabel={
                      isDraft ? copy.subtasks.item(subtask.title) : undefined
                    }
                    accessibilityRole="button"
                    onPress={() => {
                      setEditingId(subtask.id);
                      setEditingTitle(subtask.title);
                    }}
                    scaleTo={0.99}
                    testID={`subtask-${subtask.id}`}
                  >
                    <LineTitle $done={isDone} numberOfLines={2}>
                      {subtask.title}
                    </LineTitle>
                  </LineText>
                )}

                <RemoveButton
                  accessibilityLabel={copy.subtasks.remove(subtask.title)}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => removeSubtaskAt(subtask.id, subtask.title)}
                  scaleTo={0.86}
                  testID={`subtask-delete-${subtask.id}`}
                >
                  <TrashGlyph color={theme.colors.mutedStrong} size={16} />
                </RemoveButton>
              </Line>
            );
          })}
        </Group>
      )}

      {atLimit ? (
        <Note testID="subtask-limit">
          {copy.subtasks.limitReached(MAX_SUBTASKS)}
        </Note>
      ) : composerOpen ? (
        <Composer>
          {/* The field is not a step yet, and has to look like it: it carries
              its own rule underneath and the one control the lines do not
              have — a way to confirm that does not depend on the keyboard. */}
          <ComposerRow>
            <AddField
              accessibilityLabel={copy.subtasks.add}
              autoCorrect
              autoFocus={isDraft}
              blurOnSubmit={false}
              onChangeText={changeDraft}
              onSubmitEditing={commitDraft}
              placeholder={copy.subtasks.addPlaceholder}
              ref={composer}
              returnKeyType="done"
              testID="subtask-add-field"
              value={draft}
            />
            <ConfirmButton
              accessibilityLabel={copy.subtasks.add}
              accessibilityRole="button"
              accessibilityState={{ disabled: draft.trim().length === 0 }}
              hitSlop={6}
              onPress={commitDraft}
              scaleTo={0.86}
              testID="subtask-add-confirm"
            >
              <PlusGlyph
                color={
                  draft.trim().length === 0
                    ? theme.colors.muted
                    : theme.colors.accentInk
                }
                size={16}
              />
            </ConfirmButton>
          </ComposerRow>
        </Composer>
      ) : (
        <AddAction
          accessibilityLabel={copy.subtasks.add}
          accessibilityRole="button"
          onPress={() => setComposerOpen(true)}
          scaleTo={0.98}
          testID="subtask-add-action"
        >
          <AddActionText>{copy.subtasks.add}</AddActionText>
        </AddAction>
      )}

      {allDone ? (
        <Note testID="subtask-all-done">{copy.subtasks.allDone}</Note>
      ) : null}
    </Section>
  );
}

const Section = styled.View`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Heading = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

const HeadingLabel = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
`;

const HeadingCount = styled.Text`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
`;

/* The indent, and the one fine rule that holds it. Not a container: no
   background, no border box, no radius.

   It scrolls past a handful of steps, so twenty of them cannot push the save
   button off the phone. */
const Group = styled.ScrollView.attrs({
  keyboardShouldPersistTaps: 'handled' as const,
  nestedScrollEnabled: true,
  showsVerticalScrollIndicator: false,
})`
  flex-grow: 0;
  max-height: 264px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
  padding-left: 12px;
  border-left-width: 1px;
  border-left-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const Line = styled(Animated.View)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  min-height: 48px;
`;

const LineText = styled(PressableScale)`
  flex: 1;
  min-width: 0px;
  justify-content: center;
  min-height: 48px;
`;

const LineTitle = styled.Text<{ $done: boolean }>`
  color: ${({ theme, $done }) =>
    $done ? theme.colors.muted : theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  line-height: ${({ theme }) => theme.type.body + 6}px;
  text-decoration-line: ${({ $done }) => ($done ? 'line-through' : 'none')};
`;

const RenameField = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
}))`
  flex: 1;
  min-width: 0px;
  min-height: 48px;
  padding: 0px;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
`;

const RemoveButton = styled(PressableScale)`
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
`;

/* The composer sits on the same indent as the steps, so a new line lands where
   it will live. */
const Composer = styled.View`
  padding-left: 12px;
  border-left-width: 1px;
  border-left-color: ${({ theme }) => theme.colors.borderSubtle};
`;

/* A line still being written, not a line already written: one hairline under
   the text says so, and the confirm sits where the steps carry their trash. No
   box, no fill — the rule is the whole difference. */
const ComposerRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const AddField = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
}))`
  flex: 1;
  min-width: 0px;
  min-height: 48px;
  padding: 0px;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
`;

const ConfirmButton = styled(PressableScale)`
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
`;

/* The way into the field while a task is being written. It stands on the same
   indent the steps will live on, and carries no fill of its own: the sheet is
   already the container. */
const AddAction = styled(PressableScale)`
  min-height: 48px;
  justify-content: center;
  padding-left: 12px;
  border-left-width: 1px;
  border-left-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const AddActionText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
`;

const Note = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;
