import { Test, TestingModule } from '@nestjs/testing';
import { EnvelopesController } from './envelopes.controller';

describe('EnvelopesController', () => {
  let controller: EnvelopesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnvelopesController],
    }).compile();

    controller = module.get<EnvelopesController>(EnvelopesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
