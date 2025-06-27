import { Test, TestingModule } from '@nestjs/testing';
import { CategoryImagesController } from './category-images.controller';

describe('CategoryImagesController', () => {
  let controller: CategoryImagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryImagesController],
    }).compile();

    controller = module.get<CategoryImagesController>(CategoryImagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
