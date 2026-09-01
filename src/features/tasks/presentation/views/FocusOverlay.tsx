import { useEffect, type ReactNode } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import { contentFadeEnter } from '../../../../app/animation/motion';
import { ChevronGlyph } from './FieldGlyphs';
import { PressableScale } from './PressableScale';

interface FocusOverlayProps {
  /** The session screen, handed in whole: this layer never reaches into it. */
  children: ReactNode;
  label: string;
  /** True while a block exists, so the chrome takes the session's ink. */
  onSessionGround: boolean;
  /** Leaves the session on screen behind the list. Never stops the block. */
  onClose: () => void;
}

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

  const ink = onSessionGround ? theme.colors.onFocus : theme.colors.text;

  return (
    <Layer
      accessibilityViewIsModal
      entering={contentFadeEnter()}
      style={[
        StyleSheet.absoluteFill,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          // The band above the session shares its ground, so the screen reads
          // as one surface instead of a strip pasted over another.
          backgroundColor: onSessionGround
            ? theme.colors.focus
            : theme.colors.background,
        },
      ]}
    >
      {/* A running block is centred and has room to spare, so the chrome
          floats over it and the frame stays exactly as it was. The idle list
          starts at the top, where the button would land on the heading, so
          there the band is reserved. */}
      <Content $reserveChrome={!onSessionGround}>{children}</Content>

      <Chrome pointerEvents="box-none">
        <Back
          accessibilityLabel={label}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          scaleTo={0.94}
          testID="focus-close"
        >
          <BackChevron>
            <ChevronGlyph color={ink} size={18} up />
          </BackChevron>
          <BackLabel style={{ color: ink }}>{label}</BackLabel>
        </Back>
      </Chrome>
    </Layer>
  );
}

const Layer = styled(Animated.View)``;

/* The session keeps the exact frame it had as a tab: the chrome is absolute,
   so nothing below it moves while a block runs. */
const Content = styled.View<{ $reserveChrome: boolean }>`
  flex: 1;
  padding-top: ${({ $reserveChrome }) => ($reserveChrome ? 44 : 0)}px;
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
  min-height: 44px;
  padding-right: ${({ theme }) => theme.spacing.small}px;
`;

const BackChevron = styled.View`
  transform: rotate(-90deg);
`;

const BackLabel = styled.Text`
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;
