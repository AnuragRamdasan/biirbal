'use client'

import { useState, useEffect } from 'react';

export function useExtensionDetection() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkExtension = () => {
      // Try to detect the extension by checking for a specific element it might inject
      // or by trying to communicate with it
      try {
        // Method 1: Check if extension injects any global variables or elements
        if (typeof window !== 'undefined') {
          // Check for the extension's content script injection
          const extensionElement = document.querySelector('[data-biirbal-extension]');
          if (extensionElement) {
            setIsInstalled(true);
            setIsChecking(false);
            return;
          }

          // Method 2: Try to communicate with extension via postMessage
          let messageReceived = false;
          const messageHandler = (event: MessageEvent) => {
            if (event.data && event.data.type === 'BIIRBAL_EXTENSION_RESPONSE') {
              messageReceived = true;
              setIsInstalled(true);
              setIsChecking(false);
              window.removeEventListener('message', messageHandler);
            }
          };

          window.addEventListener('message', messageHandler);
          
          // Send a ping message to the extension
          window.postMessage({ type: 'BIIRBAL_EXTENSION_PING' }, '*');
          
          // Wait for response, then timeout if no response
          setTimeout(() => {
            if (!messageReceived) {
              setIsInstalled(false);
              setIsChecking(false);
              window.removeEventListener('message', messageHandler);
            }
          }, 1000);
        }
      } catch (error) {
        console.log('Extension detection error:', error);
        setIsInstalled(false);
        setIsChecking(false);
      }
    };

    // Initial check
    checkExtension();

    // Also check periodically in case extension gets installed during session
    const interval = setInterval(checkExtension, 10000); // Check every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  return { isInstalled, isChecking };
}