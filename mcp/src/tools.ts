import { type Tool } from '@modelcontextprotocol/sdk/types.js';
import { http, unwrap } from './client.js';

// ── Tool definitions ──────────────────────────────────────────────────────────

export const TOOLS: Tool[] = [
  {
    name: 'list_spaces',
    description: 'Lista todos os espaços disponíveis. Use para obter os IDs dos espaços antes de chamar outras ferramentas.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_members',
    description: 'Lista os membros de um espaço com nome, email e papel (editor/viewer).',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: { type: 'string', description: 'ID do espaço' },
      },
      required: ['spaceId'],
    },
  },
  {
    name: 'list_sprint_folders',
    description: 'Lista as pastas de sprint de um espaço com suas configurações (dia de início, duração, auto-fechar, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: { type: 'string', description: 'ID do espaço' },
      },
      required: ['spaceId'],
    },
  },
  {
    name: 'list_sprints',
    description: 'Lista as sprints de um espaço. Pode filtrar por pasta. Retorna número, nome, datas e status.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId:  { type: 'string', description: 'ID do espaço' },
        folderId: { type: 'string', description: 'Filtra por pasta de sprint (opcional)' },
      },
      required: ['spaceId'],
    },
  },
  {
    name: 'get_sprint_stats',
    description: 'Retorna estatísticas de uma sprint: total de tarefas, concluídas, story points, burndown, velocidade vs sprint anterior e distribuição por responsável.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId:  { type: 'string', description: 'ID do espaço' },
        sprintId: { type: 'string', description: 'ID da sprint' },
      },
      required: ['spaceId', 'sprintId'],
    },
  },
  {
    name: 'create_sprint_folder',
    description: 'Cria uma pasta de sprints com cadência automática. As primeiras sprints são geradas imediatamente.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId:          { type: 'string', description: 'ID do espaço' },
        name:             { type: 'string', description: 'Nome da pasta (ex: "Sprint Quinzenal")' },
        startDayOfWeek:   { type: 'number', description: '0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb' },
        durationWeeks:    { type: 'number', description: 'Duração de cada sprint em semanas' },
        autoComplete:     { type: 'boolean', description: 'Fechar sprint automaticamente ao atingir a data de término' },
        openFutureSprints:{ type: 'number', description: 'Quantas sprints futuras manter abertas simultaneamente' },
        folderEndDate:    { type: 'string', description: 'Data limite ISO para encerrar a pasta (opcional, ex: "2026-12-31")' },
      },
      required: ['spaceId', 'name', 'startDayOfWeek', 'durationWeeks', 'autoComplete', 'openFutureSprints'],
    },
  },
  {
    name: 'update_sprint',
    description: 'Atualiza nome, datas ou status de uma sprint.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId:   { type: 'string', description: 'ID do espaço' },
        sprintId:  { type: 'string', description: 'ID da sprint' },
        name:      { type: 'string' },
        startDate: { type: 'string', description: 'Data ISO (YYYY-MM-DD)' },
        endDate:   { type: 'string', description: 'Data ISO (YYYY-MM-DD)' },
        status:    { type: 'string', enum: ['planning', 'active', 'completed'] },
      },
      required: ['spaceId', 'sprintId'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Lista tarefas de um espaço. Suporta filtros por sprint, lista, status, prioridade, responsável e busca textual.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId:   { type: 'string', description: 'ID do espaço' },
        sprintId:  { type: 'string', description: 'Filtra por sprint' },
        listId:    { type: 'string', description: 'Filtra por lista' },
        status:    {
          type: 'array',
          items: { type: 'string', enum: ['pendente', 'em_progresso', 'em_review', 'feito', 'fechado'] },
          description: 'Filtra por status (pode passar múltiplos)',
        },
        priority:  {
          type: 'array',
          items: { type: 'string', enum: ['urgente', 'alta', 'normal', 'baixa'] },
          description: 'Filtra por prioridade',
        },
        assignees: { type: 'array', items: { type: 'string' }, description: 'IDs de usuários responsáveis' },
        q:         { type: 'string', description: 'Busca textual pelo nome da tarefa' },
      },
      required: ['spaceId'],
    },
  },
  {
    name: 'create_task',
    description: 'Cria uma tarefa. Deve pertencer a uma sprint OU a uma lista.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId:     { type: 'string', description: 'ID do espaço' },
        name:        { type: 'string', description: 'Nome da tarefa' },
        description: { type: 'string', description: 'Descrição (opcional)' },
        sprintId:    { type: 'string', description: 'ID da sprint (exclusivo com listId)' },
        listId:      { type: 'string', description: 'ID da lista (exclusivo com sprintId)' },
        status:      { type: 'string', enum: ['pendente', 'em_progresso', 'em_review', 'feito', 'fechado'] },
        priority:    { type: 'string', enum: ['urgente', 'alta', 'normal', 'baixa'] },
        assignees:   { type: 'array', items: { type: 'string' }, description: 'IDs dos responsáveis' },
        startDate:   { type: 'string', description: 'Data ISO (YYYY-MM-DD)' },
        dueDate:     { type: 'string', description: 'Data de vencimento ISO (YYYY-MM-DD)' },
        storyPoints: { type: 'number', description: 'Pontos Fibonacci: 1, 2, 3, 5, 8, 13, 21, 34, 55 ou 89' },
      },
      required: ['spaceId', 'name'],
    },
  },
  {
    name: 'update_task',
    description: 'Atualiza campos de uma tarefa existente: nome, status, prioridade, responsáveis, datas ou story points.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId:     { type: 'string', description: 'ID do espaço' },
        taskId:      { type: 'string', description: 'ID da tarefa' },
        name:        { type: 'string' },
        description: { type: 'string' },
        status:      { type: 'string', enum: ['pendente', 'em_progresso', 'em_review', 'feito', 'fechado'] },
        priority:    { type: 'string', enum: ['urgente', 'alta', 'normal', 'baixa'] },
        assignees:   { type: 'array', items: { type: 'string' }, description: 'IDs dos responsáveis' },
        startDate:   { type: 'string', description: 'Data ISO ou null para remover' },
        dueDate:     { type: 'string', description: 'Data ISO ou null para remover' },
        storyPoints: { type: 'number', description: 'Pontos Fibonacci ou null para remover' },
      },
      required: ['spaceId', 'taskId'],
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────

