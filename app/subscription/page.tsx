"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, FolderOpen, HardDrive, MessageCircle, AlertTriangle } from "lucide-react";
import SubscriptionStatus from "@/components/ui/subscription-status";
import UpgradeConfirmationDialog from "@/components/ui/upgrade-confirmation-dialog";
import { createClient } from "@/lib/supabase/client";

interface SubscriptionTier {
  name: string;
  price: string;
  description: string;
  tier: 'basic' | 'pro' | 'enterprise' | 'custom';
  features: {
    max_users: number;
    max_projects: number;
    max_storage_gb: number;
    ai_chatbot: boolean;
    advanced_analytics: boolean;
    support_level: string;
    custom_integrations: boolean;
    api_access: boolean;
  };
  highlights: string[];
}

const subscriptionTiers: SubscriptionTier[] = [
  {
    name: "Basic",
    price: "$29",
    description: "Perfect for small teams getting started",
    tier: "basic",
    features: {
      max_users: 10,
      max_projects: 100,
      max_storage_gb: 5,
      ai_chatbot: false,
      advanced_analytics: false,
      support_level: "Email Support",
      custom_integrations: false,
      api_access: false
    },
    highlights: ["Great for startups", "Essential features", "Email support"]
  },
  {
    name: "Pro",
    price: "$99",
    description: "Ideal for growing architecture firms",
    tier: "pro",
    features: {
      max_users: 50,
      max_projects: 1000,
      max_storage_gb: 100,
      ai_chatbot: true,
      advanced_analytics: false,
      support_level: "Priority Support",
      custom_integrations: false,
      api_access: true
    },
    highlights: ["AI-powered assistance", "Priority support", "API access"]
  },
  {
    name: "Enterprise",
    price: "$299",
    description: "For large firms with advanced needs",
    tier: "enterprise",
    features: {
      max_users: 100,
      max_projects: 2000,
      max_storage_gb: 500,
      ai_chatbot: true,
      advanced_analytics: true,
      support_level: "Dedicated Support Manager",
      custom_integrations: true,
      api_access: true
    },
    highlights: ["Advanced analytics", "Custom integrations", "Dedicated support"]
  },
  {
    name: "Custom",
    price: "Let's Talk",
    description: "Tailored solutions for unique requirements",
    tier: "custom",
    features: {
      max_users: 0, // Unlimited
      max_projects: 0, // Unlimited
      max_storage_gb: 0, // Unlimited
      ai_chatbot: true,
      advanced_analytics: true,
      support_level: "White-glove Support",
      custom_integrations: true,
      api_access: true
    },
    highlights: ["Completely customizable", "On-premise deployment available", "Dedicated account team"]
  }
];

interface User {
  id: string;
  role: string;
  company_id: string | null;
}

interface Company {
  id: string;
  name: string;
  subscription_tier: 'basic' | 'pro' | 'enterprise' | 'custom';
}

