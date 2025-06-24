// Custom test runner for more control
const { execSync } = require('child_process');

console.log('🧪 Running Register Endpoint Tests...\n');

try {
  execSync('npm test -- --testPathPattern=auth.register.test.js --verbose', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('\n✅ All tests passed!');
} catch (error) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
}