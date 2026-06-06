import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePreferencesDto } from './update-preferences.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdatePreferencesDto, payload);
  return validate(dto);
}

describe('UpdatePreferencesDto', () => {
  it('accepts an empty payload (all fields optional)', async () => {
    expect(await validateDto({})).toHaveLength(0);
  });

  describe('theme', () => {
    it.each(['light', 'dark'])('accepts %s', async (theme) => {
      expect(await validateDto({ theme })).toHaveLength(0);
    });

    it('rejects an unknown theme', async () => {
      const errors = await validateDto({ theme: 'purple' });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('theme');
    });
  });

  describe('taskGroupBy', () => {
    it.each(['none', 'status', 'assignee'])(
      'accepts %s',
      async (taskGroupBy) => {
        expect(await validateDto({ taskGroupBy })).toHaveLength(0);
      },
    );

    it('rejects an unknown grouping', async () => {
      const errors = await validateDto({ taskGroupBy: 'priority' });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('taskGroupBy');
    });
  });

  describe('taskSubtaskMode', () => {
    it.each(['collapsed', 'expanded', 'separated'])(
      'accepts %s',
      async (taskSubtaskMode) => {
        expect(await validateDto({ taskSubtaskMode })).toHaveLength(0);
      },
    );

    it('rejects an unknown subtask mode', async () => {
      const errors = await validateDto({ taskSubtaskMode: 'nested' });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('taskSubtaskMode');
    });
  });
});
