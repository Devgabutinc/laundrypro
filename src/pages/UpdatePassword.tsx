import React, { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // Extract tokens from URL
  useEffect(() => {
    // Function to extract parameters from URL
    const extractParamFromUrl = (url: string, param: string): string | null => {
      try {
        // Try to parse URL as URL object first
        const urlObj = new URL(url);
        
        // Check parameter in query string
        const queryParam = urlObj.searchParams.get(param);
        if (queryParam) return queryParam;
        
        // If not in query string, check in hash fragment
        if (urlObj.hash) {
          // Remove # at start of hash
          const hashParams = new URLSearchParams(urlObj.hash.substring(1));
          const hashParam = hashParams.get(param);
          if (hashParam) return hashParam;
        }
        
        // Fallback to regex method if above methods fail
        const regex = new RegExp(`[#&?]${param}=([^&#]*)`);
        const match = regex.exec(url);
        return match ? decodeURIComponent(match[1]) : null;
      } catch (e) {
        console.error('Error parsing URL:', e);
        
        // Fallback to regex method if URL parsing fails
        try {
          const regex = new RegExp(`[#&?]${param}=([^&#]*)`);
          const match = regex.exec(url);
          return match ? decodeURIComponent(match[1]) : null;
        } catch (e) {
          console.error('Regex extraction failed:', e);
          return null;
        }
      }
    };

    // Check for token in URL
    const fullUrl = window.location.href;
    console.log('Current URL:', fullUrl);
    
    // Check for recovery token in query params or hash
    const token = extractParamFromUrl(fullUrl, 'token');
    if (token) {
      console.log('Found recovery token in URL');
      setRecoveryToken(token);
    }
    
    // Check for access token
    const access_token = extractParamFromUrl(fullUrl, 'access_token');
    if (access_token) {
      console.log('Found access token in URL');
      setAccessToken(access_token);
    }
    
    // Check for type=recovery
    const type = extractParamFromUrl(fullUrl, 'type');
    if (type === 'recovery') {
      console.log('URL confirms this is a recovery flow');
    } else {
      console.log('URL type parameter:', type);
    }
    
    // If no token found and user not logged in, redirect to login
    if (!token && !access_token && !session) {
      console.log('No recovery token or access token found, and user not logged in');
      toast({
        title: "Access denied",
        description: "You need a valid reset link to access this page.",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
    }
  }, [location, navigate, toast, session]);

  // If user is already logged in and not in recovery flow, redirect to home
  if (session && !recoveryToken && !accessToken) {
    return <Navigate to="/" replace />;
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    console.log('Attempting to update password');
    
    try {
      let result;
      
      // If we have a recovery token, we need to use it
      if (recoveryToken) {
        console.log('Using recovery token to update password');
        // First try to exchange the token for a session
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: recoveryToken,
            type: 'recovery',
          });
          
          if (sessionError) {
            console.error('Error verifying OTP:', sessionError);
            throw sessionError;
          }
          
          console.log('OTP verification successful:', sessionData);
          
          // Now update the password
          result = await supabase.auth.updateUser({
            password: password,
          });
        } catch (tokenError) {
          console.error('Error with token verification:', tokenError);
          // Fallback to direct password update
          result = await supabase.auth.updateUser({
            password: password,
          });
        }
      } else {
        // Standard password update
        console.log('Using standard password update');
        result = await supabase.auth.updateUser({
          password: password,
        });
      }
      
      const { error } = result || {};
      
      if (error) {
        console.error('Error updating password:', error);
        throw error;
      }
      
      console.log('Password updated successfully');
      toast({
        title: "Password updated successfully",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      
      // Sign out the user to ensure they log in with the new password
      await supabase.auth.signOut();
      
      // Redirect to login page after successful password update
      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 2000);
    } catch (error: any) {
      console.error('Exception during password update:', error);
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
          <CardTitle className="text-2xl text-center">Update Your Password</CardTitle>
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
              {loading ? "Updating..." : "Update Password"}
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

export default UpdatePassword;
