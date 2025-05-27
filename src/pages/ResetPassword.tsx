import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if we have a valid hash token in the URL
  useEffect(() => {
    const hash = window.location.hash;
    console.log("URL hash:", hash);
    
    // Jika ada access_token di URL, berarti link valid
    if (hash && hash.includes('access_token')) {
      setError(null); // Reset error jika token valid
    } else if (window.location.search && window.location.search.includes('type=recovery')) {
      // Jika tidak ada hash tapi ada parameter recovery di URL, berarti proses redirect dari Supabase berhasil
      // tapi mungkin token tidak ditambahkan ke hash dengan benar
      console.log("Recovery process detected, proceeding without hash check");
      setError(null);
    } else {
      // Jika tidak ada token sama sekali, tampilkan error
      setError("Invalid or expired password reset link. Please request a new password reset link.");
    }
  }, []);

  const validatePassword = () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    setError(null);
    return true;
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;
    
    setLoading(true);
    
    try {
      console.log("Attempting to update password...");
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      console.log("Password update response:", error ? "Error: " + error.message : "Success");
      
      if (error) throw error;
      
      setResetSuccess(true);
      toast({
        title: "Password updated successfully",
        description: "Your password has been reset. You can now login with your new password.",
      });
      
      // Clear the hash from the URL to prevent reuse of the token
      window.history.replaceState(null, '', window.location.pathname);
      
      // Automatically redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
      
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description: error?.message || "Failed to update password",
        variant: "destructive",
      });
      setError(error?.message || "Failed to update password");
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
          <CardTitle className="text-2xl text-center">
            {resetSuccess ? "Password Updated" : "Create New Password"}
          </CardTitle>
          <CardDescription className="text-center">
            {resetSuccess 
              ? "Your password has been updated successfully."
              : "Enter your new password below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          
          {resetSuccess ? (
            <div className="text-center space-y-4 mt-4">
              <p className="text-sm text-gray-500">
                You will be redirected to the login page in a few seconds...
              </p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/auth')}
              >
                Go to Login
              </Button>
            </div>
          ) : (
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
                <p className="text-xs text-gray-500">Password must be at least 6 characters long</p>
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
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link to="/auth" className="text-sm text-laundry-primary hover:underline">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
