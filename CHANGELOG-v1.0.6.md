# Correção da Normalização de Acentos - v1.0.6

## Problema Identificado

O sistema memcp estava falhando ao tentar ler arquivos de memória devido a um problema na normalização de caracteres especiais e acentos.

### Exemplo do Problema:

- **Título original**: "Análise do Módulo Pairs"
- **Normalização problemática**: "anlise-do-mdulo-pairs" (acentos removidos)
- **Arquivo esperado**: `2025082970365625-anlise-do-mdulo-pairs.md`
- **Resultado**: Arquivo não encontrado porque os acentos foram mal processados

## Correções Implementadas

### 1. Nova Função `removeAccents()`

Adicionada uma função específica para converter acentos em seus equivalentes ASCII:

```typescript
static removeAccents(text: string): string {
  const accentMap: { [key: string]: string } = {
    // Vogais minúsculas
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    // Consoantes
    'ç': 'c', 'Ç': 'C',
    'ñ': 'n', 'Ñ': 'N',
    // E outros...
  };
}
```

### 2. Atualização das Funções de Normalização

#### `generateMemoryFileName()`

- Agora usa `removeAccents()` antes da normalização
- Converte "Análise do Módulo" → "analise-do-modulo"

#### `normalizeContextName()`

- Também usa `removeAccents()` para consistência
- Garante que contextos e subcontextos sejam normalizados corretamente

### 3. Melhor Tratamento de Erros

A função `memoryRead()` agora fornece informações de debug mais úteis:

- Mostra o caminho completo do arquivo tentado
- Lista arquivos similares no diretório
- Ajuda a identificar problemas de nomenclatura

## Resultados dos Testes

### Antes da Correção:

```
"Análise do Módulo" → "anlise-do-mdulo" ❌
```

### Após a Correção:

```
"Análise do Módulo" → "analise-do-modulo" ✅
"Configuração" → "configuracao" ✅
"São Paulo" → "sao-paulo" ✅
"Programação" → "programacao" ✅
```

## Caracteres Suportados

A normalização agora suporta corretamente:

- **Acentos**: á, à, ã, â, é, ê, í, ó, ô, õ, ú, ü
- **Cedilha**: ç
- **Til**: ñ
- **Trema**: ä, ë, ï, ö, ü
- **Ligaduras**: æ, œ
- **Caracteres especiais**: ß, ø

## Compatibilidade

- ✅ Mantém compatibilidade com nomes existentes sem acentos
- ✅ Suporta nomes com acentos português/espanhol/francês/alemão
- ✅ Normalização consistente entre criação e leitura de arquivos
- ✅ Melhor debugging quando arquivos não são encontrados

## Impacto

Esta correção resolve completamente o erro de leitura de memórias com acentos, permitindo que o sistema funcione corretamente com textos em português e outros idiomas que usam caracteres acentuados.
