/**
 * Phase 1.3: Service Registry for Critical Data Integrity
 * Provides centralized service instantiation and dependency management
 */

import { logger } from '@/lib/logger';
import { dataIntegrityValidator } from '@/lib/validation/dataIntegrity';

// Service configuration interface
export interface ServiceConfig {
  singleton?: boolean;
  dependencies?: string[];
  initializationTimeout?: number;
  retryCount?: number;
  healthCheck?: () => Promise<boolean>;
}

// Service instance metadata
export interface ServiceMetadata {
  instanceCount: number;
  lastAccessed: Date;
  isHealthy: boolean;
  initializationTime: number;
  errors: string[];
}

// Service constructor type
export type ServiceConstructor<T = any> = new (...args: any[]) => T;

/**
 * Service Registry Class
 * Manages service instantiation, dependencies, and lifecycle
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, any>();
  private serviceConfigs = new Map<string, ServiceConfig>();
  private serviceMetadata = new Map<string, ServiceMetadata>();
  private initializationPromises = new Map<string, Promise<any>>();
  private dependencyGraph = new Map<string, Set<string>>();

  private constructor() {
    logger.info('Service Registry initialized');
  }

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Register a service with configuration
   */
  registerService<T>(
    serviceClass: ServiceConstructor<T>,
    config: ServiceConfig = {}
  ): void {
    const serviceName = serviceClass.name;
    
    // Validate service configuration
    const validationResult = this.validateServiceConfig(serviceName, config);
    if (!validationResult.valid) {
      throw new Error(`Invalid service configuration for ${serviceName}: ${validationResult.errors.join(', ')}`);
    }

    this.serviceConfigs.set(serviceName, {
      singleton: true,
      initializationTimeout: 30000,
      retryCount: 3,
      ...config
    });

    // Build dependency graph
    if (config.dependencies) {
      this.dependencyGraph.set(serviceName, new Set(config.dependencies));
    }

    // Initialize metadata
    this.serviceMetadata.set(serviceName, {
      instanceCount: 0,
      lastAccessed: new Date(),
      isHealthy: true,
      initializationTime: 0,
      errors: []
    });

    logger.info(`Service ${serviceName} registered`, { config });
  }

  /**
   * Get service instance with dependency resolution
   */
  async getService<T>(serviceClass: ServiceConstructor<T>): Promise<T> {
    const serviceName = serviceClass.name;
    const config = this.serviceConfigs.get(serviceName) || { singleton: true };

    // Handle singleton services
    if (config.singleton && this.services.has(serviceName)) {
      this.updateLastAccessed(serviceName);
      return this.services.get(serviceName);
    }

    // Handle concurrent initialization
    if (this.initializationPromises.has(serviceName)) {
      return await this.initializationPromises.get(serviceName)!;
    }

    // Initialize service with dependencies
    const initPromise = this.initializeService(serviceClass, serviceName, config);
    this.initializationPromises.set(serviceName, initPromise);

    try {
      const service = await initPromise;
      this.initializationPromises.delete(serviceName);
      return service;
    } catch (error) {
      this.initializationPromises.delete(serviceName);
      this.recordServiceError(serviceName, error as Error);
      throw error;
    }
  }

  /**
   * Get service synchronously (for already initialized services)
   */
  getServiceSync<T>(serviceClass: ServiceConstructor<T>): T | null {
    const serviceName = serviceClass.name;
    
    if (this.services.has(serviceName)) {
      this.updateLastAccessed(serviceName);
      return this.services.get(serviceName);
    }
    
    return null;
  }

  /**
   * Initialize service with dependency resolution
   */
  private async initializeService<T>(
    serviceClass: ServiceConstructor<T>,
    serviceName: string,
    config: ServiceConfig
  ): Promise<T> {
    const startTime = Date.now();

    try {
      logger.info(`Initializing service ${serviceName}`);

      // Resolve dependencies first
      await this.resolveDependencies(serviceName);

      // Create service instance
      const service = new serviceClass();
      
      // Store singleton instance
      if (config.singleton) {
        this.services.set(serviceName, service);
      }

      // Update metadata
      const metadata = this.serviceMetadata.get(serviceName)!;
      metadata.instanceCount++;
      metadata.initializationTime = Date.now() - startTime;
      metadata.lastAccessed = new Date();
      metadata.isHealthy = true;

      // Perform health check if configured
      if (config.healthCheck) {
        const isHealthy = await this.performHealthCheck(serviceName, config.healthCheck);
        metadata.isHealthy = isHealthy;
      }

      logger.info(`Service ${serviceName} initialized successfully`, {
        initializationTime: metadata.initializationTime,
        instanceCount: metadata.instanceCount
      });

      return service;

    } catch (error) {
      logger.error(`Failed to initialize service ${serviceName}`, error instanceof Error ? error : new Error(String(error)), { serviceName });
      throw error;
    }
  }

  /**
   * Resolve service dependencies
   */
  private async resolveDependencies(serviceName: string): Promise<void> {
    const dependencies = this.dependencyGraph.get(serviceName);
    if (!dependencies || dependencies.size === 0) {
      return;
    }

    logger.debug(`Resolving dependencies for ${serviceName}`, {
      dependencies: Array.from(dependencies)
    });

    // Check for circular dependencies
    this.checkCircularDependencies(serviceName, new Set());

    // Initialize dependencies
    for (const depName of dependencies) {
      if (!this.services.has(depName)) {
        const depConfig = this.serviceConfigs.get(depName);
        if (!depConfig) {
          throw new Error(`Dependency ${depName} not registered for service ${serviceName}`);
        }
        
        // Find and initialize dependency service
        // Note: In a real implementation, you'd need a way to map service names to classes
        logger.warn(`Dependency ${depName} not found for ${serviceName}. Manual initialization required.`);
      }
    }
  }

  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(serviceName: string, visited: Set<string>): void {
    if (visited.has(serviceName)) {
      throw new Error(`Circular dependency detected involving ${serviceName}`);
    }

    visited.add(serviceName);
    const dependencies = this.dependencyGraph.get(serviceName);
    
    if (dependencies) {
      for (const dep of dependencies) {
        this.checkCircularDependencies(dep, new Set(visited));
      }
    }
  }

  /**
   * Perform health check for a service
   */
  private async performHealthCheck(
    serviceName: string,
    healthCheck: () => Promise<boolean>
  ): Promise<boolean> {
    try {
      const isHealthy = await healthCheck();
      logger.debug(`Health check for ${serviceName}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return isHealthy;
    } catch (error) {
      logger.warn(`Health check failed for ${serviceName}`, error as Error);
      return false;
    }
  }

  /**
   * Validate service configuration
   */
  private validateServiceConfig(serviceName: string, config: ServiceConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate timeout
    if (config.initializationTimeout && config.initializationTimeout < 1000) {
      errors.push('Initialization timeout must be at least 1000ms');
    }

    // Validate retry count
    if (config.retryCount && config.retryCount < 0) {
      errors.push('Retry count cannot be negative');
    }

    // Validate dependencies
    if (config.dependencies) {
      const duplicates = config.dependencies.filter((dep, index) => 
        config.dependencies!.indexOf(dep) !== index
      );
      if (duplicates.length > 0) {
        errors.push(`Duplicate dependencies found: ${duplicates.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Update last accessed time for a service
   */
  private updateLastAccessed(serviceName: string): void {
    const metadata = this.serviceMetadata.get(serviceName);
    if (metadata) {
      metadata.lastAccessed = new Date();
    }
  }

  /**
   * Record service error
   */
  private recordServiceError(serviceName: string, error: Error): void {
    const metadata = this.serviceMetadata.get(serviceName);
    if (metadata) {
      metadata.errors.push(error.message);
      metadata.isHealthy = false;
      
      // Keep only last 10 errors
      if (metadata.errors.length > 10) {
        metadata.errors = metadata.errors.slice(-10);
      }
    }
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): ServiceMetadata | null {
    return this.serviceMetadata.get(serviceName) || null;
  }

  /**
   * Get all service health statuses
   */
  getAllServiceHealth(): Map<string, ServiceMetadata> {
    return new Map(this.serviceMetadata);
  }

  /**
   * Clear service instance (useful for testing or forced reinitialization)
   */
  clearService(serviceName: string): void {
    this.services.delete(serviceName);
    this.initializationPromises.delete(serviceName);
    
    const metadata = this.serviceMetadata.get(serviceName);
    if (metadata) {
      metadata.instanceCount = 0;
      metadata.isHealthy = true;
      metadata.errors = [];
    }
    
    logger.info(`Service ${serviceName} cleared from registry`);
  }

  /**
   * Clear all services
   */
  clearAll(): void {
    this.services.clear();
    this.initializationPromises.clear();
    
    for (const [serviceName, metadata] of this.serviceMetadata) {
      metadata.instanceCount = 0;
      metadata.isHealthy = true;
      metadata.errors = [];
    }
    
    logger.info('All services cleared from registry');
  }

  /**
   * Validate data integrity across all managed services
   */
  async validateServiceDataIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check service health
    for (const [serviceName, metadata] of this.serviceMetadata) {
      if (!metadata.isHealthy) {
        issues.push(`Service ${serviceName} is unhealthy`);
        recommendations.push(`Check and resolve issues with ${serviceName}`);
      }

      if (metadata.errors.length > 0) {
        issues.push(`Service ${serviceName} has ${metadata.errors.length} recorded errors`);
        recommendations.push(`Review error logs for ${serviceName}`);
      }
    }

    // Check for missing critical services
    const criticalServices = [
      'ComparativeAnalysisService',
      'ComparativeReportService',
      'ProjectService',
      'ProductRepository'
    ];

    for (const service of criticalServices) {
      if (!this.serviceConfigs.has(service)) {
        issues.push(`Critical service ${service} not registered`);
        recommendations.push(`Register ${service} with the service registry`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();

// Convenience function for getting services
export async function getService<T>(serviceClass: ServiceConstructor<T>): Promise<T> {
  return serviceRegistry.getService(serviceClass);
}

// Convenience function for registering services
export function registerService<T>(
  serviceClass: ServiceConstructor<T>,
  config?: ServiceConfig
): void {
  serviceRegistry.registerService(serviceClass, config);
} 