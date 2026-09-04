import { useEffect, type ReactNode } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import { contentFadeEnter, GROUND } from '../../../../app/animation/motion';
import { ChevronGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';

interface FocusOverlayProps {
  /** The session screen, handed in whole: this layer never reaches into it. */
  children: ReactNode;
  label: string;
  /** True while a block exists, so the ground takes the session's colour. */
  onSessionGround: boolean;
  /** Leaves the session on screen behind the list. Never stops the block. */
  onClose: () => void;
}

/** The band the back control lives in. The screen under it starts below. */
const CHROME_HEIGHT = 44;

/**
 * The way in and out of a focus block, and nothing else.
 *
 * The session screen keeps every control it ever had; this layer only adds the
 * one thing a tab used to provide for free — a way back to the list that does
 * not end the block. Hardware back does the same thing, so Android never drops
 * the app from under a running timer.
 */
export function FocusOverlay({
  children,
  label,
  onSessionGround,
  onClose,
}: FocusOverlayProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onClose]);

  // The layer paints the whole phone, status bar included, so the ground has
  // to change colour here at the same pace as the screen inside it — or the
  // strip behind the clock would snap while the rest of the screen fades.
  const active = useSharedValue(onSessionGround ? 1 : 0);
  useEffect(() => {
    active.value = withTiming(onSessionGround ? 1 : 0, GROUND);
  }, [active, onSessionGround]);

  const groundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      active.value,
      [0, 1],
      [theme.colors.background, theme.colors.focus],
    ),
  }));

  return (
    <Layer
      accessibilityViewIsModal
      entering={contentFadeEnter()}
      style={[
        StyleSheet.absoluteFill,
        groundStyle,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* The screen starts at the top in both states now, so the band above it
          is always reserved and the back control never lands on the eyebrow. */}
      <Content>{children}</Content>

      {/* Absolute children ignore the layer's padding, so the safe-area top
          has to be applied here again or the button lands on the clock. */}
      <Chrome pointerEvents="box-none" style={{ top: insets.top }}>
        <Back
          accessibilityLabel={label}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          scaleTo={0.94}
          testID="focus-close"
        >
          <BackChevron>
            <ChevronGlyph color={theme.colors.text} size={18} up />
          </BackChevron>
          <BackLabel>{label}</BackLabel>
        </Back>
      </Chrome>
    </Layer>
  );
}

const Layer = styled(Animated.View)``;

const Content = styled.View`
  flex: 1;
  padding-top: ${CHROME_HEIGHT}px;
`;

const Chrome = styled.View`
  position: absolute;
  top: 0px;
  left: ${({ theme }) => theme.spacing.medium}px;
`;

/* 44px of target under a 18px glyph: the only control this layer owns cannot be
   the one that is hard to hit. */
const Back = styled(PressableScale)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.tiny}px;
  min-height: ${CHROME_HEIGHT}px;
  padding-right: ${({ theme }) => theme.spacing.small}px;
`;

const BackChevron = styled.View`
  transform: rotate(-90deg);
`;

const BackLabel = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;
