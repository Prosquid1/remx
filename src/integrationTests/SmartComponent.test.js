import React from 'react';
import renderer from 'react-test-renderer';
import { grabConsoleErrors } from '../utils/testUtils';

['es6Remx'].forEach((version) => {
  describe(`SmartComponent (${version})`, () => {
    const Store = require('./Store').default;
    const connect = require(`../${version}/connect`).connect;
    const remx = require(`../${version}/remx`);
    let MyComponent;
    let store;
    let renderSpy;

    beforeEach(() => {
      MyComponent = require('./SmartComponent').default;
      store = new Store(remx);
      renderSpy = jest.fn();
    });

    afterEach(() => {
      delete global.__mobxInstanceCount; // prevent warnings
    });

    it('renders normally', () => {
      let tree;
      expect(grabConsoleErrors(() => tree = renderer.create(<MyComponent store={store} renderSpy={renderSpy} />)));
      expect(tree.toJSON().children).toEqual(['nothing']);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('connected component renders normally', () => {
      const MyConnectedComponent = connect()(MyComponent);
      const tree = renderer.create(<MyConnectedComponent store={store} renderSpy={renderSpy} />);
      expect(tree.toJSON().children).toEqual(['nothing']);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    describe('warning on accessing state in untracked React components', () => {
      it('desn\'t warn on accesing state outside of React component', () => {
        expect(grabConsoleErrors(() => store.getters.getProduct('0'))).toEqual([]);
      });

      it('not connected classic component warns', () => {
        expect(grabConsoleErrors(() => renderer.create(<MyComponent store={store} renderSpy={renderSpy} />)))
          .toEqual([
            ['[REMX] attemted to access prop \'products\' in react component untracked by remx'],
            ['[REMX] attemted to access prop \'123\' in react component untracked by remx'],
            ['[REMX] attemted to access prop \'person\' in react component untracked by remx'],
            ['[REMX] attemted to access prop \'name\' in react component untracked by remx']
          ]);
      });

      it('connected classic component doesn\'t warn', () => {
        const MyConnectedComponent = connect()(MyComponent);
        expect(grabConsoleErrors(() =>
          renderer.create(<MyConnectedComponent store={store} renderSpy={renderSpy} />))
        )
            .toEqual([]);
      });

      it('not connected functional component warns', () => {
        const FC = () => store.getters.getProduct('0') || null;
        expect(grabConsoleErrors(() => renderer.create(<FC />)))
          .toEqual([
            ['[REMX] attemted to access prop \'products\' in react component untracked by remx'],
            ['[REMX] attemted to access prop \'0\' in react component untracked by remx'],
          ]);
      });

      it('connected functional component doesn\'t warn', () => {
        const FC = () => store.getters.getProduct('0') || null;
        const ConnectedFC = connect()(FC);
        expect(grabConsoleErrors(() => renderer.create(<ConnectedFC />))).toEqual([]);
      });

      it('not connected forwardRef component warns', () => {
        const FCFW = React.forwardRef(() => store.getters.getProduct('0') || null);
        expect(grabConsoleErrors(() => renderer.create(<FCFW />)))
          .toEqual([
            ['[REMX] attemted to access prop \'products\' in react component untracked by remx'],
            ['[REMX] attemted to access prop \'0\' in react component untracked by remx'],
          ]);
      });

      it('connected forwardRef component doesn\'t warn', () => {
        const FCFW = React.forwardRef(() => store.getters.getProduct('0') || null);
        const ConnectedFCFW = connect()(FCFW);
        expect(grabConsoleErrors(() => renderer.create(<ConnectedFCFW />))).toEqual([]);
      });
    })

    it('regular component does not listen to changes', () => {
      let tree;
      expect(grabConsoleErrors(() => tree = renderer.create(<MyComponent store={store} renderSpy={renderSpy} />)));
      expect(tree.toJSON().children).toEqual(['nothing']);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      store.setters.setName(`Gandalf`);
      expect(store.getters.getName()).toEqual('Gandalf');
      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(tree.toJSON().children).toEqual(['nothing']);
    });

    it('connected component automatically rerenders when selectors changes', () => {
      const MyConnectedComponent = connect()(MyComponent);
      const tree = renderer.create(<MyConnectedComponent store={store} renderSpy={renderSpy} />);

      expect(store.getters.getName()).toEqual('nothing');
      expect(tree.toJSON().children).toEqual(['nothing']);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      store.setters.setName(`Gandalf`);
      expect(store.getters.getName()).toEqual('Gandalf');
      expect(tree.toJSON().children).toEqual(['Gandalf']);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    describe('using remx.map', () => {
      it('detects changes on added keys', () => {
        const MyConnectedComponent = connect()(MyComponent);
        const tree = renderer.create(<MyConnectedComponent store={store} />);
        expect(tree.toJSON().children).toEqual(['nothing']);

        store.setters.addProduct('123', { title: 'my product' });
        expect(tree.toJSON().children).toEqual(['my product']);
      });
    });

    it('should track dynamically added keys', () => {
      const MyConnectedComponent = connect()(MyComponent);
      const tree = renderer.create(<MyConnectedComponent store={store} testDynamicObject />);
      expect(tree.toJSON().children).toEqual(['{}']);

      store.setters.setDynamicObject('newKey', 'newValue');
      expect(tree.toJSON().children).toEqual([JSON.stringify({ newKey: 'newValue' })]);
    });

    it('should track nested dynamically added keys', () => {
      const MyConnectedComponent = connect()(MyComponent);
      const tree = renderer.create(<MyConnectedComponent store={store} testDynamicObject />);
      const nestedObject = { nestedKey: 'nestedValue' };
      store.setters.setDynamicObject('newKey', nestedObject);
      expect(tree.toJSON().children).toEqual([JSON.stringify({ newKey: nestedObject })]);
      store.setters.setDynamicObjectNestedValue('someNewValue');
      expect(tree.toJSON().children).toEqual([JSON.stringify({ newKey: { nestedKey: 'someNewValue' } })]);
    });

    it('connected component has same static members as original component', () => {
      const MyConnectedComponent = connect()(MyComponent);
      expect(MyConnectedComponent.staticMember).toEqual('a static member');
    });
  });
});
