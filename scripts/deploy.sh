#!/bin/bash

# Production Deployment Script for Comparative Reports Feature
# Usage: ./scripts/deploy.sh [phase] [environment]
# Example: ./scripts/deploy.sh advance production

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
PHASE="${1:-status}"
ENVIRONMENT="${2:-development}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if API is accessible
check_api_health() {
    log_info "Checking API health..."
    
    if curl -sf "$API_BASE_URL/api/debug/comparative-reports" -o /dev/null; then
        log_success "API is accessible"
        return 0
    else
        log_error "API is not accessible at $API_BASE_URL"
        return 1
    fi
}

# Get current rollout status
get_rollout_status() {
    log_info "Getting current rollout status..."
    
    RESPONSE=$(curl -s "$API_BASE_URL/api/deployment/rollout-status" || echo '{"error": "API call failed"}')
    
    if echo "$RESPONSE" | grep -q '"error"'; then
        log_error "Failed to get rollout status"
        echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Failed to parse error"
        return 1
    fi
    
    echo "$RESPONSE" | jq '.' 2>/dev/null || {
        log_error "Failed to parse rollout status response"
        return 1
    }
}

# Advance to next phase
advance_phase() {
    log_info "Advancing to next deployment phase..."
    
    # Safety confirmation for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo -n "⚠️  Advancing production deployment phase. Are you sure? (yes/no): "
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_warning "Deployment advancement cancelled"
            return 1
        fi
        
        PAYLOAD='{"confirmationToken": "CONFIRM_PHASE_ADVANCE"}'
    else
        PAYLOAD='{}'
    fi
    
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        "$API_BASE_URL/api/deployment/advance-phase" || echo '{"error": "API call failed"}')
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        NEW_PHASE=$(echo "$RESPONSE" | jq -r '.result.newPhase // "unknown"')
        MESSAGE=$(echo "$RESPONSE" | jq -r '.result.message // "No message"')
        log_success "Successfully advanced to phase: $NEW_PHASE"
        log_info "$MESSAGE"
        return 0
    else
        log_error "Failed to advance deployment phase"
        echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Failed to parse error"
        return 1
    fi
}

# Rollback deployment
rollback_deployment() {
    local reason="${2:-Manual rollback from script}"
    local emergency="${3:-false}"
    
    log_warning "Rolling back deployment..."
    
    # Safety confirmation
    echo -n "⚠️  Rolling back deployment. Reason: $reason. Continue? (yes/no): "
    read -r confirmation
    if [[ "$confirmation" != "yes" ]]; then
        log_warning "Rollback cancelled"
        return 1
    fi
    
    PAYLOAD=$(jq -n \
        --arg reason "$reason" \
        --argjson emergency "$emergency" \
        '{"reason": $reason, "emergency": $emergency}')
    
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        "$API_BASE_URL/api/deployment/rollback" || echo '{"error": "API call failed"}')
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        NEW_PHASE=$(echo "$RESPONSE" | jq -r '.result.newPhase // "unknown"')
        log_success "Successfully rolled back to phase: $NEW_PHASE"
        
        if [[ "$emergency" == "true" ]]; then
            log_warning "Emergency rollback completed - feature has been disabled"
        fi
        return 0
    else
        log_error "Failed to rollback deployment"
        echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Failed to parse error"
        return 1
    fi
}

# Monitor deployment health
monitor_health() {
    log_info "Monitoring deployment health..."
    
    local max_attempts=5
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts"
        
        STATUS=$(get_rollout_status)
        if [[ $? -eq 0 ]]; then
            HEALTH_STATUS=$(echo "$STATUS" | jq -r '.status.healthStatus // "unknown"')
            ERROR_RATE=$(echo "$STATUS" | jq -r '.status.metrics.errorRate // 0')
            PROCESSING_TIME=$(echo "$STATUS" | jq -r '.status.metrics.averageProcessingTime // 0')
            
            log_info "Health Status: $HEALTH_STATUS"
            log_info "Error Rate: $(echo "scale=2; $ERROR_RATE * 100" | bc)%"
            log_info "Avg Processing Time: ${PROCESSING_TIME}ms"
            
            if [[ "$HEALTH_STATUS" == "critical" ]]; then
                log_error "System health is critical!"
                
                # Check if automatic rollback is recommended
                ROLLBACK_CHECK=$(curl -s "$API_BASE_URL/api/deployment/rollback" || echo '{"shouldTriggerAutomaticRollback": false}')
                SHOULD_ROLLBACK=$(echo "$ROLLBACK_CHECK" | jq -r '.shouldTriggerAutomaticRollback // false')
                
                if [[ "$SHOULD_ROLLBACK" == "true" ]]; then
                    log_warning "Automatic rollback is recommended"
                    echo -n "Trigger automatic rollback? (yes/no): "
                    read -r confirmation
                    if [[ "$confirmation" == "yes" ]]; then
                        rollback_deployment "Automatic rollback due to critical health status" false
                        return $?
                    fi
                fi
            elif [[ "$HEALTH_STATUS" == "healthy" ]]; then
                log_success "System health is good"
                return 0
            fi
        else
            log_warning "Failed to get health status on attempt $attempt"
        fi
        
        attempt=$((attempt + 1))
        if [[ $attempt -le $max_attempts ]]; then
            log_info "Waiting 30 seconds before next check..."
            sleep 30
        fi
    done
    
    log_error "Health monitoring failed after $max_attempts attempts"
    return 1
}

# Show deployment guide
show_guide() {
    log_info "Getting deployment guide..."
    
    STATUS=$(get_rollout_status)
    if [[ $? -eq 0 ]]; then
        echo "$STATUS" | jq -r '.deploymentGuide // "No deployment guide available"'
    else
        log_error "Failed to get deployment guide"
        return 1
    fi
}

# Main function
main() {
    log_info "🚀 Comparative Reports Production Deployment Tool"
    log_info "Environment: $ENVIRONMENT"
    log_info "API Base URL: $API_BASE_URL"
    echo ""
    
    # Check dependencies
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi
    
    # Check API health first
    if ! check_api_health; then
        log_error "Cannot proceed - API is not accessible"
        exit 1
    fi
    
    # Execute based on phase argument
    case "$PHASE" in
        "status")
            get_rollout_status
            ;;
        "advance")
            advance_phase
            ;;
        "rollback")
            rollback_deployment "$PHASE" "${3:-Manual rollback}" "${4:-false}"
            ;;
        "emergency-rollback")
            rollback_deployment "$PHASE" "Emergency rollback from script" true
            ;;
        "monitor")
            monitor_health
            ;;
        "guide")
            show_guide
            ;;
        "help"|"--help"|"-h")
            echo "Usage: $0 [phase] [environment]"
            echo ""
            echo "Phases:"
            echo "  status              - Show current rollout status (default)"
            echo "  advance             - Advance to next deployment phase"
            echo "  rollback [reason]   - Rollback to previous phase"
            echo "  emergency-rollback  - Emergency rollback with feature disable"
            echo "  monitor             - Monitor deployment health"
            echo "  guide               - Show deployment guide"
            echo "  help                - Show this help"
            echo ""
            echo "Environment variables:"
            echo "  API_BASE_URL        - Base URL for API calls (default: http://localhost:3000)"
            echo ""
            echo "Examples:"
            echo "  $0 status"
            echo "  $0 advance production"
            echo "  $0 rollback 'High error rate detected'"
            echo "  $0 monitor"
            ;;
        *)
            log_error "Unknown phase: $PHASE"
            log_info "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 