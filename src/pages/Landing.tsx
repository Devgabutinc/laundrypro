import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Landing page error:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <pre className="bg-white p-4 rounded shadow-sm overflow-auto max-w-full text-sm mb-4">
            {this.state.error?.toString()}
          </pre>
          <p className="mb-4">Please try refreshing the page or contact support if the issue persists.</p>
          <Link to="/">
            <Button variant="outline">Go to Home</Button>
          </Link>
        </div>
      );
    }

    return this.props.children;
  }
}

const Landing = () => {
  console.log("Landing component rendering...");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("Landing component mounted");
    setMounted(true);
    
    // Log any global errors
    const errorHandler = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
    };
    
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (!mounted) {
    console.log("Landing component not yet mounted");
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header/Navbar */}
      <header className="container mx-auto py-4 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-2xl font-bold">
            <span className="text-blue-600">Laundry</span>
            <span className="text-blue-400">Pro</span>
          </div>
        </div>
        <div className="flex gap-4">
          <Link to="/auth">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
              Login
            </button>
          </Link>
          <Link to="/auth?register=true">
            <button className="border border-blue-500 text-blue-500 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors">
              Register
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-8 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
            Manage Your Laundry Business with Ease
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            LaundryPro provides a complete solution for laundry business management, helping you streamline operations, increase efficiency, and grow your business.
          </p>
          <div className="flex gap-4">
            <Link to="/auth?register=true">
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium transition-colors">
                Get Started Free
              </button>
            </Link>
            <Link to="/auth">
              <button className="border border-blue-500 text-blue-500 hover:bg-blue-50 px-6 py-3 rounded-md font-medium transition-colors">
                Learn More
              </button>
            </Link>
          </div>
        </div>
        <div className="md:w-1/2">
          <img 
            src="/hero-image.png" 
            alt="LaundryPro Dashboard" 
            className="rounded-lg shadow-lg w-full" 
            onError={(e) => {
              // Fallback ke placeholder jika gambar tidak ditemukan
              const target = e.target as HTMLImageElement;
              target.src = "https://via.placeholder.com/600x400?text=LaundryPro+Dashboard";
              console.log("Hero image failed to load, using placeholder");
            }}
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-blue-900">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Order Management</h3>
              <p className="text-gray-600">Easily create, track, and manage customer orders from drop-off to delivery.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Financial Tracking</h3>
              <p className="text-gray-600">Track revenue, expenses, and generate detailed financial reports.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Customer Management</h3>
              <p className="text-gray-600">Build customer profiles, track preferences, and implement loyalty programs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-blue-900">Pricing Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border rounded-lg p-8 flex flex-col">
            <h3 className="text-xl font-semibold mb-2">Basic</h3>
            <div className="text-3xl font-bold mb-4">Free</div>
            <p className="text-gray-600 mb-6">Perfect for small laundry businesses just getting started.</p>
            <ul className="mb-8 flex-grow">
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Up to 50 orders/month
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Basic reporting
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Email support
              </li>
            </ul>
            <Link to="/auth?register=true" className="mt-auto">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors">
                Get Started
              </button>
            </Link>
          </div>
          <div className="border rounded-lg p-8 flex flex-col bg-blue-50 border-blue-200 relative">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
              POPULAR
            </div>
            <h3 className="text-xl font-semibold mb-2">Professional</h3>
            <div className="text-3xl font-bold mb-4">Rp 299.000<span className="text-lg font-normal text-gray-600">/mo</span></div>
            <p className="text-gray-600 mb-6">For growing businesses with more advanced needs.</p>
            <ul className="mb-8 flex-grow">
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Unlimited orders
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Advanced reporting
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Priority support
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Customer management
              </li>
            </ul>
            <Link to="/auth?register=true" className="mt-auto">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors">
                Get Started
              </button>
            </Link>
          </div>
          <div className="border rounded-lg p-8 flex flex-col">
            <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
            <div className="text-3xl font-bold mb-4">Rp 599.000<span className="text-lg font-normal text-gray-600">/mo</span></div>
            <p className="text-gray-600 mb-6">For large laundry chains with multiple locations.</p>
            <ul className="mb-8 flex-grow">
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Everything in Professional
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Multi-location support
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Dedicated account manager
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Custom integrations
              </li>
            </ul>
            <Link to="/auth?register=true" className="mt-auto">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors">
                Contact Sales
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">LaundryPro</h3>
              <p className="text-blue-200">The complete solution for laundry business management.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-blue-200 hover:text-white">Features</a></li>
                <li><a href="#" className="text-blue-200 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-blue-200 hover:text-white">Testimonials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-blue-200 hover:text-white">About Us</a></li>
                <li><Link to="/privacy-policy" className="text-blue-200 hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/terms-conditions" className="text-blue-200 hover:text-white">Terms & Conditions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li className="text-blue-200">support@laundrypro.com</li>
                <li className="text-blue-200">+62 812 3456 7890</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-blue-200">
            <p>© {new Date().getFullYear()} LaundryPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const WrappedLanding = () => {
  return (
    <ErrorBoundary>
      <Landing />
    </ErrorBoundary>
  );
};

export default WrappedLanding;
