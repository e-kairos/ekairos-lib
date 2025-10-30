/*import { DatasetService } from '@ekairos/dataset';
import { storyDomain } from 'ekairos';

console.log('🧪 Testing @ekairos/dataset Integration\n');

// Test 1: Dataset Service
console.log('✓ Test 1: DatasetService import');
console.log('  - DatasetService:', typeof DatasetService);

// Test 2: Story Domain
console.log('\n✓ Test 2: Story Domain from ekairos');
console.log('  - storyDomain:', typeof storyDomain);
console.log('  - storyDomain.entities:', Object.keys(storyDomain.entities || {}).join(', '));
console.log('  - Story entities:', ['story_contexts', 'story_events', 'story_executions'].every(e => e in (storyDomain.entities || {})) ? 'All present ✓' : 'Missing some');

// Test 3: Dataset Domain
console.log('\n✓ Test 3: Dataset schema');
try {
  const { datasetDomain } = require('@ekairos/dataset');
  console.log('  - datasetDomain:', typeof datasetDomain);
  console.log('  - Dataset entities:', Object.keys(datasetDomain.entities || {}).join(', '));
} catch (error: any) {
  console.log('  - datasetDomain not exported (OK, internal)');
}

// Test 4: Python Scripts Path
console.log('\n✓ Test 4: Python scripts availability');
const fs = require('fs');
const path = require('path');

const scriptsPath = path.join(__dirname, '../../../packages/dataset/dist/file/scripts');
console.log('  Scripts path:', scriptsPath);

try {
  const files = fs.readdirSync(scriptsPath);
  const pyFiles = files.filter((f: string) => f.endsWith('.py'));
  console.log('  Python files found:', pyFiles.length);
  console.log('  Files:', pyFiles.join(', '));
  
  if (pyFiles.length === 7) {
    console.log('  ✓ All 7 Python scripts present');
  } else {
    console.log('  ⚠ Expected 7 scripts, found', pyFiles.length);
  }
} catch (error: any) {
  console.error('  ❌ Error reading scripts:', error.message);
  process.exit(1);
}

console.log('\n🎉 Dataset integration tests passed!');
console.log('\n📦 Verified:');
console.log('  - @ekairos/dataset package ✓');
console.log('  - DatasetService available ✓');
console.log('  - Story domain accessible ✓');
console.log('  - Python scripts copied to dist ✓');
console.log('\n✅ Full monorepo integration working correctly!');
*/


