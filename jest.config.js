module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { types: ['jest'], esModuleInterop: true } }] },
  testMatch: ['**/src/entitlements/*.test.ts', '**/firestore.rules.test.ts'],
};
