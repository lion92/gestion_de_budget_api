import { Test, TestingModule } from '@nestjs/testing';
import { CategoryImagesService } from './category-images.service';

describe('CategoryImagesService', () => {
  let service: CategoryImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryImagesService],
    }).compile();

    service = module.get<CategoryImagesService>(CategoryImagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
