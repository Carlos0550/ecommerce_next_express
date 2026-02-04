import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';
export const theme = createTheme({
  fontFamily: 'Stack Sans Text, Arial, Helvetica, sans-serif',
  headings: { fontFamily: 'Stack Sans Text, Arial, Helvetica, sans-serif' },
  colors: {
    rose: [
      '#fff5f7',
      '#ffe9ef',
      '#ffd2df',
      '#ffb0c6',
      '#ff85a7',
      '#ff5586',
      '#ff2f6c',
      '#e61c5b',
      '#c3124a',
      '#8a0735',
    ] as MantineColorsTuple,
  },
  primaryColor: 'rose',
  primaryShade: { light: 6, dark: 6 },
  defaultRadius: 'md',
});
