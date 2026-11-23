/**
 * Lightweight react-native stub for component tests (T8.1a).
 * RN 0.88's index.js includes a Flow `import typeof` line that trips Jest's
 * ESM detection; real components only need these primitives to render in the
 * node environment via react-test-renderer.
 *
 * Host primitives map to string host types so test-renderer keeps props
 * (children, onPress) in the rendered tree. Components whose children may be
 * a render function (Pressable) get function-child unwrapping first.
 */
const React = require('react');

const noop = () => {};
const host = (name) => name;

/** Unwraps function children ({pressed}) => node — like real RN Pressable. */
const Pressable = React.forwardRef(function RNPressable(props, _ref) {
  const { children, ...rest } = props;
  return React.createElement(
    'Pressable',
    rest,
    children && typeof children === 'function' ? children({ pressed: false }) : (children ?? null)
  );
});

module.exports = {
  // Host primitives used by src/design/* and screens
  View: host('View'),
  Text: host('Text'),
  TextInput: host('TextInput'),
  TouchableOpacity: host('TouchableOpacity'),
  SafeAreaView: host('SafeAreaView'),
  Pressable,
  ActivityIndicator: host('ActivityIndicator'),
  ScrollView: host('ScrollView'),
  FlatList: host('FlatList'),
  Image: host('Image'),
  Switch: host('Switch'),
  StyleSheet: {
    create: (s) => s,
    flatten: (s) => (Array.isArray(s) ? Object.assign({}, ...s) : s),
    hairlineWidth: 1,
    absoluteFillObject: {},
  },
  Platform: { OS: 'ios', select: (o) => o.ios ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844 }), addEventListener: noop, removeEventListener: noop },
  Animated: { View: host('AnimatedView'), Text: host('AnimatedText'), Value: class {}, timing: () => ({ start: noop }) },
  Easing: {},
  I18nManager: { isRTL: false },
  Appearance: { getColorScheme: () => 'dark', addChangeListener: noop },
  BackHandler: { addEventListener: noop, removeEventListener: noop },
  StatusBar: { currentHeight: 47 },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  useColorScheme: () => 'dark',
};
