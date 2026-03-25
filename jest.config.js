module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 10000,
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/types/**/*.ts',
  ],
}
