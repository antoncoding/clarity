import { useMemo } from 'react';
import { convertToChineseSetting } from '@/utils/ui/chinese';

export function useChineseConversion(text: string): string {
  return useMemo(() => {
    return convertToChineseSetting(text);
  }, [text]);
} 