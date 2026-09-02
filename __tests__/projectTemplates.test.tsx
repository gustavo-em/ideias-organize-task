import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { lightTheme } from '../src/app/theme/theme';
import type {
  ListColor,
  ProjectIcon,
} from '../src/features/tasks/domain/TaskList';
import { getTaskCopy } from '../src/features/tasks/presentation/localization/taskCopy';
import { ProjectEditorSheet } from '../src/features/tasks/presentation/views/ListNameSheet';

const copy = getTaskCopy('pt-BR');

interface Submitted {
  name: string;
  color: ListColor;
  icon: ProjectIcon;
}

function render(options: { shared?: boolean; refuse?: boolean } = {}) {
  const submitted: Submitted[] = [];
  const shareValue = { current: false };
  let renderer!: ReturnType<typeof create>;

  act(() => {
    renderer = create(
      <ThemeProvider theme={lightTheme}>
        <ProjectEditorSheet
          copy={copy}
          onCancel={() => undefined}
          onSubmit={(name, appearance) => {
            submitted.push({ name, ...appearance });
            return options.refuse !== true;
          }}
          shareOption={
            options.shared === false
              ? undefined
              : {
                  value: shareValue.current,
                  onChange: value => {
                    shareValue.current = value;
                  },
                }
          }
          submitLabel={copy.lists.create}
          templates
          title={copy.lists.newList}
        />
      </ThemeProvider>,
    );
  });

  return { root: renderer.root, submitted };
}

function press(root: ReactTestInstance, testID: string) {
  const target = root.findAll(
    node => node.props.testID === testID && node.props.onPress != null,
  )[0];

  act(() => {
    target.props.onPress();
  });
}

function find(root: ReactTestInstance, testID: string) {
  return root.findAll(node => node.props.testID === testID)[0];
}

function has(root: ReactTestInstance, testID: string) {
  return root.findAll(node => node.props.testID === testID).length > 0;
}

function texts(root: ReactTestInstance) {
  return root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children as string);
}

describe('starting a space from a template', () => {
  it('offers the six starting points before asking for a name', () => {
    const { root } = render();
    const shown = texts(root);

    expect(shown).toContain(copy.lists.templatesSubtitle);
    for (const id of ['home', 'trip', 'bills', 'market', 'work', 'blank']) {
      expect(has(root, `list-template-${id}`)).toBe(true);
    }
    expect(shown).toContain('Casa');
    expect(shown).toContain('Consertos e combinados');
    expect(has(root, 'list-name-field')).toBe(false);
  });

  it('names the card by its title and description', () => {
    const { root } = render();

    expect(find(root, 'list-template-home').props.accessibilityLabel).toBe(
      'Casa. Consertos e combinados',
    );
    expect(find(root, 'list-template-home').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('pre-fills name, symbol and colour, and creates the space with them', () => {
    const { root, submitted } = render();

    press(root, 'list-template-home');

    expect(find(root, 'list-name-field').props.value).toBe('Casa');
    expect(find(root, 'list-icon-home').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(find(root, 'list-color-coral').props.accessibilityState).toEqual({
      selected: true,
    });

    press(root, 'list-name-submit');

    expect(submitted).toEqual([{ name: 'Casa', color: 'coral', icon: 'home' }]);
  });

  it('keeps the blank space exactly as it was', () => {
    const { root } = render();

    press(root, 'list-template-blank');

    expect(find(root, 'list-name-field').props.value).toBe('');
    expect(find(root, 'list-icon-layers').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('goes back to the grid without closing the sheet', () => {
    const { root } = render();

    press(root, 'list-template-home');

    expect(has(root, 'list-back-to-templates')).toBe(true);

    press(root, 'list-back-to-templates');

    expect(has(root, 'list-template-home')).toBe(true);
    expect(has(root, 'list-name-field')).toBe(false);

    press(root, 'list-template-trip');

    expect(find(root, 'list-name-field').props.value).toBe('Viagem');
    expect(find(root, 'list-color-ocean').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('reports a name already taken only after Criar is pressed', () => {
    const { root } = render({ refuse: true });

    press(root, 'list-template-home');

    expect(texts(root)).not.toContain(copy.lists.duplicateName);

    press(root, 'list-name-submit');

    expect(texts(root)).toContain(copy.lists.duplicateName);
  });

  it('still offers the shared switch after a template is chosen', () => {
    const { root } = render();

    press(root, 'list-template-trip');

    expect(has(root, 'list-shared-toggle')).toBe(true);

    press(root, 'list-shared-toggle');

    expect(find(root, 'list-shared-toggle').props.accessibilityLabel).toBe(
      copy.lists.sharedProject,
    );
  });
});
