import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import BlogListPaginator from '@theme/BlogListPaginator';

type BlogListPaginatorMetadata = Parameters<
  typeof BlogListPaginator
>[0]['metadata'];

type BlogAuthor = {
  name?: string;
};

type BlogTag = {
  label: string;
};

type BlogMetadata = {
  title: string;
  permalink: string;
  description?: string;
  date: string;
  formattedDate?: string;
  authors?: BlogAuthor[];
  tags?: BlogTag[];
};

type BlogListItem = {
  content?: {
    metadata?: BlogMetadata;
  };
  metadata?: BlogMetadata;
};

type BlogListPageProps = {
  metadata: BlogListPaginatorMetadata & {
    blogTitle?: string;
    blogDescription?: string;
  };
  items: BlogListItem[];
};

function normalizeItem(item: BlogListItem): BlogMetadata | null {
  return item.content?.metadata ?? item.metadata ?? null;
}

export default function BlogListPage({ metadata, items }: BlogListPageProps) {
  const posts = items
    .map(normalizeItem)
    .filter((item): item is BlogMetadata => item !== null);
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <Layout
      title={metadata.blogTitle ?? 'Changelog'}
      description={metadata.blogDescription}
      wrapperClassName="theme-blog-list-page"
    >
      <main className="changelog-shell">
        <section className="container changelog-hero">
          <span className="changelog-hero__eyebrow">
            Analytics delivery log
          </span>
          <div className="changelog-hero__grid">
            <div className="changelog-hero__copy">
              <h1>Shipping trust into analytics.</h1>
              <p>
                Public updates for Lightdash models, dashboards, review
                automation, and analytics reliability. Every post is generated
                from merged work and written to explain the user impact first.
              </p>
            </div>
            <aside className="changelog-hero__panel" aria-label="Feed signals">
              <div className="changelog-hero__signal">
                <strong>{posts.length}</strong>
                <span>Versioned updates in the feed</span>
              </div>
              <div className="changelog-hero__signal">
                <strong>Lightdash</strong>
                <span>Semantic layer and dashboard delivery</span>
              </div>
              <div className="changelog-hero__signal">
                <strong>Codex</strong>
                <span>Review and changelog automation in CI</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="container changelog-feed">
          <div className="changelog-feed__header">
            <h2>Latest updates</h2>
            <p>
              Short, chronological notes in the style of a product changelog,
              not release-management noise.
            </p>
          </div>

          <div className="changelog-cards">
            {featured ? (
              <article className="changelog-card changelog-card--featured">
                <div className="changelog-card__meta">
                  <span className="changelog-chip">Featured</span>
                  <span>{featured.formattedDate ?? featured.date}</span>
                </div>
                <h3>
                  <Link to={featured.permalink}>{featured.title}</Link>
                </h3>
                <p>{featured.description}</p>
                <div className="changelog-card__footer">
                  <div className="changelog-card__authors">
                    {featured.authors
                      ?.map((author) => author.name)
                      .join(', ') || 'Analytics Team'}
                  </div>
                  <Link
                    className="changelog-card__link"
                    to={featured.permalink}
                  >
                    Read update
                  </Link>
                </div>
              </article>
            ) : null}

            {rest.map((post) => (
              <article className="changelog-card" key={post.permalink}>
                <div className="changelog-card__meta">
                  <span>{post.formattedDate ?? post.date}</span>
                </div>
                <h3>
                  <Link to={post.permalink}>{post.title}</Link>
                </h3>
                <p>{post.description}</p>
                <div className="changelog-card__tags">
                  {post.tags?.map((tag) => (
                    <span
                      className="changelog-chip"
                      key={`${post.permalink}-${tag.label}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
                <div className="changelog-card__footer">
                  <div className="changelog-card__authors">
                    {post.authors?.map((author) => author.name).join(', ') ||
                      'Analytics Team'}
                  </div>
                  <Link className="changelog-card__link" to={post.permalink}>
                    Read update
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <BlogListPaginator metadata={metadata} />
        </section>
      </main>
    </Layout>
  );
}
