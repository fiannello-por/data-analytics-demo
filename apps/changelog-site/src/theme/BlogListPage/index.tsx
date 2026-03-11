import { type ReactNode, useMemo, useState } from 'react';

import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import BlogListPaginator from '@theme/BlogListPaginator';
import {
  Globe,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type BlogListPaginatorMetadata = Parameters<
  typeof BlogListPaginator
>[0]['metadata'];

type BlogAuthor = {
  name?: string;
  imageURL?: string;
  url?: string;
};

type BlogTag = {
  label: string;
  permalink?: string;
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

type BlogFrontMatter = {
  category?: string;
  [key: string]: unknown;
};

type BlogListItem = {
  content?: {
    metadata?: BlogMetadata;
    frontMatter?: BlogFrontMatter;
  };
  metadata?: BlogMetadata;
  frontMatter?: BlogFrontMatter;
};

type BlogListPageProps = {
  metadata: BlogListPaginatorMetadata & {
    blogTitle?: string;
    blogDescription?: string;
  };
  items: BlogListItem[];
};

type NormalizedPost = BlogMetadata & {
  category: string;
};

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

const ICON_SIZE = 16;

const CATEGORIES = [
  {
    id: 'all',
    label: 'ALL',
    icon: <Globe size={ICON_SIZE} />,
  },
  {
    id: 'release',
    label: 'NEW RELEASES',
    icon: <Sparkles size={ICON_SIZE} color="#3fb950" />,
  },
  {
    id: 'improvement',
    label: 'IMPROVEMENTS',
    icon: <ClipboardList size={ICON_SIZE} color="#388bfd" />,
  },
  {
    id: 'retired',
    label: 'RETIRED',
    icon: <AlertTriangle size={ICON_SIZE} color="#f85149" />,
  },
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeItem(item: BlogListItem): NormalizedPost | null {
  const meta = item.content?.metadata ?? item.metadata;
  if (!meta) return null;
  const fm = item.content?.frontMatter ?? item.frontMatter;
  return { ...meta, category: (fm?.category as string) || 'improvement' };
}

function formatEntryDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}

function formatMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function ChangelogHero(): ReactNode {
  const cols = 128;
  const rows = 40;
  const spacingX = 11;
  const spacingY = 7;
  const svgWidth = cols * spacingX;
  const svgHeight = rows * spacingY;

  const dots: ReactNode[] = [];
  const gridLines: ReactNode[] = [];

  for (let row = 0; row < rows; row++) {
    const ny = row / (rows - 1);
    const dy = 1 - ny;
    const falloff = Math.max(0, 1 - Math.abs(dy) * 1.1);
    const lineOpacity = falloff * 0.03;
    if (lineOpacity >= 0.004) {
      gridLines.push(
        <line
          key={`h-${row}`}
          x1={0}
          y1={row * spacingY}
          x2={svgWidth}
          y2={row * spacingY}
          stroke="#30363d"
          strokeWidth={0.3}
          opacity={lineOpacity}
        />,
      );
    }
  }

  for (let col = 0; col < cols; col++) {
    const nx = col / (cols - 1);
    const dx = nx - 0.5;
    const falloff = Math.max(0, 1 - Math.abs(dx) * 1.6);
    const lineOpacity = falloff * 0.02;
    if (lineOpacity >= 0.004) {
      gridLines.push(
        <line
          key={`v-${col}`}
          x1={col * spacingX}
          y1={0}
          x2={col * spacingX}
          y2={svgHeight}
          stroke="#30363d"
          strokeWidth={0.3}
          opacity={lineOpacity}
        />,
      );
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const nx = col / (cols - 1);
      const ny = row / (rows - 1);

      const dx = nx - 0.5;
      const dy = 1 - ny;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const perspectiveScale = 1 - dy * 0.5;
      const baseRadius = 0.85 * perspectiveScale;
      const falloff = Math.max(0, 1 - dist * 1.05);
      const radius = baseRadius * falloff;

      if (radius < 0.1) continue;

      const brightness = falloff;
      const r = Math.round(30 + brightness * 50);
      const g = Math.round(36 + brightness * 52);
      const b = Math.round(48 + brightness * 58);
      const dotOpacity = 0.35 + falloff * 0.65;

      const cx = col * spacingX + (row % 2 === 0 ? 0 : spacingX / 2);
      const cy = row * spacingY;

      dots.push(
        <circle
          key={`${row}-${col}`}
          cx={cx}
          cy={cy}
          r={radius}
          fill={`rgb(${r}, ${g}, ${b})`}
          opacity={dotOpacity}
        />,
      );
    }
  }

  return (
    <div className="changelog-hero" aria-hidden="true">
      <svg
        className="changelog-hero__svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {gridLines}
        {dots}
      </svg>
      <div className="changelog-hero__glow" />
    </div>
  );
}

function AuthorAvatars({
  authors,
  size = 24,
}: {
  authors: BlogAuthor[];
  size?: number;
}): ReactNode {
  if (!authors.length) return null;
  return (
    <div className="entry-authors">
      <div className="entry-authors__avatars">
        {authors.map((author, i) => (
          <img
            key={author.name ?? i}
            src={
              author.imageURL ?? 'https://avatars.githubusercontent.com/u/0?v=4'
            }
            alt={author.name ?? ''}
            className="entry-authors__avatar"
            style={{
              width: size,
              height: size,
              zIndex: authors.length - i,
            }}
          />
        ))}
      </div>
      <span className="entry-authors__names">
        {authors.map((a) => a.name).join(', ')}
      </span>
    </div>
  );
}

function EntryRow({ post }: { post: NormalizedPost }): ReactNode {
  const tags = post.tags ?? [];

  return (
    <article className="entry-row">
      <div className="entry-row__meta">
        <span className="entry-row__date">{formatEntryDate(post.date)}</span>
        <span className="entry-category">{post.category.toUpperCase()}</span>
      </div>
      <div className="entry-row__content">
        <div className="entry-row__title">
          <Link to={post.permalink}>{post.title}</Link>
        </div>
        {tags.length > 0 && (
          <div className="entry-row__tags">
            {tags.map((tag) => (
              <span className="entry-row__tag" key={tag.label}>
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {post.authors && post.authors.length > 0 && (
        <AuthorAvatars authors={post.authors} />
      )}
    </article>
  );
}

function FilterDrawer({
  open,
  onClose,
  allTags,
  selectedTags,
  matchMode,
  onToggleTag,
  onSetMatchMode,
  onClear,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  allTags: string[];
  selectedTags: Set<string>;
  matchMode: 'any' | 'all';
  onToggleTag: (tag: string) => void;
  onSetMatchMode: (mode: 'any' | 'all') => void;
  onClear: () => void;
  onApply: () => void;
}): ReactNode {
  return (
    <>
      <div
        className={`filter-overlay${open ? ' filter-overlay--open' : ''}`}
        onClick={onClose}
      />
      <div className={`filter-drawer${open ? ' filter-drawer--open' : ''}`}>
        <div className="filter-header">
          <h3 className="filter-title">Filters</h3>
          <button
            className="filter-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={16} />
          </button>
        </div>

        <div className="filter-match">
          <span className="filter-match__label">Match:</span>
          <span
            className={`filter-match__option${matchMode === 'any' ? ' filter-match__option--active' : ''}`}
          >
            Any
          </span>
          <button
            className={`filter-toggle-track${matchMode === 'all' ? ' filter-toggle-track--all' : ''}`}
            onClick={() => onSetMatchMode(matchMode === 'any' ? 'all' : 'any')}
            aria-label={`Match mode: ${matchMode}`}
          >
            <div className="filter-toggle-thumb" />
          </button>
          <span
            className={`filter-match__option${matchMode === 'all' ? ' filter-match__option--active' : ''}`}
          >
            All
          </span>
        </div>

        <h4 className="filter-tags-heading">Tags</h4>
        <div className="filter-tags-list">
          {allTags.map((tag) => (
            <label className="filter-tag-item" key={tag}>
              <span
                className={`filter-checkbox${selectedTags.has(tag) ? ' filter-checkbox--checked' : ''}`}
              >
                <Check size={10} className="filter-checkbox__check" />
              </span>
              <span className="filter-tag-label">{tag}</span>
              <input
                type="checkbox"
                checked={selectedTags.has(tag)}
                onChange={() => onToggleTag(tag)}
                hidden
              />
            </label>
          ))}
        </div>

        <div className="filter-actions">
          <button className="filter-clear" onClick={onClear}>
            CLEAR ALL
          </button>
          <button className="filter-apply" onClick={onApply}>
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function BlogListPage({
  metadata,
  items,
}: BlogListPageProps): ReactNode {
  const posts = useMemo(
    () =>
      items.map(normalizeItem).filter((p): p is NormalizedPost => p !== null),
    [items],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const post of posts) {
      for (const tag of post.tags ?? []) {
        set.add(tag.label);
      }
    }
    return [...set].sort();
  }, [posts]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingTags, setPendingTags] = useState<Set<string>>(new Set());
  const [appliedTags, setAppliedTags] = useState<Set<string>>(new Set());
  const [pendingMatch, setPendingMatch] = useState<'any' | 'all'>('any');
  const [appliedMatch, setAppliedMatch] = useState<'any' | 'all'>('any');
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(
    new Set(),
  );

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (activeCategory !== 'all' && post.category !== activeCategory)
        return false;
      if (appliedTags.size > 0) {
        const postTags = (post.tags ?? []).map((t) => t.label);
        if (appliedMatch === 'all') {
          return [...appliedTags].every((t) => postTags.includes(t));
        }
        return [...appliedTags].some((t) => postTags.includes(t));
      }
      return true;
    });
  }, [posts, activeCategory, appliedTags, appliedMatch]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; posts: NormalizedPost[] }>();
    for (const post of filteredPosts) {
      const key = formatMonthKey(post.date);
      if (!map.has(key)) {
        map.set(key, { label: formatMonthLabel(post.date), posts: [] });
      }
      map.get(key)!.posts.push(post);
    }
    return map;
  }, [filteredPosts]);

  const openFilter = (): void => {
    setPendingTags(new Set(appliedTags));
    setPendingMatch(appliedMatch);
    setFilterOpen(true);
  };

  const toggleTag = (tag: string): void => {
    setPendingTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const applyFilters = (): void => {
    setAppliedTags(new Set(pendingTags));
    setAppliedMatch(pendingMatch);
    setFilterOpen(false);
  };

  const clearFilters = (): void => {
    setPendingTags(new Set());
    setPendingMatch('any');
  };

  const toggleMonth = (key: string): void => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filterCount = appliedTags.size;

  return (
    <Layout
      title={metadata.blogTitle ?? 'Changelog'}
      description={metadata.blogDescription}
      wrapperClassName="theme-blog-list-page"
    >
      <main className="changelog-shell">
        <ChangelogHero />

        <header className="changelog-header">
          <h1>Changelog</h1>
          <span className="changelog-header__subtitle">
            Point Of Rental Analytics
          </span>
        </header>

        <nav className="changelog-categories">
          {CATEGORIES.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`category-tab${activeCategory === id ? ' category-tab--active' : ''}`}
              onClick={() => setActiveCategory(id)}
            >
              <span className="category-tab__icon">{icon}</span>
              {label}
            </button>
          ))}
          <button className="filter-button" onClick={openFilter}>
            FILTERS{filterCount > 0 ? ` (${filterCount})` : ''}
            <SlidersHorizontal size={ICON_SIZE} />
          </button>
        </nav>

        <div className="changelog-separator">
          <div className="changelog-separator__line" />
        </div>

        <FilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          allTags={allTags}
          selectedTags={pendingTags}
          matchMode={pendingMatch}
          onToggleTag={toggleTag}
          onSetMatchMode={setPendingMatch}
          onClear={clearFilters}
          onApply={applyFilters}
        />

        <section>
          {filteredPosts.length === 0 ? (
            <p className="changelog-empty">
              No entries match the current filters.
            </p>
          ) : (
            [...grouped.entries()].map(
              ([key, { label, posts: monthPosts }]) => {
                const collapsed = collapsedMonths.has(key);
                return (
                  <div className="month-group" key={key}>
                    <div
                      className="month-header"
                      onClick={() => toggleMonth(key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          toggleMonth(key);
                      }}
                    >
                      <h2>
                        {label}
                        <ChevronDown
                          size={20}
                          className={`month-header__chevron${collapsed ? ' month-header__chevron--collapsed' : ''}`}
                        />
                      </h2>
                    </div>
                    {!collapsed &&
                      monthPosts.map((post) => (
                        <EntryRow key={post.permalink} post={post} />
                      ))}
                  </div>
                );
              },
            )
          )}
        </section>

        <BlogListPaginator metadata={metadata} />
      </main>
    </Layout>
  );
}
