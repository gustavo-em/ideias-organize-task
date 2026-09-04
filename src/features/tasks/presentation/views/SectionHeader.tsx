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
      <HeadingLine>
        {icon ?? null}
        <SectionTitle $emphasis={emphasis}>{title}</SectionTitle>
        <HeadingSpacer />
        <SectionCount>{count}</SectionCount>
        {collapsible ? <AnimatedChevron expanded={expanded} /> : null}
      </HeadingLine>
      <SectionRule />
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

/* Eyebrow on the left, count on the right, and the rule under both: the same
   typographic ruler an editorial contents page uses. The rule is what groups
   the section — never a spacer, never a progress bar. */
const HeadingContent = styled.View`
  flex: 1;
  min-height: 32px;
  justify-content: flex-end;
`;

const HeadingLine = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  padding-bottom: 8px;
`;

const HeadingSpacer = styled.View`
  flex: 1;
  min-width: 0px;
`;

const SectionRule = styled.View.attrs({
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no' as const,
})`
  height: 1px;
  align-self: stretch;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const StaticHeading = styled.View`
  min-height: 32px;
`;

const InteractiveHeading = styled(PressableScale)`
  min-height: 32px;
`;

const SectionTitle = styled.Text<{ $emphasis: boolean }>`
  flex-shrink: 1;
  color: ${({ theme, $emphasis }) =>
    $emphasis ? theme.colors.text : theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.8px;
  line-height: 15px;
  text-transform: uppercase;
`;

/* The count belongs to the heading and sits at its far end, in the same quiet
   ink and a lighter weight. */
const SectionCount = styled.Text`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 600;
`;

const Chevron = styled(Animated.View)`
  flex-shrink: 0;
`;
