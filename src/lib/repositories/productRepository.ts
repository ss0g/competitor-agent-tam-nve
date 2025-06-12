import { PrismaClient } from '@prisma/client';
import {
  ProductRepository,
  CreateProductInput,
  UpdateProductInput,
  ProductWithProject,
  ProductWithSnapshots,
  ProductWithProjectAndSnapshots,
  ProductNotFoundError,
  InvalidProductDataError,
  Product
} from '../../types/product';
import { prisma } from '../prisma';

export class PrismaProductRepository implements ProductRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  async create(productData: CreateProductInput): Promise<Product> {
    try {
      // Validate input data
      this.validateProductData(productData);

      // Check if project exists
      const project = await this.prisma.project.findUnique({
        where: { id: productData.projectId }
      });

      if (!project) {
        throw new InvalidProductDataError(`Project with id ${productData.projectId} not found`);
      }

      // Check if product already exists for this project
      const existingProduct = await this.prisma.product.findFirst({
        where: { projectId: productData.projectId }
      });

      if (existingProduct) {
        throw new InvalidProductDataError(`Product already exists for project ${productData.projectId}`);
      }

      const product = await this.prisma.product.create({
        data: productData
      });

      return product as Product;
    } catch (error) {
      if (error instanceof InvalidProductDataError) {
        throw error;
      }
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<Product | null> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id }
      });

      return product as Product | null;
    } catch (error) {
      throw new Error(`Failed to find product by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByProjectId(projectId: string): Promise<Product | null> {
    try {
      const product = await this.prisma.product.findFirst({
        where: { projectId }
      });

      return product as Product | null;
    } catch (error) {
      throw new Error(`Failed to find product by project id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByWebsite(website: string): Promise<Product | null> {
    try {
      const product = await this.prisma.product.findFirst({
        where: { website }
      });

      return product as Product | null;
    } catch (error) {
      throw new Error(`Failed to find product by website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findWithProject(id: string): Promise<ProductWithProject | null> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          project: true
        }
      });

      return product as ProductWithProject | null;
    } catch (error) {
      throw new Error(`Failed to find product with project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findWithSnapshots(id: string): Promise<ProductWithSnapshots | null> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          snapshots: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return product as ProductWithSnapshots | null;
    } catch (error) {
      throw new Error(`Failed to find product with snapshots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findWithProjectAndSnapshots(id: string): Promise<ProductWithProjectAndSnapshots | null> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          project: true,
          snapshots: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return product as ProductWithProjectAndSnapshots | null;
    } catch (error) {
      throw new Error(`Failed to find product with project and snapshots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: string, updates: UpdateProductInput): Promise<Product> {
    try {
      // Check if product exists
      const existingProduct = await this.findById(id);
      if (!existingProduct) {
        throw new ProductNotFoundError(id);
      }

      // Validate update data if provided
      if (Object.keys(updates).length > 0) {
        this.validatePartialProductData(updates);
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: updates
      });

      return product as Product;
    } catch (error) {
      if (error instanceof ProductNotFoundError || error instanceof InvalidProductDataError) {
        throw error;
      }
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Check if product exists
      const existingProduct = await this.findById(id);
      if (!existingProduct) {
        throw new ProductNotFoundError(id);
      }

      await this.prisma.product.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        throw error;
      }
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(): Promise<Product[]> {
    try {
      const products = await this.prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return products as Product[];
    } catch (error) {
      throw new Error(`Failed to list products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private validation methods
  private validateProductData(data: CreateProductInput): void {
    if (!data.name?.trim()) {
      throw new InvalidProductDataError('Product name is required');
    }

    if (!data.website?.trim()) {
      throw new InvalidProductDataError('Product website is required');
    }

    if (!this.isValidUrl(data.website)) {
      throw new InvalidProductDataError('Product website must be a valid URL');
    }

    if (!data.positioning?.trim()) {
      throw new InvalidProductDataError('Product positioning is required');
    }

    if (!data.customerData?.trim()) {
      throw new InvalidProductDataError('Customer data is required');
    }

    if (!data.userProblem?.trim()) {
      throw new InvalidProductDataError('User problem is required');
    }

    if (!data.industry?.trim()) {
      throw new InvalidProductDataError('Industry is required');
    }

    if (!data.projectId?.trim()) {
      throw new InvalidProductDataError('Project ID is required');
    }
  }

  private validatePartialProductData(data: UpdateProductInput): void {
    if (data.name !== undefined && !data.name?.trim()) {
      throw new InvalidProductDataError('Product name cannot be empty');
    }

    if (data.website !== undefined) {
      if (!data.website?.trim()) {
        throw new InvalidProductDataError('Product website cannot be empty');
      }
      if (!this.isValidUrl(data.website)) {
        throw new InvalidProductDataError('Product website must be a valid URL');
      }
    }

    if (data.positioning !== undefined && !data.positioning?.trim()) {
      throw new InvalidProductDataError('Product positioning cannot be empty');
    }

    if (data.customerData !== undefined && !data.customerData?.trim()) {
      throw new InvalidProductDataError('Customer data cannot be empty');
    }

    if (data.userProblem !== undefined && !data.userProblem?.trim()) {
      throw new InvalidProductDataError('User problem cannot be empty');
    }

    if (data.industry !== undefined && !data.industry?.trim()) {
      throw new InvalidProductDataError('Industry cannot be empty');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Export both the class and the instance
export { PrismaProductRepository as ProductRepository };
export const productRepository = new PrismaProductRepository(); 