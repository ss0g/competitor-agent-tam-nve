'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipContent {
  title: string;
  description: string;
  actions?: ReadonlyArray<{
    readonly label: string;
    readonly action: () => void;
    readonly variant?: 'primary' | 'secondary';
  }>;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showArrow?: boolean;
}

interface OnboardingTooltipProps {
  id?: string;
  content: TooltipContent;
  children: React.ReactNode;
  trigger?: 'hover' | 'click' | 'manual';
  isVisible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  className?: string;
  disabled?: boolean;
  offset?: number;
  zIndex?: number;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  id: _id,
  content,
  children,
  trigger = 'hover',
  isVisible: controlledIsVisible,
  onVisibilityChange,
  className = '',
  disabled = false,
  offset = 8,
  zIndex = 1000
}) => {
  const [internalIsVisible, setInternalIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const isVisible = controlledIsVisible !== undefined ? controlledIsVisible : internalIsVisible;

  const updateTooltipPosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newPosition = content.position || 'top';
    let x = 0;
    let y = 0;

    // Calculate initial position
    switch (newPosition) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - offset;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + offset;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - offset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + offset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Adjust if tooltip would be outside viewport
    if (x < 10) {
      x = 10;
      if (newPosition === 'top' || newPosition === 'bottom') {
        newPosition = 'right';
        x = triggerRect.right + offset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      }
    }

    if (x + tooltipRect.width > viewportWidth - 10) {
      x = viewportWidth - tooltipRect.width - 10;
      if (newPosition === 'top' || newPosition === 'bottom') {
        newPosition = 'left';
        x = triggerRect.left - tooltipRect.width - offset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      }
    }

    if (y < 10) {
      y = 10;
      if (newPosition === 'left' || newPosition === 'right') {
        newPosition = 'bottom';
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + offset;
      }
    }

    if (y + tooltipRect.height > viewportHeight - 10) {
      y = viewportHeight - tooltipRect.height - 10;
      if (newPosition === 'left' || newPosition === 'right') {
        newPosition = 'top';
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - offset;
      }
    }

    setPosition({ x, y });
    setTooltipPosition(newPosition);
  };

  const showTooltip = () => {
    if (disabled) return;
    
    if (controlledIsVisible === undefined) {
      setInternalIsVisible(true);
    }
    onVisibilityChange?.(true);
  };

  const hideTooltip = () => {
    if (disabled) return;
    
    if (controlledIsVisible === undefined) {
      setInternalIsVisible(false);
    }
    onVisibilityChange?.(false);
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      showTooltip();
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      timeoutRef.current = setTimeout(hideTooltip, 100);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trigger === 'click') {
      if (isVisible) {
        hideTooltip();
      } else {
        showTooltip();
      }
    }
  };

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(updateTooltipPosition, 10);
      return () => clearTimeout(timer);
    }
  }, [isVisible, updateTooltipPosition]);

  useEffect(() => {
    if (isVisible) {
      const handleResize = () => updateTooltipPosition();
      const handleScroll = () => updateTooltipPosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    if (trigger === 'click' && isVisible) {
      const handleClickOutside = (e: MouseEvent) => {
        if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
            triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
          hideTooltip();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [trigger, isVisible]);

  const getArrowStyles = () => {
    const arrowSize = 8;
    const styles: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (tooltipPosition) {
      case 'top':
        styles.top = '100%';
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        styles.borderWidth = `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`;
        styles.borderColor = '#1f2937 transparent transparent transparent';
        break;
      case 'bottom':
        styles.bottom = '100%';
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        styles.borderWidth = `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`;
        styles.borderColor = 'transparent transparent #1f2937 transparent';
        break;
      case 'left':
        styles.left = '100%';
        styles.top = '50%';
        styles.transform = 'translateY(-50%)';
        styles.borderWidth = `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`;
        styles.borderColor = 'transparent transparent transparent #1f2937';
        break;
      case 'right':
        styles.right = '100%';
        styles.top = '50%';
        styles.transform = 'translateY(-50%)';
        styles.borderWidth = `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`;
        styles.borderColor = 'transparent #1f2937 transparent transparent';
        break;
    }

    return styles;
  };

  const tooltip = isVisible ? (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex,
      }}
      className="bg-gray-800 text-white rounded-lg shadow-xl border border-gray-700 max-w-sm animate-in fade-in-0 zoom-in-95 duration-200"
      onMouseEnter={() => {
        if (trigger === 'hover' && timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }}
      onMouseLeave={() => {
        if (trigger === 'hover') {
          timeoutRef.current = setTimeout(hideTooltip, 100);
        }
      }}
    >
      {content.showArrow !== false && (
        <div style={getArrowStyles()} />
      )}
      
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2">{content.title}</h3>
        <p className="text-xs text-gray-300 leading-relaxed mb-3">
          {content.description}
        </p>
        
        {content.actions && content.actions.length > 0 && (
          <div className="flex gap-2">
            {content.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  hideTooltip();
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  action.variant === 'primary'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </div>
      {typeof window !== 'undefined' && tooltip && createPortal(tooltip, document.body)}
    </>
  );
};

// Predefined tooltip contents for immediate reports feature
export const IMMEDIATE_REPORTS_TOOLTIPS = {
  projectCreation: {
    immediateReports: {
      title: "Immediate Report Generation",
      description: "Generate your first competitive analysis report instantly upon project creation using fresh competitor data captured in real-time.",
      actions: [
        {
          label: "Learn More",
          action: () => window.open('/help/immediate-reports', '_blank'),
          variant: 'primary' as const
        }
      ]
    },
    dataFreshness: {
      title: "Fresh Competitor Data",
      description: "We'll capture fresh competitor data for the most current insights. This ensures your analysis reflects the latest competitor changes.",
      actions: [
        {
          label: "Why Fresh Data?",
          action: () => window.open('/help/data-freshness', '_blank'),
          variant: 'secondary' as const
        }
      ]
    },
    qualityIndicators: {
      title: "Report Quality Scores",
      description: "Reports include quality scores (60-100%) and recommendations for improvement. Higher scores indicate more complete competitor data was available.",
      actions: [
        {
          label: "Understanding Scores",
          action: () => window.open('/help/quality-scores', '_blank'),
          variant: 'secondary' as const
        }
      ]
    }
  },
  
  progressTracking: {
    phases: {
      title: "Report Generation Phases",
      description: "Track real-time progress through validation → data capture → analysis → generation phases. Each phase shows detailed status updates.",
      actions: [
        {
          label: "View Details",
          action: () => window.open('/help/generation-phases', '_blank'),
          variant: 'secondary' as const
        }
      ]
    },
    estimatedTime: {
      title: "Generation Time",
      description: "Most reports complete within 45 seconds. Time varies based on competitor website complexity and data availability.",
      actions: [
        {
          label: "What Affects Time?",
          action: () => window.open('/help/generation-time', '_blank'),
          variant: 'secondary' as const
        }
      ]
    },
    fallbackOptions: {
      title: "Fallback & Recovery",
      description: "If issues occur, we'll provide alternatives and schedule background processing. Your project data is always safe.",
      actions: [
        {
          label: "Learn About Fallbacks",
          action: () => window.open('/help/fallback-options', '_blank'),
          variant: 'secondary' as const
        }
      ]
    }
  },
  
  reportQuality: {
    completenessScore: {
      title: "Data Completeness Score",
      description: "Indicates how much data was available for analysis (target: >60%). Fresh competitor snapshots improve completeness significantly.",
      actions: [
        {
          label: "Improve Score",
          action: () => window.open('/help/improve-completeness', '_blank'),
          variant: 'primary' as const
        }
      ]
    },
    freshness: {
      title: "Data Freshness",
      description: "Shows age of competitor data used in analysis: 'new' (just captured), 'existing' (cached), or 'mixed' (combination).",
      actions: [
        {
          label: "Freshness Guide",
          action: () => window.open('/help/data-freshness', '_blank'),
          variant: 'secondary' as const
        }
      ]
    },
    recommendations: {
      title: "Quality Recommendations",
      description: "Actionable suggestions for improving report quality, including adding competitors, updating product info, or scheduling full analysis.",
      actions: [
        {
          label: "Best Practices",
          action: () => window.open('/help/best-practices', '_blank'),
          variant: 'primary' as const
        }
      ]
    }
  }
} as const;

export default OnboardingTooltip; 