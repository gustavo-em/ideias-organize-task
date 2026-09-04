import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

const styles = StyleSheet.create({ scrollContent: { flexGrow: 1 } });

interface AuthScreenLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** The shared frame for Login, Sign-up, and Recovery: a scrolling column
 * that keeps whatever field has focus above the keyboard, on both
 * platforms, without a second scroll view ever appearing inside it. */
export function AuthScreenLayout({
  title,
  subtitle,
  children,
}: AuthScreenLayoutProps) {
  return (
    <Safe edges={['top', 'bottom']}>
      <Avoider
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <Scroll
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Title accessibilityRole="header">{title}</Title>
          <Subtitle>{subtitle}</Subtitle>
          {children}
        </Scroll>
      </Avoider>
    </Safe>
  );
}

const Safe = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Avoider = styled(KeyboardAvoidingView)`
  flex: 1;
`;

const Scroll = styled.ScrollView`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.extraLarge}px
    ${({ theme }) => theme.spacing.large}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.type.title}px;
  font-weight: 800;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.type.body}px;
  margin-top: ${({ theme }) => theme.spacing.tiny}px;
  line-height: 20px;
`;
