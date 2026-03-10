import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Point of Rental Changelog',
  tagline: 'Semantic layer, reporting, and analytics delivery updates.',
  favicon: 'img/logo.svg',
  future: {
    v4: true,
  },
  url: 'https://point-of-rental-analytics.vercel.app',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,600;6..72,700&family=Space+Grotesk:wght@400;500;700&display=swap',
  ],
  presets: [
    [
      'classic',
      {
        docs: false,
        blog: {
          routeBasePath: '/',
          blogTitle: 'Changelog',
          blogDescription:
            'Public updates for analytics delivery, Lightdash semantics, dashboard quality, and automation.',
          blogSidebarTitle: 'Recent updates',
          blogSidebarCount: 'ALL',
          showReadingTime: false,
          postsPerPage: 12,
          authorsMapPath: 'authors.yml',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Point of Rental Changelog',
      logo: {
        alt: 'Point of Rental Changelog',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/',
          position: 'left',
          label: 'Latest',
        },
        {
          href: 'https://point-of-rental-analytics.vercel.app/rss.xml',
          label: 'RSS',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Repository',
          items: [
            {
              label: 'Main README',
              href: 'https://github.com/fiannello-por/data-analytics-demo',
            },
          ],
        },
        {
          title: 'Release process',
          items: [
            {
              label: 'Changelog operations',
              href: 'https://github.com/fiannello-por/data-analytics-demo/blob/main/docs/changelog-ops.md',
            },
          ],
        },
        {
          title: 'Feeds',
          items: [
            {
              label: 'RSS',
              href: 'https://point-of-rental-analytics.vercel.app/rss.xml',
            },
            {
              label: 'Atom',
              href: 'https://point-of-rental-analytics.vercel.app/atom.xml',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Point of Rental Analytics.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.github,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
