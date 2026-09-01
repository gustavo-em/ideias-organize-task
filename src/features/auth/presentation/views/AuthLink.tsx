import styled from 'styled-components/native';

import { PressableScale } from '../../../tasks/presentation/views/PressableScale';

interface AuthLinkProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/** A secondary move — "create account", "forgot password" — never drawn in
 * the brand yellow, which this app keeps as a surface and fill, not ink. */
export function AuthLink({
  label,
  onPress,
  disabled = false,
  testID,
}: AuthLinkProps) {
  return (
    <Link
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <LinkLabel>{label}</LinkLabel>
    </Link>
  );
}

const Link = styled(PressableScale)`
  align-items: center;
  justify-content: center;
  /* The drawn text is small on purpose; the target under it is not. */
  min-height: 48px;
  padding: 13px 0px;
`;

const LinkLabel = styled.Text`
  color: ${({ theme }) => theme.colors.accentInk};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
`;
