import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Extract token from URL on component mount
  useEffect(() => {
    // Get the full URL
    const url = window.location.href;
    console.log("Current URL:", url);

    // Extract token from URL - try multiple approaches
    // First try query parameter
    const urlObj = new URL(url);
    const queryToken = urlObj.searchParams.get('token');
    
    // Then try regex as fallback
    const tokenRegex = /token=([^&#]+)/;
    const match = url.match(tokenRegex);
    
    if (queryToken) {
      console.log("Found token in query params:", queryToken);
      setToken(queryToken);
    } else if (match && match[1]) {
      const extractedToken = match[1];
      console.log("Found token via regex:", extractedToken);
      setToken(extractedToken);
    } else {
      console.log("No token found in URL");
      toast({
        title: "Invalid reset link",
        description: "This password reset link is invalid or has expired. Please request a new password reset link from the login page.",
        variant: "destructive",
      });
      
      // After 3 seconds, redirect to login page
      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 3000);
    }
  }, [toast, navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate token
    if (!token) {
      toast({
        title: "Invalid reset link",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate password
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate password confirmation
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    console.log("Attempting to update password with token");
    
    try {
      // Verify the recovery token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });
      
      if (verifyError) {
        console.error("Error verifying token:", verifyError);
        throw verifyError;
      }
      
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });
      
      if (updateError) {
        console.error("Error updating password:", updateError);
        throw updateError;
      }
      
      console.log("Password updated successfully");
      toast({
        title: "Password updated successfully",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      
      // Sign out the user
      await supabase.auth.signOut();
      
      // Redirect to login page
      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 2000);
    } catch (error: any) {
      console.error("Error during password reset:", error);
      toast({
        title: "Failed to update password",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="text-3xl font-bold text-center">
              <span className="text-laundry-primary">Laundry</span>
              <span className="text-laundry-accent">Pro</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Create a new secure password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            © 2025 LaundryPro. All rights reserved.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
