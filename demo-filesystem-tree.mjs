
console.log('=== Demonstração Avançada: get_filesystem_tree ===\n');

async function demonstrateUseCases() {
  try {
    // Simular uso com um projeto real
    console.log('🔍 **Casos de Uso da Ferramenta get_filesystem_tree**\n');

    console.log('**1. Auditoria de Sistema**');
    console.log('   - Verificar todos os arquivos presentes');
    console.log('   - Identificar arquivos não esperados');
    console.log('   - Validar estrutura de diretórios\n');

    console.log('**2. Análise de Espaço**');
    console.log('   - Encontrar diretórios que ocupam mais espaço');
    console.log('   - Identificar arquivos grandes');
    console.log('   - Calcular uso total de armazenamento\n');

    console.log('**3. Organização e Limpeza**');
    console.log('   - Visualizar hierarquia atual');
    console.log('   - Planejar reorganização');
    console.log('   - Identificar arquivos órfãos\n');

    console.log('**4. Backup e Migração**');
    console.log('   - Mapear todos os arquivos antes da migração');
    console.log('   - Verificar integridade após backup');
    console.log('   - Comparar estruturas entre ambientes\n');

    console.log('**5. Debug e Monitoramento**');
    console.log('   - Identificar arquivos com erro de acesso');
    console.log('   - Monitorar crescimento do sistema');
    console.log('   - Detectar anomalias na estrutura\n');

    console.log('**6. Relatórios Executivos**');
    console.log('   - Estatísticas de uso');
    console.log('   - Distribuição de tipos de arquivo');
    console.log('   - Métricas de crescimento temporal\n');

    console.log('📊 **Exemplo de Análise de Dados:**\n');

    const sampleTree = {
      name: "ia-memory",
      type: "directory",
      file_count: 25,
      total_size: 2458963,
      children: [
        {
          name: "memories",
          type: "directory",
          file_count: 20,
          total_size: 2350000,
          children: [
            {
              name: "projeto-alpha",
              type: "directory", 
              file_count: 8,
              total_size: 1200000
            },
            {
              name: "projeto-beta",
              type: "directory",
              file_count: 12,
              total_size: 1150000
            }
          ]
        },
        {
          name: "index.db",
          type: "file",
          file_type: "database",
          size: 98304
        },
        {
          name: "submemories",
          type: "directory",
          file_count: 3,
          total_size: 8659
        }
      ]
    };

    console.log('**Análises Possíveis:**\n');

    // 1. Distribuição de espaço
    console.log('✅ **Distribuição de Espaço:**');
    console.log(`   - Memórias: ${(2350000/2458963*100).toFixed(1)}% (${formatBytes(2350000)})`);
    console.log(`   - Banco de dados: ${(98304/2458963*100).toFixed(1)}% (${formatBytes(98304)})`);
    console.log(`   - Submemórias: ${(8659/2458963*100).toFixed(1)}% (${formatBytes(8659)})`);
    console.log('');

    // 2. Densidade de projetos
    console.log('✅ **Densidade de Projetos:**');
    console.log(`   - Projeto Alpha: ${8} arquivos (${formatBytes(1200000/8)} por arquivo)`);
    console.log(`   - Projeto Beta: ${12} arquivos (${formatBytes(1150000/12)} por arquivo)`);
    console.log('');

    // 3. Crescimento e capacidade
    console.log('✅ **Métricas de Sistema:**');
    console.log(`   - Total de arquivos: ${25}`);
    console.log(`   - Tamanho total: ${formatBytes(2458963)}`);
    console.log(`   - Tamanho médio por arquivo: ${formatBytes(2458963/25)}`);
    console.log(`   - Projetos ativos: 2`);
    console.log('');

    console.log('📋 **JSON de Resposta Real:**\n');
    console.log('```json');
    console.log(JSON.stringify(sampleTree, null, 2));
    console.log('```\n');

    console.log('🎯 **Integração com Outras Ferramentas:**\n');
    console.log('- **get_memory_tree**: Estrutura lógica de contextos');
    console.log('- **get_filesystem_tree**: Estrutura física de arquivos');
    console.log('- **search_memories**: Busca por conteúdo');
    console.log('- **stats**: Estatísticas agregadas do sistema\n');

    console.log('✅ **A ferramenta get_filesystem_tree oferece:**');
    console.log('- 📁 Visibilidade completa da estrutura física');
    console.log('- 📊 Informações detalhadas de tamanho e tipo');
    console.log('- 🔍 Capacidade de auditoria e análise');
    console.log('- 🚀 Formato JSON para automação');
    console.log('- ⚡ Performance otimizada para sistemas grandes');

  } catch (error) {
    console.error('❌ Erro na demonstração:', error);
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

demonstrateUseCases();
