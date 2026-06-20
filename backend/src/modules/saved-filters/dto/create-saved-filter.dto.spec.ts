import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSavedFilterDto } from './create-saved-filter.dto';

// Mirror the global ValidationPipe options (backend/src/main.ts) so nested
// whitelist rejections are reproduced here.
async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateSavedFilterDto, payload);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('CreateSavedFilterDto', () => {
  it('accepts a name with whitelisted filter fields', async () => {
    const errors = await validateDto({
      name: 'Minhas urgentes',
      filters: { status: ['pendente'], priority: [], groupBy: 'status' },
    });
    expect(errors).toHaveLength(0);
  });

  describe('filters.subtaskMode', () => {
    it.each(['collapsed', 'expanded', 'separated'])(
      'accepts %s',
      async (subtaskMode) => {
        const errors = await validateDto({
          name: 'Com subtarefas',
          filters: { status: ['pendente'], subtaskMode },
        });
        expect(errors).toHaveLength(0);
      },
    );

    it('rejects an unknown subtask mode', async () => {
      const errors = await validateDto({
        name: 'Inválido',
        filters: { subtaskMode: 'nested' },
      });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('filters');
    });
  });
});
