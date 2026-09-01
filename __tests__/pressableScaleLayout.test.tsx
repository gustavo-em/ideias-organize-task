import { Text, View, StyleSheet } from 'react-native';
import { act, create } from 'react-test-renderer';

import { PressableScale } from '../src/features/tasks/presentation/views/PressableScale';

function render(style: object) {
  let tree: ReturnType<typeof create> | null = null;

  act(() => {
    tree = create(
      <PressableScale onPress={() => {}} style={style} testID="target">
        <View testID="glyph" />
        <Text>Nova tarefa</Text>
      </PressableScale>,
    );
  });

  return tree as unknown as ReturnType<typeof create>;
}

/** The view that actually holds the children: the animated one inside the
 * pressable. */
function childContainerStyle(tree: ReturnType<typeof create>) {
  const glyph = tree.root.findAllByProps({ testID: 'glyph' })[0];
  let container = glyph.parent;

  while (container && container.type !== View) {
    container = container.parent;
  }

  if (!container) {
    throw new Error('no view holds the children');
  }

  return StyleSheet.flatten(container.props.style) as Record<string, unknown>;
}

describe('PressableScale layout', () => {
  it('arranges the children the way the caller wrote it', () => {
    const tree = render({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    });
    const style = childContainerStyle(tree);

    expect(style.flexDirection).toBe('row');
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('center');
    expect(style.gap).toBe(7);
  });

  it('fills the pressable so centering has room to work', () => {
    const style = childContainerStyle(render({ alignItems: 'center' }));

    expect(style.alignSelf).toBe('stretch');
    expect(style.flexGrow).toBe(1);
  });

  it('leaves paint and spacing on the pressable itself', () => {
    const style = childContainerStyle(
      render({ padding: 12, backgroundColor: '#fff', elevation: 5 }),
    );

    expect(style.padding).toBeUndefined();
    expect(style.backgroundColor).toBeUndefined();
    expect(style.elevation).toBeUndefined();
  });
});
