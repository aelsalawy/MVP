module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { types: ['jest'], esModuleInterop: true } }] },
  testMatch: ['**/src/**/?(*.)+(test|spec).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', 'firestore.rules.test.ts', 'src/design/tests/'],
  setupFilesAfterEnv: ['./src/__tests__/jest.setup.ts'],
  testEnvironmentOptions: {},
  // react development build (exports .act for @testing-library/react-native).
  // Must be a setupFile (runs before react is first required inside tests).
  setupFiles: ['./src/__tests__/jest.env.cjs'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__tests__/rn-mock.js',
  },
};