type Args = Record<string, unknown>;

export async function callTool(name: string, args: Args): Promise<string> {
  switch (name) {

    case 'list_spaces': {
      const spaces = unwrap(await http.get('/spaces'));
      return JSON.stringify(spaces, null, 2);
    }

    case 'list_members': {
      const { spaceId } = args as { spaceId: string };
      const members = unwrap(await http.get(`/spaces/${spaceId}/members`));
      return JSON.stringify(members, null, 2);
    }

    case 'list_sprint_folders': {
      const { spaceId } = args as { spaceId: string };
      const folders = unwrap(await http.get(`/spaces/${spaceId}/sprint-folders`));
      return JSON.stringify(folders, null, 2);
    }

    case 'list_sprints': {
      const { spaceId, folderId } = args as { spaceId: string; folderId?: string };
      const allSprints = unwrap<unknown[]>(await http.get(`/spaces/${spaceId}/sprints`));
      const result = folderId
        ? allSprints.filter((s: any) => s.folderId === folderId)
        : allSprints;
      return JSON.stringify(result, null, 2);
    }

    case 'get_sprint_stats': {
      const { spaceId, sprintId } = args as { spaceId: string; sprintId: string };
      const stats = unwrap(await http.get(`/spaces/${spaceId}/sprints/${sprintId}/stats`));
      return JSON.stringify(stats, null, 2);
    }

    case 'create_sprint_folder': {
      const { spaceId, ...payload } = args as { spaceId: string } & Record<string, unknown>;
      const folder = unwrap(await http.post(`/spaces/${spaceId}/sprint-folders`, payload));
      return JSON.stringify(folder, null, 2);
    }

    case 'update_sprint': {
      const { spaceId, sprintId, ...payload } = args as { spaceId: string; sprintId: string } & Record<string, unknown>;
      const sprint = unwrap(await http.patch(`/spaces/${spaceId}/sprints/${sprintId}`, payload));
      return JSON.stringify(sprint, null, 2);
    }

    case 'list_tasks': {
      const { spaceId, ...filters } = args as { spaceId: string } & Record<string, unknown>;
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) {
        if (Array.isArray(v)) v.forEach((item) => params.append(k, String(item)));
        else if (v !== undefined) params.set(k, String(v));
      }
      const tasks = unwrap(await http.get(`/spaces/${spaceId}/tasks?${params.toString()}`));
      return JSON.stringify(tasks, null, 2);
    }

    case 'create_task': {
      const { spaceId, ...payload } = args as { spaceId: string } & Record<string, unknown>;
      const task = unwrap(await http.post(`/spaces/${spaceId}/tasks`, payload));
      return JSON.stringify(task, null, 2);
    }

    case 'update_task': {
      const { spaceId, taskId, ...payload } = args as { spaceId: string; taskId: string } & Record<string, unknown>;
      const task = unwrap(await http.patch(`/spaces/${spaceId}/tasks/${taskId}`, payload));
      return JSON.stringify(task, null, 2);
    }

    default:
      throw new Error(`Tool desconhecida: ${name}`);
  }
}
