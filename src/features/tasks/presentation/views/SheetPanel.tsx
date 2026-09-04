import styled from 'styled-components/native';

/**
 * The box a chip opens into.
 *
 * Calendar, lead time and space all take the keyboard's place under the chips,
 * and they take it in the same shape: a quiet panel in the sheet's paper
 * colour, a caption title in capitals, and whatever the chip needed to ask.
 * One mould, so opening a second chip never feels like opening a second app.
 */
export const PanelBox = styled.View`
  margin-top: ${({ theme }) => theme.spacing.medium - 2}px;
  padding: ${({ theme }) => theme.spacing.medium - 2}px
    ${({ theme }) => theme.spacing.medium - 2}px
    ${({ theme }) => theme.spacing.medium}px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.background};
  gap: ${({ theme }) => theme.spacing.small + 2}px;
`;

export const PanelHead = styled.View`
  flex-direction: row;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.small}px;
`;

export const PanelTitle = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
`;

/** A fact beside the title, in the same quiet ink but no capitals. */
export const PanelMeta = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 600;
`;
