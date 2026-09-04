// Destino: src/features/tasks/presentation/views/SharedDayBand.tsx
//
// Imagens: handoff/6a-faixa-em-contexto.png (em contexto),
// handoff/6b-estados-de-linha.png (os quatro estados),
// handoff/6c-faixa-vazia-fechada-offline.png (vazio, todos fecharam, sem rede).

import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { STAGGER_MS } from '../animation/motion';
import type { TaskCopy } from '../localization/taskCopy';
import {
  everyoneClosed,
  type SharedDayEntry,
} from '../models/sharedDay';
import { CheckGlyph } from './FieldGlyphs';
import { MemberChip } from './MemberChip';
import { PressableScale } from './PressableScale';
import { FocusGlyph } from './TabGlyphs';

interface SharedDayBandProps {
  copy: TaskCopy;
  /** Já ordenado por `sharedDay(...)`. A faixa não reordena nada. */
  entries: readonly SharedDayEntry[];
  /** Dias em que todo mundo fechou o que levou. 0 esconde a linha. */
  streakDays?: number;
  /** True quando o que está na tela veio do disco, não da rede. */
  offline?: boolean;
  /** Ausente para quem é `viewer`: sem botão, a faixa só informa. */
  onTakeOne?: () => void;
}

/**
 * O combinado do dia: quem levou o quê, e onde cada um está.
 *
 * Uma faixa de Sol, não um cartão — ela sangra até a borda da tela porque é a
 * primeira coisa do projeto compartilhado, e um cartão dentro de outro cartão
 * viraria mais uma caixa numa tela que já tem caixas.
 *
 * O que ela deliberadamente NÃO mostra: peso, pontos, nível ou sequência
 * individual de outra pessoa. O projeto é compartilhado; o placar não.
 */
export function SharedDayBand({
  copy,
  entries,
  streakDays = 0,
  offline = false,
  onTakeOne,
}: SharedDayBandProps) {
  const theme = useTheme();
  const allDone = everyoneClosed(entries);

  return (
    <Band entering={FadeIn.duration(180)}>
      <Eyebrow accessibilityRole="header">{copy.lists.dayBandTitle}</Eyebrow>

      {entries.length === 0 ? (
        <Empty>{copy.lists.dayBandEmpty}</Empty>
      ) : allDone ? (
        <>
          <Row $first>
            <Stack>
              {entries.map((entry, index) => (
                <MemberChip
                  inverted
                  key={entry.member.personId}
                  name={entry.member.name}
                  personId={entry.member.personId}
                  size="large"
                  stacked={index > 0}
                />
              ))}
            </Stack>
            <Info>
              <Name>{copy.lists.dayBandAllDone(entries.length)}</Name>
            </Info>
            <CheckGlyph color={theme.colors.onAccent} size={16} />
          </Row>
          {streakDays > 0 ? (
            <Note>{copy.lists.dayBandStreak(streakDays)}</Note>
          ) : null}
        </>
      ) : (
        entries.map((entry, index) => (
          <Row
            $first={index === 0}
            entering={FadeInDown.delay(index * STAGGER_MS).duration(280)}
            key={entry.member.personId}
          >
            <MemberChip
              inverted
              name={entry.member.name}
              personId={entry.member.personId}
              pending={entry.state === 'absent'}
              size="large"
            />
            <Info>
              <Name $dim={entry.state === 'absent'}>{entry.member.name}</Name>
              <Line $done={entry.state === 'done'}>
                {entry.task?.title ?? copy.lists.dayBandAbsent}
              </Line>
            </Info>
            {entry.state === 'focusing' ? (
              <FocusGlyph active color={theme.colors.onAccent} size={20} />
            ) : null}
            {entry.state === 'done' ? (
              <CheckGlyph color={theme.colors.onAccent} size={16} />
            ) : null}
          </Row>
        ))
      )}

      {offline ? <Note>{copy.lists.dayBandOffline}</Note> : null}

      {onTakeOne == null ? null : (
        <Take
          accessibilityLabel={copy.lists.dayBandTakeOne}
          onPress={onTakeOne}
          testID="shared-day-take-one"
        >
          <TakeText>{copy.lists.dayBandTakeOne}</TakeText>
        </Take>
      )}
    </Band>
  );
}

/** Sangra até a borda da tela de dentro do `Expanded` do `ListsScreen`, que
 * já tem `padding-left: spacing.small` — daí a margem esquerda maior. Nunca
 * use largura de tela: em tablet e em janela dividida ela mente. */
const Band = styled(Animated.View)`
  background-color: ${({ theme }) => theme.colors.accent};
  margin: ${({ theme }) => theme.spacing.medium}px
    -${({ theme }) => theme.spacing.large}px 0px
    -${({ theme }) => theme.spacing.large + theme.spacing.small}px;
  padding: ${({ theme }) => theme.spacing.large - 4}px
    ${({ theme }) => theme.spacing.large}px;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.caption}px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
`;

const Empty = styled.Text`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.body}px;
  line-height: ${({ theme }) => theme.type.body + 7}px;
  margin-top: ${({ theme }) => theme.spacing.small + 6}px;
`;

const Row = styled(Animated.View)<{ $first: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small + 4}px;
  padding: 13px 0px 12px;
  border-top-width: ${({ $first }) => ($first ? 0 : 1.5)}px;
  border-top-color: ${({ theme }) => theme.colors.onAccentLine};
`;

const Stack = styled.View`
  flex-direction: row;
  align-items: center;
`;

const Info = styled.View`
  flex: 1;
`;

const Name = styled.Text<{ $dim?: boolean }>`
  color: ${({ theme, $dim }) =>
    $dim ? theme.colors.onAccentSubtle : theme.colors.onAccent};
  font-size: ${({ theme }) => theme.type.body}px;
  font-weight: 700;
`;

const Line = styled.Text<{ $done: boolean }>`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  text-decoration-line: ${({ $done }) => ($done ? 'line-through' : 'none')};
`;

const Note = styled.Text`
  color: ${({ theme }) => theme.colors.onAccentSubtle};
  font-size: ${({ theme }) => theme.type.label}px;
  line-height: ${({ theme }) => theme.type.label + 5}px;
  border-top-width: 1.5px;
  border-top-color: ${({ theme }) => theme.colors.onAccentLine};
  padding-top: ${({ theme }) => theme.spacing.small + 4}px;
`;

/** A única inversão Tinta/Sol da faixa, reservada para o botão que decide
 * algo. Se um segundo elemento a usar, os dois param de significar. */
const Take = styled(PressableScale)`
  min-height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.text};
  padding: 15px;
  margin-top: ${({ theme }) => theme.spacing.medium}px;
`;

const TakeText = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: ${({ theme }) => theme.type.label}px;
  font-weight: 800;
`;
