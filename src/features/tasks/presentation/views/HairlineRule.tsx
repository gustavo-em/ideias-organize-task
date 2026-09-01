import styled from 'styled-components/native';

/**
 * Typographic rule shared by section and screen headers — the fine line that
 * groups a heading with the width it owns.
 *
 * Constant hairline: never partially filled, never animated, never a progress
 * indicator. Decorative for screen readers.
 */
export const HairlineRule = styled.View.attrs({
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no' as const,
})`
  flex: 1;
  min-width: 0px;
  height: 1px;
  align-self: center;
  background-color: ${({ theme }) => theme.colors.border};
`;
