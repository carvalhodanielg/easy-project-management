# claudio-mcp

Servidor MCP (Model Context Protocol) para o **Claudio**, permitindo controlar espaços, sprints e tarefas via linguagem natural dentro do Claude Code ou qualquer cliente MCP compatível.

## O que é o MCP?

O MCP permite que assistentes de IA como o Claude interajam diretamente com a API do Claudio. Em vez de abrir o browser, você faz perguntas e dá comandos em linguagem natural:

- _"Quais tarefas estão em progresso no espaço X?"_
- _"Cria uma tarefa 'Corrigir bug de login' na sprint atual com prioridade alta"_
- _"Me dá as estatísticas da sprint 3"_
- _"Lista todos os membros do espaço Y"_

## Ferramentas disponíveis

| Ferramenta | Descrição |
|---|---|
| `list_spaces` | Lista todos os espaços disponíveis |
| `list_members` | Lista membros de um espaço |
| `list_sprint_folders` | Lista pastas de sprint com configurações |
| `list_sprints` | Lista sprints de um espaço (filtrável por pasta) |
| `get_sprint_stats` | Estatísticas de uma sprint (burndown, velocidade, distribuição) |
| `create_sprint_folder` | Cria pasta de sprints com cadência automática |
| `update_sprint` | Atualiza nome, datas ou status de uma sprint |
| `list_tasks` | Lista tarefas com filtros (sprint, status, prioridade, responsável) |
| `create_task` | Cria uma tarefa em uma sprint ou lista |
| `update_task` | Atualiza campos de uma tarefa existente |

## Configuração

### 1. Build do servidor

```bash
cd mcp
npm install
npm run build
```

### 2. Criar o arquivo `.mcp.json` na raiz do projeto

Crie o arquivo `/caminho/para/claudio/.mcp.json` com o conteúdo abaixo, substituindo os valores de `CLAUDIO_EMAIL` e `CLAUDIO_PASSWORD` pelas suas credenciais:

```json
{
  "mcpServers": {
    "claudio": {
      "command": "node",
      "args": ["/caminho/para/claudio/mcp/dist/index.js"],
      "env": {
        "CLAUDIO_API_URL": "http://localhost:3000",
        "CLAUDIO_EMAIL": "seu@email.com",
        "CLAUDIO_PASSWORD": "sua_senha"
      }
    }
  }
}
```

> **Importante:** `.mcp.json` está no `.gitignore` pois contém credenciais. Nunca commite esse arquivo.

### 3. Alternativa: usar token de acesso

Se preferir não usar email/senha, passe apenas o token JWT:

```json
{
  "mcpServers": {
    "claudio": {
      "command": "node",
      "args": ["/caminho/para/claudio/mcp/dist/index.js"],
      "env": {
        "CLAUDIO_API_URL": "http://localhost:3000",
        "CLAUDIO_TOKEN": "seu_token_jwt"
      }
    }
  }
}
```

### 4. Reiniciar o Claude Code

Após criar o `.mcp.json`, reinicie o Claude Code. Verifique com `/mcp` — deve aparecer o servidor `claudio` com as ferramentas listadas.

## Clientes compatíveis

O servidor funciona com qualquer cliente que suporte MCP via stdio:

- **Claude Code** (CLI / extensão VS Code / JetBrains)
- **Claude Desktop**
- **Cursor**, **Windsurf** e outros IDEs com suporte MCP

## Desenvolvimento

```bash
npm run dev    # executa com tsx (sem build)
npm run build  # compila para dist/
```

As variáveis de ambiente `CLAUDIO_API_URL`, `CLAUDIO_EMAIL`, `CLAUDIO_PASSWORD` e `CLAUDIO_TOKEN` podem ser definidas no shell ou no `.mcp.json`.
