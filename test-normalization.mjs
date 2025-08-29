import { FileSystemUtils } from './dist/utils/file-system.js';

// Test cases for name normalization
const testCases = [
  { input: 'Pairs Module', expected: 'pairs-module' },
  { input: 'currency_processor', expected: 'currency_processor' },
  { input: 'Trade Engine!@#', expected: 'trade-engine' },
  { input: '  multiple   spaces  ', expected: 'multiple-spaces' },
  { input: 'UPPERCASE-text', expected: 'uppercase-text' },
  { input: 'special--chars--test', expected: 'special-chars-test' },
  { input: '-leading-trailing-', expected: 'leading-trailing' },
  { input: 'Análise do Módulo', expected: 'analise-do-modulo' },
  { input: 'Configuração', expected: 'configuracao' },
  { input: 'Programação', expected: 'programacao' },
  { input: 'Tração', expected: 'tracao' },
  { input: 'São Paulo', expected: 'sao-paulo' },
  { input: '', expected: '' },  // Should fail validation
];

console.log('Testing name normalization...\n');

testCases.forEach(({ input, expected }, index) => {
  try {
    const normalized = FileSystemUtils.normalizeContextName(input);
    const isValid = FileSystemUtils.isValidContextName(normalized);
    
    console.log(`Test ${index + 1}:`);
    console.log(`  Input: "${input}"`);
    console.log(`  Expected: "${expected}"`);
    console.log(`  Normalized: "${normalized}"`);
    console.log(`  Valid: ${isValid}`);
    console.log(`  Result: ${normalized === expected ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
  } catch (error) {
    console.log(`Test ${index + 1}:`);
    console.log(`  Input: "${input}"`);
    console.log(`  Expected: "${expected}"`);
    console.log(`  Error: ${error.message}`);
    console.log(`  Result: ${expected === '' ? '✅ PASS (expected error)' : '❌ FAIL'}`);
    console.log('');
  }
});

// Test filename generation with accents
console.log('Testing filename generation with accents...\n');

const filenameTests = [
  'Análise do Módulo Pairs',
  'Configuração do Sistema',
  'Programação Avançada',
  'São Paulo - Região Metropolitana'
];

filenameTests.forEach((title, index) => {
  const filename = FileSystemUtils.generateMemoryFileName(title);
  console.log(`Filename Test ${index + 1}:`);
  console.log(`  Title: "${title}"`);
  console.log(`  Generated: "${filename}"`);
  console.log('');
});

// Test the full validation function
console.log('Testing full validation...\n');

const validationTests = [
  { input: 'Pairs Module', shouldPass: true },
  { input: 'invalid!!!name', shouldPass: true }, // After normalization becomes "invalidname" which is valid
  { input: '123numbers', shouldPass: true },
  { input: '', shouldPass: false },
  { input: '!!!@@@###', shouldPass: false }, // This should fail as it becomes empty after normalization
];

validationTests.forEach(({ input, shouldPass }, index) => {
  try {
    const result = FileSystemUtils.normalizeAndValidateContext(input, 'context');
    console.log(`Validation Test ${index + 1}:`);
    console.log(`  Input: "${input}"`);
    console.log(`  Result: "${result}"`);
    console.log(`  Status: ${shouldPass ? '✅ PASS' : '❌ FAIL (should have thrown)'}`);
    console.log('');
  } catch (error) {
    console.log(`Validation Test ${index + 1}:`);
    console.log(`  Input: "${input}"`);
    console.log(`  Error: ${error.message}`);
    console.log(`  Status: ${!shouldPass ? '✅ PASS (expected error)' : '❌ FAIL (unexpected error)'}`);
    console.log('');
  }
});
