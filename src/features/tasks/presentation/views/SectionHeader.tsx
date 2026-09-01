import { useEffect, type ReactNode } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { DISCLOSURE } from '../../../../app/animation/motion';
import { ChevronGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';

interface SectionHeaderProps {
  title: string;
  count: number;
  countLabel: string;
  icon?: ReactNode;
  collapsible: boolean;
  expanded: boolean;
  expandHint: string;
  collapseHint: string;
  onToggle: () => void;
  /** Heavier weight for a section that needs a second glance, such as work
   * carried over from before today — hierarchy instead of an alarm colour. */
  emphasis?: boolean;
}

export function SectionHeader({
  title,
  count,
  countLabel,
  icon,
  collapsible,
  expanded,
  expandHint,
  collapseHint,
  onToggle,
  emphasis = false,
}: SectionHeaderProps) {
  const content = (
    <HeadingContent>
      {icon ?? null}
      <SectionTitle $emphasis={emphasis}>{title}</SectionTitle>
      <SectionCount>{count}</SectionCount>
      <SectionRule />
      {collapsible ? <AnimatedChevron expanded={expanded} /> : null}
    </HeadingContent>
  );

  if (!collapsible) {
    return <StaticHeading>{content}</StaticHeading>;
  }

  return (
    <InteractiveHeading
      accessibilityHint={expanded ? collapseHint : expandHint}
      accessibilityLabel={`${title}, ${countLabel}`}
      accessibilityState={{ expanded }}
      onPress={onToggle}
      scaleTo={0.99}
    >
      {content}
    </InteractiveHeading>
  );
}

function AnimatedChevron({ expanded }: { expanded: boolean }) {
  const theme = useTheme();
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, DISCLOSURE);
  }, [expanded, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-90 + progress.value * 90}deg` }],
  }));

  return (
    <Chevron style={animatedStyle}>
      <ChevronGlyph color={theme.colors.mutedStrong} size={16} />
    </Chevron>
  );
}

const HeadingContent = styled.View`
  flex: 1;
  min-height: 48px;
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  padding: 6px 0px;
`;

const StaticHeading = styled.View`
  min-height: 48px;
`;

const InteractiveHeading = styled(PressableScale)`
  min-height: 48px;
`;

const SectionTitle = styled.Text<{ $emphasis: boolean }>`
  flex-shrink: 1;
  color: ${({ theme, $emphasis }) =>
    $emphasis ? theme.colors.text : theme.colors.mutedStrong};
  font-size: ${({ theme, $emphasis }) =>
    theme.type.caption + ($emphasis ? 2 : 1)}px;
  font-weight: ${({ $emphasis }) => ($emphasis ? 900 : 800)};
  letter-spacing: 0.4px;
  line-height: 17px;
  text-transform: uppercase;
`;

const SectionCount = styled.Text`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
`;

/* Typographic rule, not a progress indicator — constant hairline,
   never partially filled or animated. */
const SectionRule = styled.View`
  flex: 1;
  min-width: 0px;
  height: 1px;
  align-self: center;
  background-color: ${({ theme }) => theme.colors.border};
`;

const Chevron = styled(Animated.View)`
  flex-shrink: 0;
`;
