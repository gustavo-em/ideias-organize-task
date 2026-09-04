import { forwardRef, type ComponentRef } from 'react';
import { useTheme } from 'styled-components/native';
import styled from 'styled-components/native';
import Svg, { Circle, Rect } from 'react-native-svg';

export type AuthFieldKind =
  | 'email'
  | 'password'
  | 'newPassword'
  | 'confirmPassword'
  | 'name';

interface AuthTextFieldProps {
  label: string;
  kind: AuthFieldKind;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  maxLength?: number;
  /** False while another way in is waiting on its own sheet: the form is
   * still on screen and readable, it just cannot be typed into. */
  editable?: boolean;
  testID?: string;
}

const KIND_PROPS: Record<
  AuthFieldKind,
  {
    secureTextEntry: boolean;
    keyboardType: 'default' | 'email-address';
    autoComplete: 'email' | 'password' | 'password-new' | 'name' | 'off';
    textContentType: 'emailAddress' | 'password' | 'newPassword' | 'name';
    autoCapitalize: 'none' | 'sentences' | 'words';
  }
> = {
  email: {
    secureTextEntry: false,
    keyboardType: 'email-address',
    autoComplete: 'email',
    textContentType: 'emailAddress',
    autoCapitalize: 'none',
  },
  password: {
    secureTextEntry: true,
    keyboardType: 'default',
    autoComplete: 'password',
    textContentType: 'password',
    autoCapitalize: 'none',
  },
  newPassword: {
    secureTextEntry: true,
    keyboardType: 'default',
    autoComplete: 'password-new',
    textContentType: 'newPassword',
    autoCapitalize: 'none',
  },
  confirmPassword: {
    secureTextEntry: true,
    keyboardType: 'default',
    autoComplete: 'password-new',
    textContentType: 'newPassword',
    autoCapitalize: 'none',
  },
  name: {
    secureTextEntry: false,
    keyboardType: 'default',
    autoComplete: 'name',
    textContentType: 'name',
    autoCapitalize: 'words',
  },
};

/** A small mark that says "read this" without borrowing the destructive red
 * reserved for the Excluir button. It sits on the same warm ink used for
 * selected labels elsewhere in the app. */
function NoticeGlyph({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 16 16" width={size}>
      <Circle
        cx={8}
        cy={8}
        fill="none"
        r={6.4}
        stroke={color}
        strokeWidth={1.5}
      />
      <Rect fill={color} height={5.6} rx={0.9} width={1.6} x={7.2} y={4.4} />
      <Circle cx={8} cy={11.4} fill={color} r={0.9} />
    </Svg>
  );
}

/**
 * One labeled input, shared by the login, sign-up, and recovery screens. The
 * label is always on screen — a placeholder is never the only name a field
 * has, or it disappears for a low-vision or talkback user the moment typing
 * starts.
 */
export type AuthTextFieldHandle = ComponentRef<typeof Input>;

export const AuthTextField = forwardRef<
  AuthTextFieldHandle,
  AuthTextFieldProps
>(function AuthTextFieldInner(
  {
    label,
    kind,
    value,
    onChangeText,
    error,
    returnKeyType,
    onSubmitEditing,
    autoFocus,
    maxLength,
    editable = true,
    testID,
  },
  ref,
) {
  const theme = useTheme();
  const kindProps = KIND_PROPS[kind];

  return (
    <Field>
      <Label>{label}</Label>
      <Input
        accessibilityLabel={label}
        accessibilityState={{ disabled: !editable }}
        autoCapitalize={kindProps.autoCapitalize}
        autoComplete={kindProps.autoComplete}
        autoCorrect={false}
        autoFocus={autoFocus}
        editable={editable}
        keyboardType={kindProps.keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholderTextColor={theme.colors.muted}
        ref={ref}
        returnKeyType={returnKeyType ?? 'next'}
        secureTextEntry={kindProps.secureTextEntry}
        testID={testID}
        textContentType={kindProps.textContentType}
        value={value}
      />
      {error == null ? null : (
        <ErrorRow accessibilityLiveRegion="polite">
          <NoticeGlyph color={theme.colors.accentInk} />
          <ErrorText>{error}</ErrorText>
        </ErrorRow>
      )}
    </Field>
  );
});

const Field = styled.View`
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.small}px;
`;

const Input = styled.TextInput.attrs(({ theme }) => ({
  // The caret and selection speak the brand, not the platform default teal.
  cursorColor: theme.colors.accent,
  selectionColor: theme.colors.accent,
}))`
  min-height: 48px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
  padding: 12px ${({ theme }) => theme.spacing.medium}px;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.body}px;
`;

const ErrorRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.small}px;
`;

const ErrorText = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  font-size: ${({ theme }) => theme.type.caption + 1}px;
  line-height: 17px;
`;
