'use client'

import { useState, useEffect } from 'react';
import { detectBrowser, ExtensionInfo } from '@/lib/browser-detection';

export function useBrowserDetection() {
  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo>({
    url: 'https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae',
    storeName: 'Chrome Store',
    browserName: 'Chrome'
  });

  useEffect(() => {
    setExtensionInfo(detectBrowser());
  }, []);

  return extensionInfo;
}