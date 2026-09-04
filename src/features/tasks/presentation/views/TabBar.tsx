import { useEffect, type ComponentType } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { CHECK_SPRING } from '../../../../app/animation/motion';
import { PressableScale } from './PressableScale';

interface TabGlyphProps {
  color: string;
  active: boolean;
  size?: number;
}

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  Glyph: ComponentType<TabGlyphProps>;
}

interface TabBarProps<Id extends string> {
  items: readonly TabItem<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
}

/**
 * Three destinations and no more.
 *
 * The mark under the active tab is one element that slides, not three that fade:
 * a single moving mark is what makes the bar read as one control rather than
 * as a row of buttons taking turns lighting up.
 */
export function TabBar<Id extends string>({
  items,
  active,
  onSelect,
}: TabBarProps<Id>) {
  const theme = useTheme();
  const index = Math.max(
    0,
    items.findIndex(item => item.id === active),
  );
  const position = useSharedValue(index);

  useEffect(() => {
    position.value = withSpring(index, CHECK_SPRING);
  }, [index, position]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${(position.value + 0.5) * (100 / items.length)}%`,
  }));

  return (
    <Bar accessibilityRole="tablist">
      <Indicator style={indicatorStyle} />
      {items.map(item => {
        const selected = item.id === active;

        return (
          <Tab
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            // PressableScale already renders one accessible node per tab, so
            // the label is announced once, never doubled by the inner text.
            accessibilityState={{ selected }}
            key={item.id}
            onPress={() => onSelect(item.id)}
            testID={`tab-${item.id}`}
          >
            <item.Glyph
              active={selected}
              color={selected ? theme.colors.text : theme.colors.muted}
              size={22}
            />
            <TabLabel $active={selected}>{item.label}</TabLabel>
          </Tab>
        );
      })}
    </Bar>
  );
}

/* 76 tall, a hairline on top and the mark glued to it: the bar is part of the
   paper, not a tray sitting on it. */
const Bar = styled.View`
  flex-direction: row;
  align-items: center;
  min-height: 76px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderSubtle};
  background-color: ${({ theme }) => theme.colors.background};
  padding-top: ${({ theme }) => theme.spacing.small + 2}px;
  padding-bottom: ${({ theme }) => theme.spacing.small}px;
`;

const Indicator = styled(Animated.View)`
  position: absolute;
  top: 0px;
  width: 28px;
  height: 3px;
  margin-left: -14px;
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

/* House rule: an icon stacked over its label centers on the horizontal axis.
 * A glyph pinned to the left of its own label reads as a layout accident. */
const Tab = styled(PressableScale)`
  flex: 1;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 0px;
`;

const TabLabel = styled.Text<{ $active: boolean }>`
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: ${({ $active }) => ($active ? 800 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text : theme.colors.muted};
`;