export default function SubscriptionPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Upgrade confirmation dialog state
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<{
    name: string;
    price: string;
    tier: 'basic' | 'pro' | 'enterprise' | 'custom';
  } | null>(null);
  useEffect(() => {
    fetchUserAndCompany();
  }, []);

  const fetchUserAndCompany = async () => {
    try {
      setIsLoading(true);
      // TODO: Use API route for this probably two routes one for user and one for company
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!user) {
        window.location.href = '/sign-in';
        return;
      }

      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id, role, company_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      setCurrentUser(userProfile);

      if (userProfile.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, subscription_tier')
          .eq('id', userProfile.company_id)
          .single();

        if (companyError) throw companyError;
        setCompany(companyData);
      }
    } catch (error) {
      console.error("Error fetching user and company:", error);
      setError(error instanceof Error ? error.message : "Failed to load subscription data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = (tier: 'basic' | 'pro' | 'enterprise' | 'custom') => {
    const tierData = subscriptionTiers.find(t => t.tier === tier);
    if (tierData) {
      setSelectedUpgradeTier({
        name: tierData.name,
        price: tierData.price,
        tier: tierData.tier
      });
      setShowUpgradeDialog(true);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic': return 'border-gray-200';
      case 'pro': return 'border-blue-500 ring-2 ring-blue-200';
      case 'enterprise': return 'border-purple-500 ring-2 ring-purple-200';
      case 'custom': return 'border-gray-200';
      default: return 'border-gray-200';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'pro': return <Badge className="bg-blue-500 text-white">Most Popular</Badge>;
      case 'enterprise': return <Badge className="bg-purple-500 text-white flex items-center gap-1"><Crown className="w-3 h-3" /> Premium</Badge>;
      case 'custom': return <Badge className="bg-gray-500 text-white">Custom</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={fetchUserAndCompany}>Retry</Button>
        </div>
      </div>
    );
  }

  // Check if user has access to subscription management
  const hasAccess = currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY_ADMIN';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Subscription Plans</h1>
          <p className="text-xl text-muted-foreground">
            Choose the perfect plan for your architecture firm
          </p>
        </div>

        {/* Access Control Message */}
        {!hasAccess && (
          <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Contact Your Company Administrator</h3>
                <p className="text-yellow-700 mt-1">
                  Only company administrators can manage subscription plans. Please contact your company admin to upgrade your subscription or make changes to your plan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Subscription Status */}
        {hasAccess && company && (
          <div className="mb-8 flex gap-6">
            <div className="flex-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Plan: {company.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={
                      company.subscription_tier === 'basic' ? 'bg-gray-100 text-gray-800' :
                      company.subscription_tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                      company.subscription_tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {company.subscription_tier.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You are currently on the {company.subscription_tier} plan. Upgrade to access more features and increase your limits.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="w-80">
              <SubscriptionStatus />
            </div>
          </div>
        )}

        {/* Subscription Tiers */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {subscriptionTiers.map((tier) => {
            const isCurrentPlan = company?.subscription_tier === tier.tier;
            
            return (
              <Card key={tier.name} className={`relative ${getTierColor(tier.tier)} ${tier.tier === 'pro' ? 'scale-105' : ''}`}>
                {getTierBadge(tier.tier) && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    {getTierBadge(tier.tier)}
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="text-4xl font-bold text-primary">
                    {tier.price}
                    {tier.tier !== 'custom' && (
                      <span className="text-lg font-normal text-muted-foreground">/month</span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{tier.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Core Limits */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">
                        {tier.tier === 'custom' ? 'Unlimited users' : `Up to ${tier.features.max_users} users`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-4 h-4 text-green-500" />
                      <span className="text-sm">
                        {tier.tier === 'custom' ? 'Unlimited projects' : `Up to ${tier.features.max_projects} projects`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">
                        {tier.tier === 'custom' ? 'Custom storage solution' : `${tier.features.max_storage_gb}GB storage`}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-3">
                      <Check className={`w-4 h-4 ${tier.features.ai_chatbot ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-sm ${!tier.features.ai_chatbot ? 'text-gray-400' : ''}`}>
                        AI Chatbot Assistant
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className={`w-4 h-4 ${tier.features.advanced_analytics ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-sm ${!tier.features.advanced_analytics ? 'text-gray-400' : ''}`}>
                        Advanced Analytics
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className={`w-4 h-4 ${tier.features.api_access ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-sm ${!tier.features.api_access ? 'text-gray-400' : ''}`}>
                        API Access
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className={`w-4 h-4 ${tier.features.custom_integrations ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-sm ${!tier.features.custom_integrations ? 'text-gray-400' : ''}`}>
                        Custom Integrations
                      </span>
                    </div>
                  </div>

                  {/* Support Level */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">{tier.features.support_level}</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2">
                    {tier.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-xs text-muted-foreground">{highlight}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                    {isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : hasAccess ? (
                      <Button 
                        className="w-full" 
                        onClick={() => handleUpgrade(tier.tier)}
                        variant={tier.tier === 'pro' ? 'default' : tier.tier === 'custom' ? 'secondary' : 'outline'}
                      >
                        {tier.tier === 'custom' ? 'Contact Us' : 
                         company && subscriptionTiers.findIndex(t => t.tier === company.subscription_tier) < subscriptionTiers.findIndex(t => t.tier === tier.tier) 
                          ? 'Upgrade' 
                          : 'Switch Plan'}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Contact Admin
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help Choosing?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help you find the perfect plan for your architecture firm.
          </p>
          <Button variant="outline" size="lg">
            Contact Sales
          </Button>
        </div>
      </div>

      {/* Upgrade Confirmation Dialog */}
      {showUpgradeDialog && selectedUpgradeTier && (
        <UpgradeConfirmationDialog
          open={showUpgradeDialog}
          onClose={() => setShowUpgradeDialog(false)}
          selectedTier={selectedUpgradeTier}
        />
      )}
    </div>
  );
} 