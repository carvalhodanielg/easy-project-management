# Busca global por equivalência (substring + sem acento) em todo o espaço

> **Status:** planejado (não implementado). Plano de implementação detalhado.
> Decisões tomadas com o usuário: matching = **substring + sem acento**; campos = **nome + descrição**.

## Context

Hoje a busca global (`GET /spaces/:spaceId/search`, Cmd+K) e o filtro de tarefas
espaço-amplo usam o índice `$text` do MongoDB, que só casa **palavra inteira**
(+ stemming). Buscar "amarr" não encontra "Amarração", e "amarracao" (sem acento)
também não encontra. O objetivo é que a busca encontre tarefas em **todo o
espaço** por **equivalência**: casamento de **substring** e **insensível a
acento/maiúsculas**, considerando **nome + descrição**.

O MongoDB self-hosted (Docker) não tem `unaccent` em `$regex` nem aplica collation
a regex, então não dá para remover acentos "on the fly". A solução é manter um
campo normalizado persistido (`searchText`) e buscar por substring nele, limitado
pelo índice `spaceId` que já existe (mesma estratégia já usada pela busca
contextual de sprint/lista — ver `tasks-filter.service.ts:142-146`).

Resultado esperado: as três trilhas de busca passam a casar substring + sem acento,
sobre nome+descrição, mantendo performance aceitável (varredura limitada pelo
`spaceId`). Sem mudanças no frontend.

## Trade-offs conhecidos (por que não está implementado ainda)

- **Performance:** `$regex` não-ancorado não usa índice B-tree; o `spaceId` apenas
  limita o escopo, mas dentro do espaço é collection scan. Aceitável para a escala
  atual (centenas/poucos milhares de tarefas por espaço); degrada com volume alto.
  Foi a performance que motivou a migração para `$text` (commit `96ac93f`).
- **Custo de escrita/armazenamento:** `searchText` duplica nome+descrição em cada
  doc; updates de nome/descrição passam a fazer um `findOne` extra no hook.
- **Risco de dessincronização:** todo caminho de escrita precisa recalcular
  `searchText`; um update por caminho não coberto pelo plugin deixa o campo stale
  silenciosamente.
- **Backfill é migração:** se esquecida em prod, tarefas antigas somem da busca sem
  erro.
- **Perde stemming/ranking** que o `$text` dava de graça; não tolera erro de
  digitação.

### Alternativas avaliadas
| Abordagem | Substring | Sem acento | Escala | Complexidade |
|---|---|---|---|---|
| **Esta (regex + searchText)** | ✅ | ✅ | ⚠️ média | baixa |
| Índice n-gram/trigram (campo tokenizado + `$text`) | ✅ | ✅ | ✅ alta | alta |
| Atlas Search (`$search`, fuzzy/autocomplete) | ✅ | ✅ + typo | ✅ alta | exige migrar p/ Atlas |
| Prefixo ancorado (`/^termo/` + índice) | só prefixo | precisa campo norm. | ✅ usa índice | baixa |

## Approach

### 1. Utilitário de normalização (novo)
`backend/src/common/utils/normalize-search-text.ts`
```ts
export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')                 // separa diacríticos
    .replace(/[̀-ͯ]/g, '')  // remove acentos
    .toLowerCase()
    .trim();
}
```
Reutilizar `escapeRegExp` existente (`backend/src/common/utils/escape-regexp.ts`)
para escapar o termo antes de virar regex.

### 2. Plugin de schema que mantém `searchText` (novo)
`backend/src/common/mongoose/search-text.plugin.ts` — função
`searchTextPlugin(schema, { fields: ['name', 'description'] })` que:
- Registra `pre('save')`: `this.searchText = normalizeSearchText(fields.join(' '))`.
  Cobre todos os `.create(...)` (create, bulkDuplicate, duplicateSubtask) e
  `doc.save()` (restore).
- Registra `pre('findOneAndUpdate')` e `pre('updateOne')`: lê o update
  (`$set` ou top-level); se tocar `name`/`description`, busca o doc atual
  (`this.model.findOne(this.getQuery())`), mescla os valores e grava
  `searchText` no mesmo update. `updateMany` (bulkPatch) não mexe em
  nome/descrição, então não precisa de hook.

Isso centraliza a lógica e evita tocar em cada call-site de criação.

### 3. Campo `searchText` nos schemas
Adicionar `@Prop({ default: '', select: false })  searchText: string;` e aplicar
o plugin em:
- `backend/src/modules/tasks/schemas/task.schema.ts` → `fields: ['name','description']`
- `backend/src/modules/notes/schemas/note.schema.ts` → `fields: ['title','content']`
- `backend/src/modules/wiki/schemas/wiki-document.schema.ts` → `fields: ['title','content']`

