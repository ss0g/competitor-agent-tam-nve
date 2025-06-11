import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/repositories';
import { 
  logger, 
  generateCorrelationId, 
  createCorrelationLogger,
  trackCorrelation 
} from '@/lib/logger';
import { CreateProductInput } from '@/types/product';

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const correlatedLogger = createCorrelationLogger(correlationId);
  
  const context = {
    endpoint: '/api/products',
    method: 'POST',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'product_creation_request_received', context);
    logger.info('Product creation request received', context);

    const body = await request.json();
    const { 
      name, 
      website, 
      positioning, 
      customerData, 
      userProblem, 
      industry, 
      projectId 
    } = body;

    // Validate required fields
    if (!name || !website || !projectId) {
      trackCorrelation(correlationId, 'product_validation_failed', { 
        ...context, 
        missingFields: { name: !name, website: !website, projectId: !projectId }
      });
      
      return NextResponse.json(
        { 
          error: 'Missing required fields: name, website, projectId',
          code: 'MISSING_REQUIRED_FIELDS',
          correlationId
        },
        { status: 400 }
      );
    }

    const productData: CreateProductInput = {
      name,
      website,
      positioning: positioning || '',
      customerData: customerData || '',
      userProblem: userProblem || '',
      industry: industry || '',
      projectId
    };

    trackCorrelation(correlationId, 'product_creation_started', { 
      ...context, 
      productName: name,
      projectId 
    });

    const product = await productRepository.create(productData);

    trackCorrelation(correlationId, 'product_created_successfully', { 
      ...context, 
      productId: product.id,
      productName: product.name 
    });

    logger.info('Product created successfully', { 
      ...context, 
      productId: product.id,
      productName: product.name 
    });

    return NextResponse.json({
      success: true,
      data: product,
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'product_creation_failed', { 
      ...context, 
      error: (error as Error).message 
    });
    
    logger.error('Product creation failed', error as Error, context);
    
    return NextResponse.json(
      { 
        error: 'Failed to create product',
        details: (error as Error).message,
        correlationId
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  
  const context = {
    endpoint: '/api/products',
    method: 'GET',
    correlationId,
    projectId: projectId || undefined
  };

  try {
    trackCorrelation(correlationId, 'product_list_request_received', context);
    logger.info('Product list request received', context);

    if (!projectId) {
      trackCorrelation(correlationId, 'product_list_validation_failed', { 
        ...context, 
        error: 'Missing projectId parameter' 
      });
      
      return NextResponse.json(
        { 
          error: 'Project ID is required',
          code: 'MISSING_PROJECT_ID',
          correlationId
        },
        { status: 400 }
      );
    }

    const product = await productRepository.findByProjectId(projectId);
    const products = product ? [product] : [];

    trackCorrelation(correlationId, 'product_list_retrieved_successfully', { 
      ...context, 
      productCount: products.length 
    });

    logger.info('Product list retrieved successfully', { 
      ...context, 
      productCount: products.length 
    });

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'product_list_retrieval_failed', { 
      ...context, 
      error: (error as Error).message 
    });
    
    logger.error('Product list retrieval failed', error as Error, context);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve products',
        details: (error as Error).message,
        correlationId
      },
      { status: 500 }
    );
  }
} 