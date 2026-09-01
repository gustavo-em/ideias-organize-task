import styled from 'styled-components/native';

/** The same typographic rule the section headers use: a short label and a
 * thin line that crosses the rest of the width. It groups what comes below
 * without wrapping it in another box. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <Row accessibilityRole="header">
      <Label>{label}</Label>
      <Rule />
    </Row>
  );
}

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small}px;
  margin-top: ${({ theme }) => theme.spacing.large}px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 700;
  letter-spacing: 1px;
`;

const Rule = styled.View`
  flex: 1;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;
