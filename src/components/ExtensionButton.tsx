'use client'

import { Button } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useBrowserDetection } from '@/hooks/useBrowserDetection';

interface ExtensionButtonProps {
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
  children?: React.ReactNode;
}

export function ExtensionButton({ 
  style = {}, 
  size = 'large',
  children = 'Install Free Extension'
}: ExtensionButtonProps) {
  const extensionInfo = useBrowserDetection();

  return (
    <Button 
      type="primary" 
      size={size}
      icon={<RocketOutlined />}
      style={style}
      href={extensionInfo.url}
      target="_blank"
    >
      {children}
    </Button>
  );
}