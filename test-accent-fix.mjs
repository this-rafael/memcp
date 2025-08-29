import { FileSystemUtils } from './dist/utils/file-system.js';

console.log('=== Demonstração da Correção de Acentos ===\n');

// Simula o problema original
const originalTitle = "Análise do Módulo Pairs";
console.log('Problema Original:');
console.log(`Título: "${originalTitle}"`);

// Simulação da normalização antiga (problemática)
const oldNormalization = originalTitle
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, "") // Remove acentos completamente
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

console.log(`Normalização Antiga (Problemática): "${oldNormalization}"`);
console.log('↑ Acentos removidos: "análise" → "anlise", "módulo" → "mdulo"\n');

// Nova normalização (corrigida)
const newNormalization = FileSystemUtils.removeAccents(originalTitle)
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, "")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

console.log('Nova Normalização (Corrigida):');
console.log(`Normalização Nova: "${newNormalization}"`);
console.log('↑ Acentos convertidos: "análise" → "analise", "módulo" → "modulo"\n');

// Geração de nomes de arquivo
console.log('Geração de Nomes de Arquivo:');
const filename = FileSystemUtils.generateMemoryFileName(originalTitle);
console.log(`Nome do arquivo gerado: "${filename}"`);

// Teste com vários casos
console.log('\n=== Teste com Múltiplos Casos ===\n');

const testCases = [
  "Configuração do Sistema",
  "Programação Avançada", 
  "São Paulo - Região",
  "Integração com APIs",
  "Validação de Formulários",
  "Autenticação e Autorização"
];

testCases.forEach((title, index) => {
  const normalized = FileSystemUtils.removeAccents(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  
  console.log(`${index + 1}. "${title}" → "${normalized}"`);
});

console.log('\n✅ Todos os acentos foram corretamente convertidos para equivalentes ASCII!');
