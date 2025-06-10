import { PrismaClient } from '@prisma/client';
import {
  ProductSnapshotRepository,
  CreateProductSnapshotInput,
  ProductSnapshot,
  ProductSnapshotNotFoundError,
  InvalidProductDataError
} from '../../types/product';
import { prisma } from '../prisma';

export class PrismaProductSnapshotRepository implements ProductSnapshotRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  async create(snapshotData: CreateProductSnapshotInput): Promise<ProductSnapshot> {
    try {
      // Validate input data
      this.validateSnapshotData(snapshotData);

      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id: snapshotData.productId }
      });

      if (!product) {
        throw new InvalidProductDataError(`Product with id ${snapshotData.productId} not found`);
      }

      const snapshot = await this.prisma.productSnapshot.create({
        data: snapshotData
      });

      return snapshot as ProductSnapshot;
    } catch (error) {
      if (error instanceof InvalidProductDataError) {
        throw error;
      }
      throw new Error(`Failed to create product snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<ProductSnapshot | null> {
    try {
      const snapshot = await this.prisma.productSnapshot.findUnique({
        where: { id }
      });

      return snapshot as ProductSnapshot | null;
    } catch (error) {
      throw new Error(`Failed to find product snapshot by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findLatestByProductId(productId: string): Promise<ProductSnapshot | null> {
    try {
      const snapshot = await this.prisma.productSnapshot.findFirst({
        where: { productId },
        orderBy: { createdAt: 'desc' }
      });

      return snapshot as ProductSnapshot | null;
    } catch (error) {
      throw new Error(`Failed to find latest product snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByProductId(productId: string, limit?: number): Promise<ProductSnapshot[]> {
    try {
      const snapshots = await this.prisma.productSnapshot.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        ...(limit && { take: limit })
      });

      return snapshots as ProductSnapshot[];
    } catch (error) {
      throw new Error(`Failed to find product snapshots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Check if snapshot exists
      const existingSnapshot = await this.findById(id);
      if (!existingSnapshot) {
        throw new ProductSnapshotNotFoundError(id);
      }

      await this.prisma.productSnapshot.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof ProductSnapshotNotFoundError) {
        throw error;
      }
      throw new Error(`Failed to delete product snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(): Promise<ProductSnapshot[]> {
    try {
      const snapshots = await this.prisma.productSnapshot.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return snapshots as ProductSnapshot[];
    } catch (error) {
      throw new Error(`Failed to list product snapshots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private validation methods
  private validateSnapshotData(data: CreateProductSnapshotInput): void {
    if (!data.productId?.trim()) {
      throw new InvalidProductDataError('Product ID is required');
    }

    if (!data.content) {
      throw new InvalidProductDataError('Snapshot content is required');
    }

    if (!data.metadata) {
      throw new InvalidProductDataError('Snapshot metadata is required');
    }
  }
}

// Export singleton instance
export const productSnapshotRepository = new PrismaProductSnapshotRepository(); 