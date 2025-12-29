import React from 'react';
import { testPasswordRequirements } from '@/lib/validation/password-requirements';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

/**
 * Password strength indicator component
 * Shows real-time feedback on password requirements and overall strength
 */
export function PasswordStrength({ password, className = "" }: PasswordStrengthProps) {
  const requirements = testPasswordRequirements(password);
  const passedRequirements = requirements.filter(req => req.passes).length;
  const totalRequirements = requirements.length;
  const strengthPercentage = totalRequirements > 0 ? (passedRequirements / totalRequirements) * 100 : 0;
  
  // Calculate strength level (0-3)
  const strengthLevel = Math.floor((passedRequirements / totalRequirements) * 3);
  
  // Get strength color and label
  const getStrengthColor = () => {
    if (strengthLevel <= 1) return 'bg-red-500';
    if (strengthLevel <= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getStrengthLabel = () => {
    if (strengthLevel <= 1) return 'Weak';
    if (strengthLevel <= 2) return 'Fair';
    return 'Strong';
  };
  
  const getStrengthTextColor = () => {
    if (strengthLevel <= 1) return 'text-red-500';
    if (strengthLevel <= 2) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={`font-medium ${getStrengthTextColor()}`}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Requirements List */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Requirements:</p>
        <div className="space-y-1">
          {requirements.map((req) => (
            <div key={req.id} className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${req.passes ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={req.passes ? 'text-green-600' : 'text-muted-foreground'}>
                {req.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
