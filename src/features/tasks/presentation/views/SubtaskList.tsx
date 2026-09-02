import { useEffect, useRef, useState, type ComponentRef } from 'react';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { rowEnter, rowExit, rowLayout } from '../../../../app/animation/motion';
import {
  isSubtaskDone,
  MAX_SUBTASKS,
  type Subtask,
} from '../../domain/Subtask';
import type { TaskCopy } from '../localization/taskCopy';
import { TrashGlyph } from './FieldGlyphs';
import { HairlineRule } from './HairlineRule';
import { PressableScale } from './PressableScale';
import { TaskCheckbox } from './TaskCheckbox';

interface SubtaskListProps {
  copy: TaskCopy;
  subtasks: readonly Subtask[];
  onAdd: (title: string) => void;
  onRename: (subtaskId: string, title: string) => void;
  onToggle: (subtaskId: string) => void;
  onDelete: (subtaskId: string) => void;
  /** Read when the block goes away, to tell the two ways out apart: saving
   * keeps what was half-written, cancelling throws it away with everything
   * else the sheet was holding. */
  shouldKeepPending?: () => boolean;
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
}: SubtaskListProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const composer = useRef<ComponentRef<typeof AddField>>(null);
  const done = subtasks.filter(isSubtaskDone).length;
  const atLimit = subtasks.length >= MAX_SUBTASKS;
  const allDone = subtasks.length > 0 && done === subtasks.length;

  function commitDraft() {
    const value = draft.trim();

    if (value.length === 0) return;

    onAdd(value);
    setDraft('');
    // The keyboard stays: writing three steps should be three lines, not three
    // taps back into the same field.
    composer.current?.focus();
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
  const pending = useRef({
    draft,
    editingId,
    editingTitle,
    onAdd,
    onRename,
    shouldKeepPending,
  });

  pending.current = {
    draft,
    editingId,
    editingTitle,
    onAdd,
    onRename,
    shouldKeepPending,
  };

  useEffect(
    () => () => {
      const last = pending.current;

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
        {subtasks.length === 0 ? null : (
          <HeadingCount
            accessibilityLabel={copy.subtasks.progress(done, subtasks.length)}
          >
            {`${done}/${subtasks.length}`}
          </HeadingCount>
        )}
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

                {editingId === subtask.id ? (
                  <RenameField
                    accessibilityLabel={copy.subtasks.rename(subtask.title)}
                    autoFocus
                    blurOnSubmit
                    onBlur={commitRename}
                    onChangeText={setEditingTitle}
                    onSubmitEditing={commitRename}
                    returnKeyType="done"
                    testID={`subtask-rename-${subtask.id}`}
                    value={editingTitle}
                  />
                ) : (
                  <LineText
                    accessibilityHint={copy.subtasks.rename(subtask.title)}
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
                  onPress={() => onDelete(subtask.id)}
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
      ) : (
        <Composer>
          <AddField
            accessibilityLabel={copy.subtasks.add}
            autoCorrect
            blurOnSubmit={false}
            onChangeText={setDraft}
            onSubmitEditing={commitDraft}
            placeholder={copy.subtasks.addPlaceholder}
            ref={composer}
            returnKeyType="done"
            testID="subtask-add-field"
            value={draft}
          />
        </Composer>
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

const AddField = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
}))`
  min-height: 48px;
  padding: 0px;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
`;

const Note = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
`;
