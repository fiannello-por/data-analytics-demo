import defaultMdxComponents from 'fumadocs-ui/mdx';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { Callout } from 'fumadocs-ui/components/callout';
import {
  FlowDiagram,
  Pipeline,
  BranchFlow,
  Timeline,
} from '@/app/components/diagrams';

function getPageOrder(): { url: string; title: string }[] {
  const pages: { url: string; title: string }[] = [];
  for (const item of source.pageTree.children) {
    if (item.type === 'page') {
      pages.push({ url: item.url, title: String(item.name) });
    }
  }
  return pages;
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const isIndex = !params.slug || params.slug.length === 0;

  const pages = getPageOrder();
  const currentUrl = `/${params.slug?.join('/') ?? ''}`;
  const currentIndex = pages.findIndex((p) => p.url === currentUrl);
  const prev = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const next = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

  return (
    <DocsPage
      toc={page.data.toc}
      tableOfContent={{ style: 'clerk' }}
      full={page.data.full}
    >
      {!isIndex && <DocsTitle>{page.data.title}</DocsTitle>}
      {!isIndex && <DocsDescription>{page.data.description}</DocsDescription>}
      <DocsBody>
        <MDX
          components={{
            ...defaultMdxComponents,
            FlowDiagram,
            Pipeline,
            BranchFlow,
            Timeline,
            blockquote: (props) => <Callout>{props.children}</Callout>,
          }}
        />
        {(prev || next) && (
          <nav className="page-nav not-prose">
            {prev ? (
              <Link href={prev.url}>
                <span className="page-nav-label">Previous</span>
                <span className="page-nav-title">{prev.title}</span>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link href={next.url} className="page-nav-next">
                <span className="page-nav-label">Next</span>
                <span className="page-nav-title">{next.title}</span>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        )}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
