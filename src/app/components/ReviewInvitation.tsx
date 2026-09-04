import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import type { TaskCopy } from '../../features/tasks/presentation/localization/taskCopy';
import { PressableScale } from '../../features/tasks/presentation/views/PressableScale';
import {
  dialogEnter,
  scrimEnter,
  scrimExit,
  sheetExit,
} from '../animation/motion';

interface ReviewInvitationProps {
  copy: TaskCopy;
  onDismiss: () => void;
  onNever: () => void;
  onRate: () => void;
}

const STARS = [1, 2, 3, 4, 5];
/** Five stars hands over to the store's own prompt; anything less is taken as
 * something to fix rather than something to publish. */
const STARS_THAT_RATE = 5;

function Star({ filled, colour }: { filled: boolean; colour: string }) {
  return (
    <Svg height={38} viewBox="0 0 24 24" width={38}>
      <Path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"
        fill={filled ? colour : 'none'}
        stroke={colour}
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}

/**
 * Asks what somebody thinks of the app, once it has already closed a few
 * tasks for them.
 *
 * Five stars hands over to the platform's own rating prompt rather than to a
 * link: that is what the store's rules ask for, and it keeps the person inside
 * the app. Fewer stars are answered with thanks and nothing else — a rating
 * screen that argues with its answer is worse than no rating screen.
 */
export function ReviewInvitation({
  copy,
  onDismiss,
  onNever,
  onRate,
}: ReviewInvitationProps) {
  const theme = useTheme();
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    // Back means "not now", never a rating.
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onDismiss();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onDismiss]);

  useEffect(() => {
    if (chosen == null || chosen >= STARS_THAT_RATE) return;

    // Thanks, and out: they said their piece and do not owe anybody a form.
    const timer = setTimeout(onDismiss, 900);

    return () => clearTimeout(timer);
  }, [chosen, onDismiss]);

  function choose(stars: number) {
    if (chosen != null) return;

    setChosen(stars);
    if (stars >= STARS_THAT_RATE) onRate();
  }

  return (
    <Overlay
      entering={scrimEnter()}
      exiting={scrimExit()}
      testID="review-invitation"
    >
      <Scrim
        accessibilityLabel={copy.review.later}
        accessibilityRole="button"
        onPress={onDismiss}
      />
      <Card entering={dialogEnter()} exiting={sheetExit()}>
        <Title accessibilityRole="header">{copy.review.title}</Title>
        <Body>
          {chosen == null
            ? copy.review.body
            : chosen >= STARS_THAT_RATE
            ? copy.review.thanks
            : copy.review.feedbackThanks}
        </Body>

        <Stars>
          {STARS.map(stars => (
            <StarButton
              accessibilityLabel={copy.review.starLabel(stars)}
              accessibilityRole="button"
              hitSlop={6}
              key={stars}
              onPress={() => choose(stars)}
              testID={`review-star-${stars}`}
            >
              <Star
                colour={
                  chosen != null && stars <= chosen
                    ? theme.colors.accent
                    : theme.colors.border
                }
                filled={chosen != null && stars <= chosen}
              />
            </StarButton>
          ))}
        </Stars>

        <Quiet
          accessibilityRole="button"
          onPress={onDismiss}
          testID="review-later"
        >
          <QuietText>{copy.review.later}</QuietText>
        </Quiet>
        <Quiet
          accessibilityRole="button"
          onPress={onNever}
          testID="review-never"
        >
          <QuietText $faint>{copy.review.never}</QuietText>
        </Quiet>
      </Card>
    </Overlay>
  );
}

const Overlay = styled(Animated.View)`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  align-items: center;
  justify-content: center;
  padding: 0px ${({ theme }) => theme.spacing.large}px;
  background-color: ${({ theme }) => theme.colors.scrim};
  z-index: 40;
`;

const Scrim = styled.Pressable`
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
`;

const Card = styled(Animated.View)`
  width: 100%;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radii.extraLarge}px;
  padding: ${({ theme }) => theme.spacing.large}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.heading}px;
  font-weight: 800;
  letter-spacing: -0.4px;
  text-align: center;
`;

const Body = styled.Text`
  margin-top: ${({ theme }) => theme.spacing.small}px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  text-align: center;
`;

const Stars = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing.tiny + 2}px;
  margin: ${({ theme }) => theme.spacing.large}px 0px
    ${({ theme }) => theme.spacing.small}px;
`;

const StarButton = styled(PressableScale)`
  padding: 2px;
`;

const Quiet = styled.Pressable`
  padding: ${({ theme }) => theme.spacing.small + 2}px;
`;

const QuietText = styled.Text<{ $faint?: boolean }>`
  color: ${({ theme, $faint }) =>
    $faint ? theme.colors.muted : theme.colors.text};
  font-size: ${({ theme, $faint }) =>
    $faint ? theme.type.caption : theme.type.label}px;
  font-weight: 600;
`;
