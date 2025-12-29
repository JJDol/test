"use client"

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, CreditCard, Phone, Mail } from "lucide-react";

interface UpgradeConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  selectedTier: {
    name: string;
    price: string;
    tier: 'basic' | 'pro' | 'enterprise' | 'custom';
  } | null;
}

export default function UpgradeConfirmationDialog({
  open,
  onClose,
  selectedTier
}: UpgradeConfirmationDialogProps) {

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isEnterprise = selectedTier?.tier === 'enterprise';
  const isCustom = selectedTier?.tier === 'custom';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            <Crown className="w-12 h-12 text-purple-500" />
            <DialogTitle className="text-xl font-semibold">
              {isCustom ? 'Custom Solution Inquiry' : `Upgrade to ${selectedTier?.name}`}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Selected Plan */}
          <div className="text-center">
            <Badge className={getTierColor(selectedTier?.tier || 'basic')}>
              {selectedTier?.name.toUpperCase()} {isCustom ? 'SOLUTION' : 'PLAN'}
            </Badge>
            <div className="text-3xl font-bold text-primary mt-2">
              {isCustom ? 'Custom Pricing' : `${selectedTier?.price}/month`}
            </div>
          </div>

          {/* What's included */}
          <div className="space-y-3">
            <h3 className="font-medium text-center">What happens next:</h3>
            <div className="space-y-2">
              {isCustom ? (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Expert consultation within 4 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Tailored solution design and pricing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Implementation roadmap and timeline</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Dedicated technical architect assigned</span>
                  </div>
                </>
              ) : isEnterprise ? (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Our sales team will contact you within 24 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Custom pricing and implementation plan</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Dedicated support manager assigned</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Secure payment processing via Stripe</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Instant access to new features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Increased limits applied immediately</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact Info */}
          {(isEnterprise || isCustom) && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-sm">
                <p className="font-medium text-purple-800 mb-2">
                  {isCustom ? 'Ready to discuss your needs?' : 'Need to talk now?'}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-purple-600" />
                    <span className="text-purple-700">+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-purple-600" />
                    <span className="text-purple-700">
                      {isCustom ? 'custom@aticon.com' : 'enterprise@aticon.com'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button onClick={onClose} className="w-full">
              {isCustom ? 'Request Consultation' : isEnterprise ? 'Contact Sales' : 'Proceed to Payment'}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>

          {/* Security Note */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {isCustom ? '🤝 No commitment required for consultation.' : '🔒 Secure payment processing. Cancel anytime.'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 