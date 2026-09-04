import { Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import styled from 'styled-components/native';

import { AluzaSymbol } from '../../../../app/components/AluzaSymbol';
import { GroundFade } from '../../../../app/components/GroundFade';
import {
  EntranceCutout,
  type CutoutDemo,
} from '../../../../app/components/onboarding/cutouts';
import { brandGround } from '../../../../app/theme/brandGround';
import { PressableScale } from '../../../tasks/presentation/views/PressableScale';
import { AuthFormError } from '../views/AuthFormError';
import { AppleGlyph } from '../views/brand/AppleGlyph';
import { GoogleGlyph } from '../views/brand/GoogleGlyph';
import type { AuthCopy } from '../localization/authCopy';
import type { SubmitState } from '../view-models/useAuthViewModel';

interface EntranceScreenProps {
  copy: AuthCopy;
  /** The words inside the cut-out, from the app's own dictionary. */
  demo: CutoutDemo;
  appleState: SubmitState;
  googleState: SubmitState;
  onApple: () => void;
  onGoogle: () => void;
  /** Opens the email screen — the form with the password on it. */
  onEmail: () => void;
  onGuest: () => void;
  /** Left out until the published pages have addresses: without them the two
   * words render as plain text rather than as links that go nowhere. */
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

/** The footer sits over the cut-out, so the ground comes back before it does. */
const FOOTER_FADE = 34;

/**
 * The entrance: brand, promise, proof, and only then the ways in.
 *
 * The order is deliberate. A signed-out person landing on two empty fields has
 * been asked for something before being told what for; here the screen says
 * what the app is, shows a piece of it, and keeps the accounts at the bottom
 * where a decision belongs.
 *
 * Google takes the filled button — it is the way in most people on Android
 * take. Apple and email share a row under it, and the name-only way in is text
 * with no box at all: it is a shortcut, not an account.
 */
export function EntranceScreen({
  appleState,
  copy,
  demo,
  googleState,
  onApple,
  onEmail,
  onGoogle,
  onGuest,
  onOpenPrivacy,
  onOpenTerms,
}: EntranceScreenProps) {
  const window = useWindowDimensions();
  const entrance = copy.entrance;
  // Three lines at most on the headline: a narrow phone drops a size rather
  // than breaking the promise into five.
  const headlineSize = window.width < 380 ? 34 : 40;
  const isBusy =
    googleState.status === 'submitting' || appleState.status === 'submitting';
  // Apple's sign-in only exists on iOS, and the guidelines do not allow
  // offering it where it cannot run.
  const showsApple = Platform.OS === 'ios';

  return (
    <Ground testID="entrance">
      <Safe edges={['top', 'bottom']}>
        <Brand>
          <AluzaSymbol size={44} variant="onSol" />
          <Wordmark>aluza</Wordmark>
        </Brand>

        <Headline $size={headlineSize}>{entrance.headline}</Headline>

        <Cutout pointerEvents="none" testID="entrance-cutout">
          <EntranceCutout demo={demo} />
        </Cutout>

        <Footer>
          <FadeLayer pointerEvents="none">
            <GroundFade
              color={brandGround.sol}
              height={FOOTER_FADE}
              stop={0.34}
            />
          </FadeLayer>

          {googleState.errorKind == null ? null : (
            <AuthFormError message={copy.errors[googleState.errorKind]} />
          )}
          {appleState.errorKind == null ? null : (
            <AuthFormError message={copy.errors[appleState.errorKind]} />
          )}

          <Primary
            accessibilityLabel={entrance.google}
            accessibilityState={{ busy: isBusy, disabled: isBusy }}
            disabled={isBusy}
            onPress={onGoogle}
            testID="entrance-google"
          >
            <GoogleGlyph size={18} />
            <PrimaryText>{entrance.google}</PrimaryText>
          </Primary>

          <SecondRow>
            {showsApple ? (
              <Secondary
                accessibilityLabel={copy.login.apple}
                accessibilityState={{ busy: isBusy, disabled: isBusy }}
                disabled={isBusy}
                onPress={onApple}
                testID="entrance-apple"
              >
                <AppleGlyph color={brandGround.onSol} size={16} />
                <SecondaryText>{entrance.apple}</SecondaryText>
              </Secondary>
            ) : null}

            <Secondary
              accessibilityLabel={entrance.email}
              disabled={isBusy}
              onPress={onEmail}
              testID="entrance-email"
            >
              <Envelope />
              <SecondaryText>{entrance.email}</SecondaryText>
            </Secondary>
          </SecondRow>

          <Guest
            accessibilityLabel={entrance.guest}
            disabled={isBusy}
            onPress={onGuest}
            testID="entrance-guest"
          >
            <GuestText>{entrance.guest}</GuestText>
          </Guest>

          <Legal>
            {entrance.legal.lead}{' '}
            <LegalWord $link={onOpenTerms != null} onPress={onOpenTerms}>
              {entrance.legal.terms}
            </LegalWord>{' '}
            {entrance.legal.and}{' '}
            <LegalWord $link={onOpenPrivacy != null} onPress={onOpenPrivacy}>
              {entrance.legal.privacy}
            </LegalWord>
            .
          </Legal>
        </Footer>
      </Safe>
    </Ground>
  );
}

/** The email button's glyph. Drawn here rather than pulled from the field
 * glyphs: those are sized for a form row, this one sits next to a label. */
function Envelope() {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Rect
        fill="none"
        height={10}
        rx={2.5}
        stroke={brandGround.onSol}
        strokeWidth={1.7}
        width={14}
        x={1}
        y={3}
      />
      <Path
        d="M1.8 4.2 8 8.8l6.2-4.6"
        fill="none"
        stroke={brandGround.onSol}
        strokeLinejoin="round"
        strokeWidth={1.7}
      />
    </Svg>
  );
}

const Ground = styled.View`
  flex: 1;
  background-color: ${brandGround.sol};
`;

const Safe = styled(SafeAreaView)`
  flex: 1;
  width: 100%;
  max-width: 520px;
  align-self: center;
`;

const Brand = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 26px 24px 0;
`;

const Wordmark = styled.Text`
  font-size: 38px;
  line-height: 38px;
  font-weight: 800;
  letter-spacing: -1.8px;
  color: ${brandGround.onSol};
`;

const Headline = styled.Text<{ $size: number }>`
  padding: 26px 24px 0;
  font-size: ${({ $size }) => $size}px;
  line-height: ${({ $size }) => Math.round($size * 1.02)}px;
  font-weight: 800;
  letter-spacing: -1.7px;
  color: ${brandGround.onSol};
`;

const Cutout = styled.View`
  flex: 1;
  min-height: 160px;
  margin-top: 22px;
`;

const Footer = styled.View`
  position: relative;
  padding: 0 24px 30px;
  gap: 10px;
`;

const FadeLayer = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
`;

const Primary = styled(PressableScale)`
  min-height: 54px;
  border-radius: 15px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: ${brandGround.tinta};
`;

const PrimaryText = styled.Text`
  font-size: 15px;
  font-weight: 800;
  color: #fffdf7;
`;

const SecondRow = styled.View`
  flex-direction: row;
  gap: 10px;
`;

const Secondary = styled(PressableScale)`
  flex: 1;
  min-height: 50px;
  border-radius: 15px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: ${brandGround.card};
`;

const SecondaryText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${brandGround.onSol};
`;

/** No box: the shortcut is not one of the accounts above it. */
const Guest = styled(PressableScale)`
  min-height: 46px;
  align-items: center;
  justify-content: center;
`;

const GuestText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: rgba(27, 23, 16, 0.72);
`;

const Legal = styled.Text`
  font-size: 11px;
  line-height: 16px;
  font-weight: 400;
  text-align: center;
  padding: 0 14px;
  color: ${brandGround.onSolFaint};
`;

/** Underlined only when it opens something. A link that announces itself to a
 * screen reader and then does nothing is worse than plain text, so until the
 * published pages have addresses these two words read as words. */
const LegalWord = styled.Text.attrs<{ $link: boolean }>(({ $link }) => ({
  accessibilityRole: $link ? ('link' as const) : undefined,
}))<{ $link: boolean }>`
  text-decoration-line: ${({ $link }) => ($link ? 'underline' : 'none')};
`;