`select: false` mantém o payload limpo (o campo só serve para filtrar).

**Índices:** os três índices `$text` (`name:'text'` / `title:'text'`) ficam sem uso
e devem ser **removidos**. A varredura por regex em `searchText` fica limitada pelo
índice `spaceId` já existente — não é necessário índice novo (regex não-ancorado não
usa B-tree de qualquer forma). Se a escala crescer muito, um índice n-gram pode ser
adicionado depois.

### 4. Trocar as consultas para regex em `searchText`
- `backend/src/modules/search/search.service.ts:43,46-63`: substituir
  `const text = { $text: { $search: q.trim() } }` por
  `const rx = { $regex: escapeRegExp(normalizeSearchText(q)), $options: 'i' }` e
  usar `{ spaceId: oid, searchText: rx }` nas três queries (task/note/wiki).
- `backend/src/modules/tasks/tasks-filter.service.ts:141-153`: unificar os dois
  ramos (contextual `name` regex **e** espaço-amplo `$text`) em um só:
  `match.searchText = { $regex: escapeRegExp(normalizeSearchText(term)), $options: 'i' }`.
  Manter as variáveis `contextual`/`substringSearch` e a lógica de inclusão de
  subtarefas (`linha 100-105`) **inalteradas** — só muda a construção do termo.
  (Isso também elimina a restrição de `$text` precisar ser o 1º estágio do
  pipeline, mencionada no comentário das linhas 148-150.)

### 5. Backfill dos documentos existentes (novo script)
`backend/src/scripts/backfill-search-text.ts` — usa
`NestFactory.createApplicationContext(AppModule)`, e para cada coleção
(tasks/notes/wiki) faz `bulkWrite` calculando `searchText` com `normalizeSearchText`
a partir dos campos relevantes. Adicionar npm script `backfill:search-text` no
`backend/package.json`. Rodar uma vez em dev (e em prod no deploy).

## Arquivos a modificar/criar
- **Novos:** `common/utils/normalize-search-text.ts`,
  `common/mongoose/search-text.plugin.ts`, `scripts/backfill-search-text.ts`
- **Editar:** `tasks/schemas/task.schema.ts`, `notes/schemas/note.schema.ts`,
  `wiki/schemas/wiki-document.schema.ts`, `search/search.service.ts`,
  `tasks/tasks-filter.service.ts`, `backend/package.json`
- **Frontend:** nenhuma mudança (comportamento melhora transparentemente;
  `GlobalSearch.tsx` mantém o mínimo de 2 caracteres).

## Testes (TDD — escrever antes)
1. `common/utils/normalize-search-text.spec.ts` (novo): minúsculas, remove acentos
   (`á→a`, `ç→c`, `ã→a`, `ê→e`, `ú→u`), trim.
2. `common/mongoose/search-text.plugin.spec.ts` (novo): no `save`, `searchText` =
   normalização de nome+descrição; no `findOneAndUpdate` que muda só a descrição,
   recomputa mesclando com o nome atual.
3. `search/search.service.spec.ts` (atualizar `linhas 73-84`): asserções passam de
   `$text` para `searchText: { $regex }`; query normalizada/escapada. Adicionar caso:
   `"amarracao"` gera regex `amarracao` (casaria "Amarração").
4. `tasks/tasks-filter.service.spec.ts` (atualizar `linhas 135-194`): tanto
   espaço-amplo quanto contextual passam a usar `searchText` regex com termo
   normalizado; manter o teste de escape de metacaracteres e o de inclusão de
   subtarefa.
5. `test/tasks.e2e-spec.ts` (atualizar `linhas 59-226`): remover `taskModel.init()`
   do índice de texto; criar tarefa "Amarração" com descrição e validar que busca
   global por `"amarr"` (substring), `"amarracao"` (sem acento) e por uma palavra da
   **descrição** retornam a tarefa; palavra inexistente não retorna.

## Verificação end-to-end
1. `cd backend && npm run test` — unit verde (rodar arquivos novos/alterados).
2. `cd backend && npm run test:e2e -- --testPathPattern=tasks` — e2e de busca verde.
3. `docker compose up --build` e rodar o backfill:
   `cd backend && npm run backfill:search-text`.
4. Manual: criar tarefa "Amarração"; no Cmd+K buscar `amarr`, `amarracao`, e uma
   palavra da descrição → tarefa aparece. Buscar dentro de uma lista/sprint pelos
   mesmos termos → também aparece. Confirmar que `searchText` não vaza no payload
   das listagens (`select: false`).
5. `cd backend && npm run lint` e `npm run build`.
