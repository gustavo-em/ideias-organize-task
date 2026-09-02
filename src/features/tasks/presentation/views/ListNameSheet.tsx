import { useEffect, useState } from 'react';
import { BackHandler, Modal } from 'react-native';
import Animated from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import {
  listColors,
  projectIcons,
  type ListColor,
  type ProjectIcon,
  type TaskList,
} from '../../domain/TaskList';
import {
  scrimEnter,
  scrimExit,
  sheetEnter,
  sheetExit,
} from '../../../../app/animation/motion';
import { useSheetOpenTrace } from '../../../../app/perf/sheetPerf';
import type { TaskCopy } from '../localization/taskCopy';
import { projectTone } from '../models/projectAppearance';
import { CheckGlyph, ProjectGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';
import {
  SheetActionsRow,
  SheetCancelButton,
  SheetPrimaryButton,
} from './SheetActions';

interface ProjectEditorSheetProps {
  copy: TaskCopy;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialAppearance?: Pick<TaskList, 'color' | 'icon'>;
  onCancel: () => void;
  /** False means the name is empty or already belongs to another list. */
  onSubmit: (
    name: string,
    appearance: Pick<TaskList, 'color' | 'icon'>,
  ) => boolean;
}

/** A project is named and made recognizable before it exists. */
export function ProjectEditorSheet({
  copy,
  title,
  submitLabel,
  initialName = '',
  initialAppearance,
  onCancel,
  onSubmit,
}: ProjectEditorSheetProps) {
  const theme = useTheme();
  const traceOpen = useSheetOpenTrace('ProjectEditorSheet');
  const [name, setName] = useState(initialName);
  const [error, setError] = useState(false);
  const [color, setColor] = useState<ListColor>(
    initialAppearance?.color ?? 'sun',
  );
  const [icon, setIcon] = useState<ProjectIcon>(
    initialAppearance?.icon ?? 'layers',
  );
  const [stage, setStage] = useState<'details' | 'appearance'>('details');
  const usable = name.trim().length > 0;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (stage === 'appearance') {
          setStage('details');
          return true;
        }

        onCancel();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onCancel, stage]);

  function submit() {
    if (!usable) return;
    if (!onSubmit(name, { color, icon })) {
      setError(true);
      return;
    }
    onCancel();
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible
    >
      <Overlay>
        <Scrim entering={scrimEnter()} exiting={scrimExit()}>
          <ScrimTouch
            accessibilityLabel={copy.capture.cancel}
            accessibilityRole="button"
            onPress={onCancel}
          />
        </Scrim>
        <Sheet
          entering={sheetEnter()}
          exiting={sheetExit()}
          onLayout={traceOpen}
          testID="project-editor-sheet"
        >
          <Grabber />
          {stage === 'details' ? (
            <>
              <Title accessibilityRole="header">{title}</Title>
              <Hint>{copy.lists.nameHint}</Hint>
              <Field
                accessibilityLabel={copy.lists.namePlaceholder}
                autoCapitalize="sentences"
                autoCorrect
                onChangeText={value => {
                  setName(value);
                  setError(false);
                }}
                onSubmitEditing={submit}
                placeholder={copy.lists.namePlaceholder}
                returnKeyType="done"
                testID="list-name-field"
                value={name}
              />
              {error ? <ErrorText>{copy.lists.duplicateName}</ErrorText> : null}
              <PickerLabel>{copy.lists.icon}</PickerLabel>
              <IconGrid>
                {projectIcons
                  .filter(value => value !== 'inbox')
                  .map(value => {
                    const selected = icon === value;

                    return (
                      <IconOption
                        $selected={selected}
                        accessibilityLabel={copy.lists.icons[value]}
                        accessibilityState={{ selected }}
                        key={value}
                        onPress={() => setIcon(value)}
                        testID={`list-icon-${value}`}
                      >
                        <ProjectGlyph
                          color={
                            selected
                              ? projectTone(theme, color)
                              : theme.colors.mutedStrong
                          }
                          icon={value}
                          size={19}
                        />
                      </IconOption>
                    );
                  })}
              </IconGrid>
              <PickerLabel>{copy.lists.color}</PickerLabel>
              <ColorRow>
                {listColors.map(value => {
                  const selected = color === value;
                  const tone = projectTone(theme, value);

                  return (
                    <ColorOption
                      $selected={selected}
                      $tone={tone}
                      accessibilityLabel={copy.lists.colors[value]}
                      accessibilityState={{ selected }}
                      key={value}
                      onPress={() => setColor(value)}
                      testID={`list-color-${value}`}
                    >
                      {selected ? (
                        <CheckGlyph
                          color={
                            value === 'sun'
                              ? theme.colors.onAccent
                              : theme.colors.card
                          }
                        />
                      ) : null}
                    </ColorOption>
                  );
                })}
              </ColorRow>
              <SheetActionsRow>
                <SheetCancelButton
                  label={copy.capture.cancel}
                  onPress={onCancel}
                />
                <SheetPrimaryButton
                  disabled={!usable}
                  label={submitLabel}
                  onPress={submit}
                  testID="list-name-submit"
                />
              </SheetActionsRow>
            </>
          ) : (
            <>
              <Title accessibilityRole="header">{copy.lists.appearance}</Title>
              <PickerLabel>{copy.lists.icon}</PickerLabel>
              <IconGrid>
                {projectIcons
                  .filter(value => value !== 'inbox')
                  .map(value => {
                    const selected = icon === value;

                    return (
                      <IconOption
                        $selected={selected}
                        accessibilityLabel={copy.lists.icons[value]}
                        accessibilityState={{ selected }}
                        key={value}
                        onPress={() => setIcon(value)}
                        testID={`list-icon-${value}`}
                      >
                        <ProjectGlyph
                          color={
                            selected
                              ? projectTone(theme, color)
                              : theme.colors.mutedStrong
                          }
                          icon={value}
                          size={19}
                        />
                      </IconOption>
                    );
                  })}
              </IconGrid>
              <PickerLabel>{copy.lists.color}</PickerLabel>
              <ColorRow>
                {listColors.map(value => {
                  const selected = color === value;
                  const tone = projectTone(theme, value);

                  return (
                    <ColorOption
                      $selected={selected}
                      $tone={tone}
                      accessibilityLabel={copy.lists.colors[value]}
                      accessibilityState={{ selected }}
                      key={value}
                      onPress={() => setColor(value)}
                      testID={`list-color-${value}`}
                    >
                      {selected ? (
                        <CheckGlyph
                          color={
                            value === 'sun'
                              ? theme.colors.onAccent
                              : theme.colors.card
                          }
                        />
                      ) : null}
                    </ColorOption>
                  );
                })}
              </ColorRow>
              <SheetActionsRow>
                <SheetCancelButton
                  label={copy.lists.back}
                  onPress={() => setStage('details')}
                />
                <SheetPrimaryButton
                  label={copy.lists.done}
                  onPress={() => setStage('details')}
                />
              </SheetActionsRow>
            </>
          )}
        </Sheet>
      </Overlay>
    </Modal>
  );
}

