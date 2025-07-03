# AWS Credential Capture Implementation Plan

## User Story
**As a user I want to be able to add my own AWS credentials for Bedrock access**

## Success Criteria
- ✅ Customer can add their Key ID
- ✅ Customer can add their secret Key ID  
- ✅ Customer can add their Session Token
- ✅ Customer can add their AWS region
- ✅ System stores access credentials locally
- ✅ System validates access credentials
- ✅ System displays save success message
- ✅ System displays AWS status success
- ✅ System displays save failure message
- ✅ System displays issues with provided credentials
- ✅ System uses these credentials to trigger AI competitor analysis

## Prerequisites/Triggers
- Customer has not provided their AWS credentials
- Customer AWS credentials are expired
- Customer AWS credentials are failing

## High-Level Implementation Flow

### 1. UI Components
#### AWS Status Notification (Existing - Enhanced)
- **Location**: Chat interface
- **Component**: `AWSStatusIndicator.tsx` (enhance existing)
- **Features**:
  - Clickable notification when credentials missing/expired/failing
  - Visual status indicators (success/warning/error)
  - Triggers credential modal on click

#### AWS Credentials Modal (New)
- **Component**: `AWSCredentialsModal.tsx`
- **Features**:
  - Form fields for AWS credentials
  - Validation and error handling
  - Save/Cancel functionality
  - Loading states during validation

### 2. Form Structure
```typescript
interface AWSCredentials {
  profileName: string;           // e.g., "951719175506_bedrock-user"
  aws_access_key_id: string;     // e.g., "ASIA53FXCEVJI4T3XYYX"
  aws_secret_access_key: string; // Secret key
  aws_session_token: string;     // Session token
  aws_region: string;            // e.g., "us-east-1"
}
```

### 3. Backend API Endpoints

#### POST /api/aws/credentials
- **Purpose**: Save AWS credentials
- **Security**: Encrypt credentials before storage
- **Validation**: Validate credential format
- **Response**: Success/error status

#### POST /api/aws/credentials/validate
- **Purpose**: Validate AWS credentials
- **Process**: Test Bedrock access with provided credentials
- **Response**: Validation status and error details

#### GET /api/aws/credentials/status
- **Purpose**: Check current AWS credential status
- **Response**: Current status (valid/invalid/missing/expired)

#### DELETE /api/aws/credentials
- **Purpose**: Remove stored credentials
- **Security**: Secure deletion of sensitive data

### 4. Data Storage

#### Local Storage Strategy
- **Storage**: SQLite database (existing `competitor_research.db`)
- **Encryption**: AES-256 encryption for sensitive data
- **Table Structure**:
```sql
CREATE TABLE aws_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_name TEXT NOT NULL,
  encrypted_access_key TEXT NOT NULL,
  encrypted_secret_key TEXT NOT NULL,
  encrypted_session_token TEXT,
  aws_region TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_validated_at DATETIME,
  is_valid BOOLEAN DEFAULT FALSE
);
```

### 5. Security Implementation

#### Encryption Service
- **Component**: `lib/security/credentialEncryption.ts`
- **Features**:
  - AES-256 encryption/decryption
  - Secure key derivation
  - Salt generation and storage

#### Validation Service
- **Component**: `services/aws/credentialValidation.ts`
- **Features**:
  - Test Bedrock connectivity
  - Validate credential format
  - Handle AWS-specific errors

### 6. Integration Points

#### Bedrock Service Integration
- **Update**: `services/bedrock/` services
- **Changes**: Use stored credentials instead of environment variables
- **Fallback**: Environment variables as backup

#### Chat Interface Integration
- **Update**: Chat components to show AWS status
- **Error Handling**: Display credential issues in chat
- **Retry Logic**: Prompt for credential update on failures

## Technical Implementation Details

### Phase 1: Infrastructure
1. **Database Schema**: Create AWS credentials table
2. **Encryption Service**: Implement credential encryption
3. **API Endpoints**: Create credential management endpoints
4. **Validation Service**: Implement AWS credential validation

### Phase 2: UI Components
1. **AWS Status Enhancement**: Update existing status indicator
2. **Credentials Modal**: Create credential input form
3. **Error Handling**: Implement user-friendly error messages
4. **Success States**: Add confirmation and status displays

### Phase 3: Integration
1. **Bedrock Integration**: Update services to use stored credentials
2. **Chat Integration**: Connect credential status to chat interface
3. **Automatic Validation**: Periodic credential validation
4. **Error Recovery**: Graceful handling of credential failures

### Phase 4: Security & Testing
1. **Security Audit**: Review encryption implementation
2. **Validation Testing**: Test with various credential scenarios
3. **Error Handling**: Comprehensive error scenario testing
4. **Performance**: Optimize credential validation performance

## Component Structure

```
src/
├── components/
│   ├── aws/
│   │   ├── AWSCredentialsModal.tsx
│   │   ├── AWSCredentialsForm.tsx
│   │   └── AWSStatusIndicator.tsx (enhanced)
│   └── ...
├── services/
│   ├── aws/
│   │   ├── credentialService.ts
│   │   ├── credentialValidation.ts
│   │   └── credentialEncryption.ts
│   └── ...
├── lib/
│   ├── security/
│   │   └── encryption.ts
│   └── ...
└── app/api/
    └── aws/
        ├── credentials/
        │   ├── route.ts
        │   └── validate/
        │       └── route.ts
        └── status/
            └── route.ts
```

## Error Handling Strategy

### Validation Errors
- **Invalid Format**: Clear format requirements
- **Network Issues**: Retry mechanisms and clear messaging
- **AWS Errors**: Specific AWS error translation
- **Encryption Errors**: Secure error logging

### User Experience
- **Loading States**: Clear progress indicators
- **Success Messages**: Confirmation of successful saves
- **Error Messages**: Actionable error descriptions
- **Help Content**: Guidance for credential setup

## Security Considerations

1. **Encryption**: All credentials encrypted at rest
2. **Transmission**: HTTPS for all credential operations
3. **Access Control**: Validate user permissions
4. **Audit Logging**: Log credential operations (without exposing data)
5. **Secure Deletion**: Proper cleanup of sensitive data
6. **Session Management**: Secure credential session handling

## Testing Strategy

### Unit Tests
- Credential validation logic
- Encryption/decryption functions
- API endpoint functionality
- Error handling scenarios

### Integration Tests
- End-to-end credential flow
- Bedrock service integration
- Database operations
- Error recovery scenarios

### Security Tests
- Encryption strength validation
- Data leakage prevention
- Access control verification
- Secure deletion confirmation

## Success Metrics

1. **Functional**: All success criteria met
2. **Security**: No credential exposure in logs/errors
3. **Performance**: Validation completes within 5 seconds
4. **User Experience**: Clear error messages and smooth flow
5. **Reliability**: Graceful handling of all error scenarios

## Future Enhancements

1. **Multiple Profiles**: Support for multiple AWS profiles
2. **Credential Rotation**: Automatic credential refresh
3. **Role-Based Access**: AWS role assumption
4. **Advanced Validation**: More comprehensive AWS service checks
5. **Backup/Export**: Secure credential backup options 