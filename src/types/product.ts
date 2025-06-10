// Base Product Types from Prisma Schema
export type Product = {
  id: string;
  name: string;
  website: string;
  positioning: string;
  customerData: string;
  userProblem: string;
  industry: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductSnapshot = {
  id: string;
  productId: string;
  content: any; // JSON type
  metadata: any; // JSON type
  createdAt: Date;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

// API Input Types
export type CreateProductInput = {
  name: string;
  website: string;
  positioning: string;
  customerData: string;
  userProblem: string;
  industry: string;
  projectId: string;
};

export type UpdateProductInput = Partial<Omit<CreateProductInput, 'projectId'>>;

export type CreateProductSnapshotInput = {
  productId: string;
  content: any;
  metadata: any;
};

// Enhanced Product Types with Relations
export type ProductWithProject = Product & {
  project: Project;
};

export type ProductWithSnapshots = Product & {
  snapshots: ProductSnapshot[];
};

export type ProductWithProjectAndSnapshots = Product & {
  project: Project;
  snapshots: ProductSnapshot[];
};

// Repository Interface Types
export interface ProductRepository {
  create(productData: CreateProductInput): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findByProjectId(projectId: string): Promise<Product | null>;
  findWithProject(id: string): Promise<ProductWithProject | null>;
  findWithSnapshots(id: string): Promise<ProductWithSnapshots | null>;
  findWithProjectAndSnapshots(id: string): Promise<ProductWithProjectAndSnapshots | null>;
  update(id: string, updates: UpdateProductInput): Promise<Product>;
  delete(id: string): Promise<void>;
  list(): Promise<Product[]>;
}

export interface ProductSnapshotRepository {
  create(snapshotData: CreateProductSnapshotInput): Promise<ProductSnapshot>;
  findById(id: string): Promise<ProductSnapshot | null>;
  findLatestByProductId(productId: string): Promise<ProductSnapshot | null>;
  findByProductId(productId: string, limit?: number): Promise<ProductSnapshot[]>;
  delete(id: string): Promise<void>;
  list(): Promise<ProductSnapshot[]>;
}

// API Request/Response Types
export interface CreateProductRequest {
  name: string;
  website: string;
  positioning: string;
  customerData: string;
  userProblem: string;
  industry: string;
  projectId: string;
}

export interface UpdateProductRequest {
  name?: string;
  website?: string;
  positioning?: string;
  customerData?: string;
  userProblem?: string;
  industry?: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  website: string;
  positioning: string;
  customerData: string;
  userProblem: string;
  industry: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSnapshotResponse {
  id: string;
  productId: string;
  content: any;
  metadata: any;
  createdAt: string;
}

// Error Types
export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product with id ${id} not found`);
    this.name = 'ProductNotFoundError';
  }
}

export class ProductSnapshotNotFoundError extends Error {
  constructor(id: string) {
    super(`Product snapshot with id ${id} not found`);
    this.name = 'ProductSnapshotNotFoundError';
  }
}

export class InvalidProductDataError extends Error {
  constructor(message: string) {
    super(`Invalid product data: ${message}`);
    this.name = 'InvalidProductDataError';
  }
} 