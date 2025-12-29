"use client"

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Crown, Users, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface SubscriptionLimitDialogProps {
  open: boolean;
  onClose: () => void;
  limitType: 'users' | 'projects';
  currentCount: number;
  maxCount: number;
  companyName?: string;
}

export default function SubscriptionLimitDialog({
  open,
  onClose,
  limitType,
  currentCount,
  maxCount,
  companyName
}: SubscriptionLimitDialogProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push('/subscription');
  };

  const getIcon = () => {
    if (limitType === 'users') return <Users className="w-12 h-12 text-blue-500" />;
    return <FolderOpen className="w-12 h-12 text-green-500" />;
  };

  const getTitle = () => {
    if (limitType === 'users') return 'User Limit Reached';
    return 'Project Limit Reached';
  };

  const getDescription = () => {
    const entityName = limitType === 'users' ? 'users' : 'projects';
    return `You've reached your plan's limit of ${maxCount} ${entityName}. ${companyName ? `${companyName} currently has` : 'You currently have'} ${currentCount} ${entityName}.`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            {getIcon()}
            <DialogTitle className="text-xl font-semibold">
              {getTitle()}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Warning Message */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Subscription Limit Reached</p>
              <p className="text-yellow-700 mt-1">
                {getDescription()}
              </p>
            </div>
          </div>

          {/* Current Usage */}
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">
              {currentCount} / {maxCount}
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {limitType} used
            </p>
          </div>

          {/* Upgrade Prompt */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Upgrade to Continue</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Upgrade your subscription to add more {limitType} and unlock additional features.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button onClick={handleUpgrade} className="w-full">
              View Subscription Plans
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Maybe Later
            </Button>
          </div>

          {/* Contact Admin Note */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Only company administrators can upgrade subscriptions. 
              Contact your admin if you need assistance.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 