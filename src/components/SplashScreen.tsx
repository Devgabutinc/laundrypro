// Gunakan path relatif untuk logo
import { useEffect } from 'react';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center z-50">
      <div>
        <img 
          src="/images/logo.svg" 
          alt="LaundryPro Logo" 
          className="w-32 h-32 mb-4"
          onError={(e) => {
            // Fallback jika logo tidak ditemukan
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzJiYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+TFA8L3RleHQ+PC9zdmc+';
          }}
        />
      </div>
      <h1 className="text-white text-2xl font-bold mb-4">
        LaundryPro
      </h1>
      <div className="mt-4">
        <div className="w-12 h-12 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
