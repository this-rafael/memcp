#!/usr/bin/env node

/**
 * Demo do Memory Organizer com análise simples
 */

import { promises as fs } from 'fs';
import path from 'path';

async function demonstrateMemoryOrganizer() {
  console.log("🤖 MemCP Memory Organizer - YOLO Mode Demo");
  console.log("==========================================\n");

  const projectPath = "/home/wisiex/work/azify-liquidity-engine";
  const memoryPath = path.join(projectPath, "ia-memory");
  
  try {
    // Check if project has memory
    await fs.access(memoryPath);
    console.log(`📁 Analyzing project: ${projectPath}`);
    
    // Read main memory file
    const mainMemoryFile = path.join(memoryPath, "main.sjson");
    
    try {
      const mainMemoryContent = await fs.readFile(mainMemoryFile, 'utf8');
      const mainMemory = JSON.parse(mainMemoryContent);
      
      console.log("\n📊 ANÁLISE AUTOMÁTICA:");
      console.log(`  - Total de contextos: ${Object.keys(mainMemory.contexts || {}).length}`);
      console.log(`  - Projeto: ${mainMemory.project_name}`);
      console.log(`  - Arquitetura: ${mainMemory.core_info?.architecture || 'N/A'}`);
      
      // Basic analysis
      const contextsCount = Object.keys(mainMemory.contexts || {}).length;
      const hasArchitecture = Boolean(mainMemory.contexts?.["Arquitetura e Padronização"]);
      const hasModules = Boolean(mainMemory.contexts?.["modules"]);
      
      console.log("\n🎯 RECOMENDAÇÕES AUTOMÁTICAS (YOLO):");
      
      if (contextsCount > 8) {
        console.log("  ⚡ ALTA PRIORIDADE: Muitos contextos detectados");
        console.log("     → Sugiro criar contexto 'consolidation' para organizar");
      }
      
      if (hasArchitecture && hasModules) {
        console.log("  🔗 MÉDIA PRIORIDADE: Detectado padrão arquitetural");
        console.log("     → Sugiro criar links entre módulos e arquitetura");
      }
      
      console.log("  📝 BAIXA PRIORIDADE: Criar memória organizacional");
      console.log("     → Índice de navegação para facilitar busca");
      
      // Simulate some organization actions
      console.log("\n🚀 SIMULANDO AÇÕES DO YOLO MODE:");
      console.log("  ✅ Analisando contextos relacionados...");
      console.log("  ✅ Identificando padrões de nomenclatura...");
      console.log("  ✅ Verificando consistência estrutural...");
      
      // Create a simple organizational memory as demo
      const organizationContent = `# 🤖 Memória Organizacional - Criada Automaticamente

## Análise do Sistema
- **Projeto**: ${mainMemory.project_name}
- **Contextos ativos**: ${contextsCount}
- **Última análise**: ${new Date().toISOString()}

## Estrutura Detectada
${hasArchitecture ? '✅ Arquitetura bem definida' : '⚠️ Arquitetura precisa ser melhor estruturada'}
${hasModules ? '✅ Módulos organizados' : '⚠️ Módulos precisam de organização'}

## Próximas Ações Recomendadas
1. Criar links entre memórias relacionadas
2. Consolidar contextos similares
3. Estabelecer hierarquia clara de prioridades

---
*Criado automaticamente pelo Memory Organizer em modo YOLO*`;

      const demoFile = path.join(memoryPath, 'demo-organization.md');
      await fs.writeFile(demoFile, organizationContent, 'utf8');
      
      console.log(`  ✅ Memória organizacional criada: ${demoFile}`);
      
    } catch (fileError) {
      console.log("  ⚠️ Arquivo main.sjson não encontrado - projeto pode não estar inicializado");
    }
    
  } catch (error) {
    console.log(`  ❌ Projeto não tem sistema de memória inicializado: ${projectPath}`);
    console.log("     Execute: memcp init --project-path " + projectPath);
  }
  
  console.log("\n🎉 Demo concluída!");
  console.log("\n💡 Para usar o sistema completo:");
  console.log("   memcp --paths '/path/to/project1,/path/to/project2' --yolo");
}

demonstrateMemoryOrganizer().catch(console.error);
