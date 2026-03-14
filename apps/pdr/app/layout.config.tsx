import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <Image src="/logo.png" alt="Point of Rental" width={40} height={40} />,
    transparentMode: 'top',
    enableSearch: false,
  },
  githubUrl: 'https://github.com/fiannello-por/data-analytics-demo',
};
