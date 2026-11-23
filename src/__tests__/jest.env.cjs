// react ships react.act only in the development build; force it for the
// node test environment so @testing-library/react-native can use act().
process.env.NODE_ENV = 'development';
