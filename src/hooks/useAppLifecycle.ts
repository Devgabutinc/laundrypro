import { useEffect, useState, useRef } from 'react';
import { App, AppState } from '@capacitor/app';

/**
 * Hook para manejar el ciclo de vida de la aplicación
 * Detecta cuando la aplicación se pone en segundo plano y cuando vuelve a primer plano
 */
export const useAppLifecycle = (onResume?: () => void, onPause?: () => void) => {
  const [appState, setAppState] = useState<'active' | 'inactive'>('active');

  // Usar refs para evitar múltiples registros de listeners
  const resumeListenerRef = useRef<Promise<any> | null>(null);
  const pauseListenerRef = useRef<Promise<any> | null>(null);
  const isListenerRegistered = useRef(false);

  useEffect(() => {
    // Evitar registrar listeners múltiples veces
    if (isListenerRegistered.current) {
      return;
    }

    // Solo registrar eventos si estamos en una plataforma móvil que soporta Capacitor
    try {
      // Registrar eventos de ciclo de vida de la aplicación
      isListenerRegistered.current = true;

      // Limpiar listeners existentes primero para evitar duplicados
      const cleanupExistingListeners = async () => {
        if (resumeListenerRef.current) {
          const listener = await resumeListenerRef.current;
          listener.remove();
          resumeListenerRef.current = null;
        }
        if (pauseListenerRef.current) {
          const listener = await pauseListenerRef.current;
          listener.remove();
          pauseListenerRef.current = null;
        }
      };

      // Limpiar y registrar nuevos listeners
      cleanupExistingListeners().then(() => {
        // Cuando la aplicación vuelve a primer plano
        resumeListenerRef.current = App.addListener('appStateChange', (state: { isActive: boolean }) => {
          if (state.isActive) {
            // App resumed - volviendo a primer plano
            setAppState('active');
            if (onResume) {
              // Ejecutando callback de resume
              onResume();
            }
          }
        });
        
        // Cuando la aplicación se pone en segundo plano
        pauseListenerRef.current = App.addListener('appStateChange', (state: { isActive: boolean }) => {
          if (!state.isActive) {
            // App paused - pasando a segundo plano
            setAppState('inactive');
            if (onPause) {
              // Ejecutando callback de pause
              onPause();
            }
          }
        });
      });
      
      // Limpiar listeners cuando el componente se desmonta
      return () => {
        const cleanup = async () => {
          try {
            if (resumeListenerRef.current) {
              const listener = await resumeListenerRef.current;
              listener.remove();
              resumeListenerRef.current = null;
            }
            if (pauseListenerRef.current) {
              const listener = await pauseListenerRef.current;
              listener.remove();
              pauseListenerRef.current = null;
            }
            isListenerRegistered.current = false;
          } catch (e) {
            // Error al limpiar listeners
          }
        };
        cleanup();
      };
    } catch (error) {
      // Error al registrar eventos de ciclo de vida
      isListenerRegistered.current = false;
    }
    
    return undefined;
  }, []);  // Eliminar dependencias para evitar re-registros
  
  // Efecto separado para actualizar callbacks sin re-registrar listeners
  useEffect(() => {
    // Este efecto solo actualiza las referencias a los callbacks
    // sin necesidad de re-registrar los listeners
  }, [onResume, onPause]);

  return { appState };
};
