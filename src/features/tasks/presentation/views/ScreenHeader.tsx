import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';
import styled from 'styled-components/native';

import { screenEnter } from '../../../../app/animation/motion';

interface ScreenHeaderProps {
  eyebrow: string;
  /** Optional: how many things the screen holds, next to the eyebrow. */
  count?: number;
  /** Spoken form of the count, so the header announces "Tarefas, 3 tarefas". */
  countLabel?: string;
  testID?: string;
  /** Optional: a screen whose content already names itself does not need a
   * headline repeating it. */
  title?: string;
  subtitle?: string;
  /** Sits on the right of the eyebrow line: a streak, a count, a control. */
  trailing?: ReactNode;
}

/**
 * The top of every screen, so the four of them read as one product.
 *
 * The eyebrow carries the context, the title carries the idea, and the
 * subtitle carries the number. Nothing else goes up here.
 */
export function ScreenHeader({
  eyebrow,
  count,
  countLabel,
  testID,
  title,
  subtitle,
  trailing,
}: ScreenHeaderProps) {
  return (
    <Header entering={screenEnter()} testID={testID}>
      <TopLine>
        {/* Eyebrow and count read as one heading; the rule that follows is
            typography, not content. */}
        <EyebrowGroup
          accessibilityLabel={
            countLabel == null ? eyebrow : `${eyebrow}, ${countLabel}`
          }
          accessibilityRole="header"
          accessible
        >
          <Eyebrow>{eyebrow}</Eyebrow>
          {count == null ? null : <EyebrowCount>{count}</EyebrowCount>}
        </EyebrowGroup>
        <TopLineSpacer />
        {trailing}
      </TopLine>
      {title == null ? null : <Title accessibilityRole="header">{title}</Title>}
      {subtitle == null ? null : <Subtitle>{subtitle}</Subtitle>}
    </Header>
  );
}

const Header = styled(Animated.View)`
  padding-bottom: ${({ theme }) => theme.spacing.small}px;
`;

const TopLine = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  min-height: 26px;
`;

const EyebrowGroup = styled.View`
  flex-shrink: 1;
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

/* Takes the width between the eyebrow and whatever sits on the right. No
   rule up here: the eyebrow names the screen, it does not head a section. */
const TopLineSpacer = styled.View`
  flex: 1;
  min-width: 0px;
`;

const EyebrowCount = styled.Text`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 600;
`;

const Eyebrow = styled.Text`
  flex-shrink: 1;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.display}px;
  font-weight: 800;
  letter-spacing: -1.1px;
  line-height: ${({ theme }) => theme.type.display + 2}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Subtitle = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 500;
  margin-top: ${({ theme }) => theme.spacing.small - 2}px;
`;
