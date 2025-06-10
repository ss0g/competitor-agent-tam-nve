// Product Repository Exports
export { PrismaProductRepository, productRepository } from './productRepository';
export { PrismaProductSnapshotRepository, productSnapshotRepository } from './productSnapshotRepository';

// Re-export types for convenience
export type {
  Product,
  ProductSnapshot,
  CreateProductInput,
  UpdateProductInput,
  CreateProductSnapshotInput,
  ProductWithProject,
  ProductWithSnapshots,
  ProductWithProjectAndSnapshots,
  ProductRepository,
  ProductSnapshotRepository,
  ProductNotFoundError,
  ProductSnapshotNotFoundError,
  InvalidProductDataError
} from '../../types/product'; 