const Overlay = styled.View`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  justify-content: flex-end;
  z-index: 35;
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

const Sheet = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.background};
  border-top-left-radius: ${({ theme }) => theme.radii.extraLarge}px;
  border-top-right-radius: ${({ theme }) => theme.radii.extraLarge}px;
  margin-bottom: -80px;
  max-height: 91%;
  padding: ${({ theme }) => theme.spacing.medium}px
    ${({ theme }) => theme.spacing.large}px
    ${({ theme }) => theme.spacing.large + 88}px;
`;

const Grabber = styled.View`
  width: 36px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.border};
  align-self: center;
  margin-bottom: ${({ theme }) => theme.spacing.medium}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading}px;
  font-weight: 800;
  letter-spacing: -0.4px;
`;

const Hint = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Field = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.colors.muted,
}))`
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
  padding: 13px 14px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const ErrorText = styled.Text`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.type.caption}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const PickerLabel = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const IconGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const IconOption = styled(PressableScale)<{ $selected: boolean }>`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accentInk : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.cardElevated : theme.colors.card};
`;

const ColorRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const ColorOption = styled(PressableScale)<{
  $selected: boolean;
  $tone: string;
}>`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: ${({ $selected }) => ($selected ? 3 : 1)}px solid
    ${({ theme, $selected, $tone }) =>
      $selected ? theme.colors.text : `${$tone}4D`};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ $tone }) => $tone};
`;
