import styled, { useTheme } from 'styled-components/native';

import type { TaskList } from '../../domain/TaskList';
import type { TaskCopy } from '../localization/taskCopy';
import { ProjectGlyph, PlusGlyph, TagGlyph } from './FieldGlyphs';
import { projectTone } from '../models/projectAppearance';
import { PressableScale } from './PressableScale';

interface ListPanelProps {
  copy: TaskCopy;
  lists: readonly TaskList[];
  selectedId: string | null;
  onSelect: (listId: string | null) => void;
  onCreateNew?: () => void;
}

/**
 * Which list this belongs to.
 *
 * Cycling through the lists on one chip meant tapping four times to reach the
 * fourth, and never seeing what the choices were. They are shown, in the
 * colour each list already carries everywhere else in the app.
 */
export function ListPanel({
  copy,
  lists,
  selectedId,
  onSelect,
  onCreateNew,
}: ListPanelProps) {
  const theme = useTheme();

  return (
    <Panel>
      <Option
        $active={selectedId == null}
        accessibilityLabel={copy.capture.noList}
        accessibilityState={{ selected: selectedId == null }}
        onPress={() => onSelect(null)}
        testID="list-option-none"
      >
        <TagGlyph color={theme.colors.border} />
        <OptionText $active={selectedId == null}>
          {copy.capture.noList}
        </OptionText>
      </Option>

      {lists.map(list => {
        const isChosen = list.id === selectedId;

        return (
          <Option
            $active={isChosen}
            accessibilityLabel={list.name}
            accessibilityState={{ selected: isChosen }}
            key={list.id}
            onPress={() => onSelect(list.id)}
            testID={`list-option-${list.id}`}
          >
            <ProjectGlyph
              color={projectTone(theme, list.color)}
              icon={list.icon}
            />
            <OptionText $active={isChosen}>{list.name}</OptionText>
          </Option>
        );
      })}

      {onCreateNew == null ? null : (
        <Option
          $active={false}
          accessibilityLabel={copy.lists.newList}
          onPress={onCreateNew}
          testID="list-option-new"
        >
          <PlusGlyph color={theme.colors.accentInk} />
          <OptionText $active={false}>{copy.lists.newList}</OptionText>
        </Option>
      )}
    </Panel>
  );
}

const Panel = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small - 2}px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Option = styled(PressableScale)<{ $active: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small - 1}px;
  padding: 9px 13px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.accent : theme.colors.border};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.card : 'transparent'};
`;

const OptionText = styled.Text<{ $active: boolean }>`
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: ${({ $active }) => ($active ? 800 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text : theme.colors.mutedStrong};
`;
