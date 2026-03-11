import type { ReactNode } from 'react';

import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Author = {
  name?: string;
  imageURL?: string;
  url?: string;
};

type TagMeta = {
  label: string;
  permalink: string;
};

type NavItem = {
  title: string;
  permalink: string;
};

type ContentMetadata = {
  title: string;
  date: string;
  description?: string;
  authors: Author[];
  tags: TagMeta[];
  permalink: string;
  prevItem?: NavItem;
  nextItem?: NavItem;
};

type ContentFrontMatter = {
  category?: string;
  [key: string]: unknown;
};

type ContentAssets = {
  authorsImageUrls?: (string | undefined)[];
};

type ContentComponent = {
  (): ReactNode;
  metadata: ContentMetadata;
  frontMatter: ContentFrontMatter;
  assets: ContentAssets;
};

type Props = {
  content: ContentComponent;
  sidebar?: unknown;
  blogMetadata?: unknown;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<string, string> = {
  release: 'RELEASE',
  improvement: 'IMPROVEMENT',
  retired: 'RETIRED',
};

function formatPostDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function BlogPostPage({ content: Content }: Props): ReactNode {
  const { metadata, frontMatter, assets } = Content;
  const { title, date, description, authors, tags, prevItem, nextItem } =
    metadata;
  const category = (frontMatter.category as string) || 'improvement';
  const categoryLabel = CATEGORY_LABELS[category] ?? category.toUpperCase();

  const resolvedAuthors = authors.map((author, i) => ({
    ...author,
    imageURL: assets.authorsImageUrls?.[i] ?? author.imageURL,
  }));

  return (
    <Layout title={title} description={description}>
      <Head>
        <html className="theme-blog-post-page" />
      </Head>
      <main className="post-page">
        <nav className="post-nav-top">
          <Link to="/">
            <ArrowLeft
              size={14}
              style={{ marginRight: 6, verticalAlign: 'middle' }}
            />
            Back to changelog
          </Link>
        </nav>

        <header className="post-header">
          <span className={`entry-category entry-category--${category}`}>
            {categoryLabel}
          </span>
          <time className="post-date">{formatPostDate(date)}</time>
          <h1 className="post-title">{title}</h1>
          {resolvedAuthors.length > 0 && (
            <div className="post-authors">
              <div className="post-authors__avatars">
                {resolvedAuthors.map((author, i) => (
                  <img
                    key={author.name ?? i}
                    src={
                      author.imageURL ??
                      'https://avatars.githubusercontent.com/u/0?v=4'
                    }
                    alt={author.name ?? ''}
                    className="post-authors__avatar"
                    style={{ zIndex: resolvedAuthors.length - i }}
                  />
                ))}
              </div>
              <span className="post-authors__names">
                {resolvedAuthors.map((a) => a.name).join(', ')}
              </span>
            </div>
          )}
        </header>

        <article className="post-content">
          <Content />
        </article>

        <footer className="post-footer">
          {tags.length > 0 && (
            <div className="post-tags">
              {tags.map((tag) => (
                <Link className="post-tag" to={tag.permalink} key={tag.label}>
                  {tag.label}
                </Link>
              ))}
            </div>
          )}
        </footer>

        {(prevItem || nextItem) && (
          <nav className="post-nav-bottom">
            {prevItem ? (
              <div className="post-nav-item">
                <span className="post-nav-item__label">
                  <ArrowLeft size={12} style={{ marginRight: 4 }} /> Previous
                </span>
                <div className="post-nav-item__title">
                  <Link to={prevItem.permalink}>{prevItem.title}</Link>
                </div>
              </div>
            ) : (
              <div />
            )}
            {nextItem ? (
              <div className="post-nav-item">
                <span className="post-nav-item__label">
                  Next <ArrowRight size={12} style={{ marginLeft: 4 }} />
                </span>
                <div className="post-nav-item__title">
                  <Link to={nextItem.permalink}>{nextItem.title}</Link>
                </div>
              </div>
            ) : (
              <div />
            )}
          </nav>
        )}
      </main>
    </Layout>
  );
}
