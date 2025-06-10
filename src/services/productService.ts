import { Product, CreateProductInput, ProductWithProject } from '@/types/product';
import { productRepository } from '@/lib/repositories';
import { ChatState } from '@/types/chat';

export interface ProductServiceInterface {
  createProductFromChat(chatData: ChatState, projectId: string): Promise<Product>;
  getProductWithProject(productId: string): Promise<ProductWithProject | null>;
  validateChatDataForProduct(chatData: ChatState): boolean;
}

export class ProductService implements ProductServiceInterface {
  
  /**
   * Creates a PRODUCT entity from collected chat data
   */
  public async createProductFromChat(chatData: ChatState, projectId: string): Promise<Product> {
    // Validate that all required data is present
    if (!this.validateChatDataForProduct(chatData)) {
      throw new Error('Incomplete product data in chat state');
    }

    const collectedData = chatData.collectedData!;

    // Create product input from chat data
    const productInput: CreateProductInput = {
      name: collectedData.productName!,
      website: collectedData.productUrl!,
      positioning: collectedData.positioning!,
      customerData: collectedData.customerData!,
      userProblem: collectedData.userProblem!,
      industry: collectedData.industry!,
      projectId: projectId
    };

    // Create the product using the repository
    const product = await productRepository.create(productInput);

    console.log(`✅ Created PRODUCT entity: ${product.name} (${product.id}) for project ${projectId}`);

    return product;
  }

  /**
   * Retrieves a product with its associated project
   */
  public async getProductWithProject(productId: string): Promise<ProductWithProject | null> {
    return await productRepository.findWithProject(productId);
  }

  /**
   * Validates that chat data contains all required fields for product creation
   */
  public validateChatDataForProduct(chatData: ChatState): boolean {
    const data = chatData.collectedData;
    if (!data) return false;

    return !!(
      data.productName &&
      data.productUrl &&
      data.positioning &&
      data.customerData &&
      data.userProblem &&
      data.industry
    );
  }

  /**
   * Updates an existing product with new data from chat
   */
  public async updateProductFromChat(productId: string, chatData: ChatState): Promise<Product> {
    if (!this.validateChatDataForProduct(chatData)) {
      throw new Error('Incomplete product data in chat state');
    }

    const collectedData = chatData.collectedData!;

    const updateData = {
      name: collectedData.productName!,
      website: collectedData.productUrl!,
      positioning: collectedData.positioning!,
      customerData: collectedData.customerData!,
      userProblem: collectedData.userProblem!,
      industry: collectedData.industry!
    };

    const product = await productRepository.update(productId, updateData);

    console.log(`✅ Updated PRODUCT entity: ${product.name} (${product.id})`);

    return product;
  }

  /**
   * Checks if a project already has a product
   */
  public async getProductByProjectId(projectId: string): Promise<Product | null> {
    return await productRepository.findByProjectId(projectId);
  }

  /**
   * Deletes a product and all its associated data
   */
  public async deleteProduct(productId: string): Promise<void> {
    await productRepository.delete(productId);
    console.log(`✅ Deleted PRODUCT entity: ${productId}`);
  }
}

export const productService = new ProductService(); 