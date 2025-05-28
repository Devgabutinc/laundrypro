import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SimpleLanding = () => {
  useEffect(() => {
    console.log("SimpleLanding component mounted");
    
    // Log any global errors
    const errorHandler = (event: ErrorEvent) => {
      console.error("Global error in SimpleLanding:", event.error);
    };
    
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 p-4">
      <h1 className="text-3xl font-bold mb-6">Welcome to LaundryPro</h1>
      <p className="text-lg mb-8 text-center max-w-md">
        The simplest way to manage your laundry business
      </p>
      <div className="flex gap-4">
        <Link to="/auth">
          <Button>Login</Button>
        </Link>
        <Link to="/auth?register=true">
          <Button variant="outline">Register</Button>
        </Link>
      </div>
    </div>
  );
};

export default SimpleLanding;
