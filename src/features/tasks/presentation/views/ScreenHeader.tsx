import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';
import styled from 'styled-components/native';

import { screenEnter } from '../../../../app/animation/motion';

interface ScreenHeaderProps {
  eyebrow: string;
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
  title,
  subtitle,
  trailing,
}: ScreenHeaderProps) {
  return (
    <Header entering={screenEnter()}>
      <TopLine>
        <Eyebrow>{eyebrow}</Eyebrow>
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
  justify-content: space-between;
  min-height: 26px;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.display}px;
  font-weight: 800;
  letter-spacing: -1.1px;
  line-height: ${({ theme }) => theme.type.display + 3}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const Subtitle = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;
