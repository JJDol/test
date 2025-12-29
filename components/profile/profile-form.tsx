"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordResetButton } from "@/components/ui/password-reset-button";
import { usePasswordReset } from "@/hooks/use-password-reset";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

interface ProfileFormProps {
  onProfileUpdated?: () => void;
}

export function ProfileForm({ onProfileUpdated }: ProfileFormProps) {
  const { currentUser, user, isLoading } = useAuth();
  const { toast } = useToast();
  const { sendPasswordReset, isSubmitting } = usePasswordReset();
  const { saveProfile } = useProfile();
  
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: user?.email || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Update form data when user data changes
  useEffect(() => {
    if (currentUser && user) {
      setFormData({
        name: currentUser.name || "",
        email: user.email || "",
      });
    }
  }, [currentUser, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const success = await saveProfile(formData.name);
    if (success) {
      onProfileUpdated?.();
    }
    
    setIsSaving(false);
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Could not retrieve your email address.",
        variant: "destructive",
      });
      return;
    }

    await sendPasswordReset(user.email);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your personal information here
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Email cannot be changed. Contact admin for email changes.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              name="role"
              value={currentUser?.role || "USER"}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Role is assigned by administrators
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Password Reset</Label>
            <div className="flex items-center gap-2">
              <PasswordResetButton
                type="button"
                isSubmitting={isSubmitting}
                onClick={handleResetPassword}
                variant="compact"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              We'll send a password reset link to your email address
            </p>
          </div>
          
          <div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
