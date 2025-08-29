import * as fs from 'fs/promises';
import * as path from 'path';
import { NavigationTools } from './dist/tools/navigation.tool.js';

console.log('=== Teste da Ferramenta get_filesystem_tree ===\n');

// Função para criar estrutura de teste
async function createTestStructure(basePath) {
  const memoryPath = path.join(basePath, 'ia-memory');
  
  // Criar estrutura de diretórios
  await fs.mkdir(path.join(memoryPath, 'memories', 'projeto-web', 'frontend'), { recursive: true });
  await fs.mkdir(path.join(memoryPath, 'memories', 'projeto-web', 'backend'), { recursive: true });
  await fs.mkdir(path.join(memoryPath, 'memories', 'configuracao'), { recursive: true });
  await fs.mkdir(path.join(memoryPath, 'submemories'), { recursive: true });
  await fs.mkdir(path.join(memoryPath, 'links'), { recursive: true });

  // Criar arquivos de exemplo
  await fs.writeFile(path.join(memoryPath, 'main.sjson'), JSON.stringify({
    project_name: "Teste",
    contexts: {
      "projeto-web": { priority: 1 },
      "configuracao": { priority: 2 }
    }
  }, null, 2));

  await fs.writeFile(path.join(memoryPath, 'memories', 'projeto-web', 'frontend', '20250829T100000-componentes-react.md'), 
    '---\ntitle: Componentes React\ncontext: projeto-web\nsubcontext: frontend\n---\n# Componentes React\n\nConteúdo sobre componentes...');

  await fs.writeFile(path.join(memoryPath, 'memories', 'projeto-web', 'backend', '20250829T100001-api-rest.md'), 
    '---\ntitle: API REST\ncontext: projeto-web\nsubcontext: backend\n---\n# API REST\n\nConteúdo sobre API...');

  await fs.writeFile(path.join(memoryPath, 'memories', 'configuracao', '20250829T100002-configuracao-docker.md'), 
    '---\ntitle: Configuração Docker\ncontext: configuracao\n---\n# Docker\n\nConteúdo sobre Docker...');

  // Não criar arquivo de banco fake - deixar o sistema criar
  await fs.writeFile(path.join(memoryPath, 'submemories', 'submemory1.sjson'), '{}');
  await fs.writeFile(path.join(memoryPath, 'links', 'projeto-web.csv'), 'header1,header2\nvalue1,value2');

  return memoryPath;
}

async function runTest() {
  try {
    const testPath = '/tmp/test-filesystem-tree';
    
    // Limpar diretório se existir
    try {
      await fs.rm(testPath, { recursive: true, force: true });
    } catch {}

    console.log('1. Criando estrutura de teste...');
    const memoryPath = await createTestStructure(testPath);
    console.log(`✅ Estrutura criada em: ${memoryPath}\n`);

    console.log('2. Executando get_filesystem_tree...');
    const navigation = new NavigationTools(memoryPath);
    await navigation.initialize();
    
    const fsTree = await navigation.getFileSystemTree();
    
    console.log('3. Resultado da árvore de arquivos:\n');
    console.log(JSON.stringify(fsTree, null, 2));
    
    console.log('\n4. Estatísticas:');
    console.log(`- Total de arquivos: ${fsTree.file_count || 0}`);
    console.log(`- Tamanho total: ${(fsTree.total_size || 0)} bytes`);
    console.log(`- Diretórios encontrados: ${countDirectories(fsTree)}`);
    console.log(`- Tipos de arquivo encontrados: ${getFileTypes(fsTree).join(', ')}`);

    navigation.close();
    
    // Limpar
    await fs.rm(testPath, { recursive: true, force: true });
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

function countDirectories(node) {
  let count = 0;
  if (node.type === 'directory') {
    count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += countDirectories(child);
      }
    }
  }
  return count;
}

function getFileTypes(node, types = new Set()) {
  if (node.type === 'file' && node.file_type) {
    types.add(node.file_type);
  }
  if (node.children) {
    for (const child of node.children) {
      getFileTypes(child, types);
    }
  }
  return Array.from(types);
}

console.log('Funcionalidades da nova ferramenta get_filesystem_tree:');
console.log('');
console.log('✅ Estrutura hierárquica completa do sistema de memória');
console.log('✅ Informações de cada arquivo: nome, tipo, tamanho, extensão');
console.log('✅ Contagem de arquivos e tamanho total por diretório');
console.log('✅ Classificação automática de tipos de arquivo');
console.log('✅ Timestamps de última modificação');
console.log('✅ Tratamento de erros para arquivos inacessíveis');
console.log('✅ Controle de profundidade para evitar recursão infinita');
console.log('✅ Formato JSON padronizado para fácil consumo');
console.log('');

runTest();
