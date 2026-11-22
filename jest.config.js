module.exports = {
  testEnvironment: 'node',
  globals: { 'ts-jest': { tsconfig: { types: ['jest'] } } },
  testMatch: ['**/src/**/*.test.ts', '**/*.rules.test.ts'],
};
