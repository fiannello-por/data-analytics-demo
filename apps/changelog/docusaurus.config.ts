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
  stylesheets: [],
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
          postsPerPage: 50,
          authorsMapPath: 'authors.yml',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'ignore',
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
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Point of Rental Changelog',
      logo: {
        alt: 'Point of Rental Changelog',
        src: 'img/logo.svg',
      },
      items: [],
    },
    footer: {
      style: 'dark',
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
      ],
      copyright: `© ${new Date().getFullYear()} Point of Rental Analytics`,
    },
    prism: {
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
