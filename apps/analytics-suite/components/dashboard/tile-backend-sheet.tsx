'use client';

import * as React from 'react';
import {
  CheckIcon,
  CodeXmlIcon,
  CopyIcon,
  DatabaseZapIcon,
  FileJson2Icon,
  InfoIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TileBackendTrace } from '@/lib/dashboard/contracts';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GitHubMark, LightdashMark } from '@/components/ui/brand-icons';

type CodeLanguage = 'json' | 'yaml' | 'sql';

function TileKindBadge({ kind }: { kind: TileBackendTrace['kind'] }) {
  return (
    <Badge
      variant="outline"
      className="rounded-md px-2 py-1 text-[11px] font-medium"
    >
      {kind === 'composite' ? 'Composite tile' : 'Single tile'}
    </Badge>
  );
}

type SemanticFieldKind = 'measure' | 'dimension' | 'filter';

type SemanticFieldChip = {
  kind: SemanticFieldKind;
  name: string;
};

function MetadataItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-14 items-center grid-cols-[max-content_minmax(0,1fr)] gap-3 px-4 py-2.5">
      <p className="pr-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 text-sm leading-5 text-foreground">
        {children}
      </div>
    </div>
  );
}

function collectSemanticFields(trace: TileBackendTrace): SemanticFieldChip[] {
  const seen = new Set<string>();
  const fields: SemanticFieldChip[] = [];

  function addField(kind: SemanticFieldKind, name: string | undefined) {
    if (!name) {
      return;
    }

    const key = `${kind}:${name}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    fields.push({ kind, name });
  }

  for (const execution of trace.executions) {
    for (const measure of execution.semanticRequest.measures ?? []) {
      addField('measure', measure);
    }

    for (const dimension of execution.semanticRequest.dimensions ?? []) {
      addField('dimension', dimension);
    }

    for (const filter of execution.semanticRequest.filters ?? []) {
      addField('filter', filter.field);
    }

    for (const sort of execution.semanticRequest.sorts ?? []) {
      addField('dimension', sort.field);
    }
  }

  return fields;
}

function FieldBadge({ field }: { field: SemanticFieldChip }) {
  const styles: Record<SemanticFieldKind, string> = {
    measure:
      'border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15',
    dimension:
      'border-sky-500/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15',
    filter:
      'border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        styles[field.kind],
      )}
    >
      {field.name}
    </Badge>
  );
}

function CopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Code copied');
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        'rounded-md border border-border/60 bg-background/80 text-muted-foreground shadow-sm backdrop-blur hover:bg-background hover:text-foreground',
        copied &&
          'border-emerald-500/25 bg-emerald-500/8 text-emerald-200 hover:bg-emerald-500/10 hover:text-emerald-100',
        className,
      )}
      aria-label={copied ? 'Code copied' : 'Copy code'}
      onClick={handleCopy}
    >
      <span
        aria-live="polite"
        className="inline-flex items-center justify-center"
      >
        {copied ? (
          <CheckIcon className="size-3" />
        ) : (
          <CopyIcon className="size-3" />
        )}
      </span>
    </Button>
  );
}

function highlightJsonValue(value: string) {
  if (value === '') {
    return [];
  }

  const stringMatch = value.match(/^"([^"]*)"(,?)$/);
  if (stringMatch) {
    return [
      { text: `"${stringMatch[1]}"`, className: 'text-emerald-300' },
      { text: stringMatch[2], className: 'text-foreground/55' },
    ];
  }

  const numberMatch = value.match(/^(-?\d+(?:\.\d+)?)(,?)$/);
  if (numberMatch) {
    return [
      { text: numberMatch[1], className: 'text-amber-300' },
      { text: numberMatch[2], className: 'text-foreground/55' },
    ];
  }

  const literalMatch = value.match(/^(true|false|null)(,?)$/);
  if (literalMatch) {
    return [
      { text: literalMatch[1], className: 'text-violet-300' },
      { text: literalMatch[2], className: 'text-foreground/55' },
    ];
  }

  return [{ text: value, className: 'text-foreground/90' }];
}

function highlightJson(line: string) {
  const match = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)$/);
  if (!match) {
    return [{ text: line, className: 'text-foreground/90' }];
  }

  const [, indent, key, separator, value] = match;

  return [
    { text: indent, className: 'text-foreground/90' },
    { text: `"${key}"`, className: 'text-cyan-300' },
    { text: separator, className: 'text-foreground/55' },
    ...highlightJsonValue(value),
  ];
}

function highlightYaml(line: string) {
  const match = line.match(/^(\s*-?\s*)([A-Za-z0-9_]+)(:\s*)(.*)$/);
  if (!match) {
    return [{ text: line, className: 'text-foreground/90' }];
  }

  const [, prefix, key, separator, value] = match;
  const valueClassName = /^\d/.test(value)
    ? 'text-amber-300'
    : value
      ? 'text-emerald-300'
      : 'text-foreground/90';

  return [
    { text: prefix, className: 'text-foreground/90' },
    { text: key, className: 'text-cyan-300' },
    { text: separator, className: 'text-foreground/55' },
    { text: value, className: valueClassName },
  ];
}

const SQL_KEYWORDS = new Set([
  'all',
  'and',
  'as',
  'asc',
  'between',
  'by',
  'case',
  'cross',
  'desc',
  'distinct',
  'else',
  'end',
  'except',
  'exists',
  'from',
  'full',
  'group',
  'having',
  'in',
  'inner',
  'intersect',
  'is',
  'join',
  'left',
  'like',
  'limit',
  'not',
  'null',
  'on',
  'or',
  'order',
  'outer',
  'over',
  'partition',
  'qualify',
  'right',
  'rows',
  'select',
  'then',
  'union',
  'unnest',
  'using',
  'when',
  'where',
  'with',
]);

const SQL_TOKEN_REGEX =
  /(--.*$|\/\*.*?\*\/|`[^`]*`|'(?:''|[^'])*'|"(?:\\"|[^"])*"|>=|<=|<>|!=|[-+*/%=<>]|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b(?=\s*\()|\b[A-Za-z_][A-Za-z0-9_]*\b|[()[\]{},.;])/g;

function pushSqlTextSegment(
  parts: Array<{ text: string; className: string }>,
  text: string,
  className = 'text-foreground/90',
) {
  if (!text) {
    return;
  }

  parts.push({ text, className });
}

function getSqlTokenClass(token: string, nextText: string) {
  if (token.startsWith('--') || token.startsWith('/*')) {
    return 'text-muted-foreground/65';
  }

  if (token.startsWith('`')) {
    return 'text-sky-300';
  }

  if (token.startsWith("'") || token.startsWith('"')) {
    return 'text-emerald-300';
  }

  if (/^\d/.test(token)) {
    return 'text-amber-300';
  }

  if (/^[()[\]{},.;]$/.test(token)) {
    if (token === '.') {
      return 'text-cyan-200/80';
    }
    if (token === ',') {
      return 'text-foreground/45';
    }
    return 'text-foreground/55';
  }

  if (/^(>=|<=|<>|!=|[-+*/%=<>])$/.test(token)) {
    return 'text-violet-300';
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
    const lower = token.toLowerCase();
    if (lower === 'null') {
      return 'text-fuchsia-300';
    }
    if (SQL_KEYWORDS.has(lower)) {
      return 'text-cyan-300';
    }
    if (/^\s*\(/.test(nextText)) {
      return 'text-amber-300';
    }
    return 'text-amber-200';
  }

  return 'text-foreground/90';
}

function highlightSql(line: string) {
  const parts: Array<{ text: string; className: string }> = [];
  let lastIndex = 0;

  for (const match of line.matchAll(SQL_TOKEN_REGEX)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      pushSqlTextSegment(parts, line.slice(lastIndex, index));
    }

    pushSqlTextSegment(
      parts,
      token,
      getSqlTokenClass(token, line.slice(index + token.length)),
    );
    lastIndex = index + token.length;
  }

  if (lastIndex < line.length) {
    pushSqlTextSegment(parts, line.slice(lastIndex));
  }

  return parts.length > 0
    ? parts
    : [{ text: line, className: 'text-foreground/90' }];
}

function highlightLine(line: string, language: CodeLanguage) {
  if (language === 'json') {
    return highlightJson(line);
  }

  if (language === 'yaml') {
    return highlightYaml(line);
  }

  return highlightSql(line);
}

function HighlightedCode({
  content,
  language,
}: {
  content: string;
  language: CodeLanguage;
}) {
  const lines = content.split('\n');

  return (
    <code className="grid min-w-full grid-cols-[auto_1fr]">
      {lines.map((line, lineIndex) => (
        <React.Fragment key={`${language}-${lineIndex}`}>
          <span className="select-none pr-4 text-right text-[10px] text-muted-foreground/45">
            {lineIndex + 1}
          </span>
          <div className="min-h-6">
            {highlightLine(line, language).map((token, tokenIndex) => (
              <span
                key={`${language}-${lineIndex}-${tokenIndex}`}
                className={token.className}
              >
                {token.text}
              </span>
            ))}
            {lineIndex < lines.length - 1 ? '\n' : null}
          </div>
        </React.Fragment>
      ))}
    </code>
  );
}

function CodeSection({
  title,
  icon,
  content,
  language,
  headerAction,
  className,
  preClassName,
}: {
  title: string;
  icon: React.ReactNode;
  content: string;
  language: CodeLanguage;
  headerAction?: React.ReactNode;
  className?: string;
  preClassName?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border/35 bg-background/15 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {icon}
            {title}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <pre
            className={cn(
              'overflow-auto px-4 py-3 text-xs leading-6 text-foreground/90',
              preClassName,
            )}
          >
            <HighlightedCode content={content} language={language} />
          </pre>
        </div>
      </div>
    </section>
  );
}

function ExecutionsSummary({
  executions,
}: {
  executions: TileBackendTrace['executions'];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {executions.map((execution) => (
        <Badge
          key={execution.label}
          variant="secondary"
          className="rounded-md px-1.5 py-0.5"
        >
          {execution.label}
        </Badge>
      ))}
    </div>
  );
}

function MetadataSection({ trace }: { trace: TileBackendTrace }) {
  const fields = collectSemanticFields(trace);
  const items = [
    {
      label: 'Model',
      value: (
        <div className="inline-flex max-w-full overflow-x-auto whitespace-nowrap rounded-md border border-border/60 bg-background/70 px-2.5 py-1 font-mono text-xs text-foreground/90">
          {trace.model}
        </div>
      ),
    },
    {
      label: 'Cache',
      value: <span>{formatCacheStatus(trace.cacheStatus)}</span>,
    },
    {
      label: 'Compiled at',
      value: <span>{new Date(trace.compiledAt).toLocaleString()}</span>,
    },
    {
      label: 'Tile type',
      value: <span>{trace.kind === 'composite' ? 'Composite' : 'Single'}</span>,
    },
    {
      label: 'Fields',
      value: (
        <div className="flex flex-wrap gap-1.5">
          {fields.map((field) => (
            <FieldBadge key={`${field.kind}:${field.name}`} field={field} />
          ))}
        </div>
      ),
    },
    {
      label: 'Executions',
      value: <ExecutionsSummary executions={trace.executions} />,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border/45 bg-card/30 md:grid md:grid-cols-2">
      {items.map((item, index) => {
        const isRightColumn = index % 2 === 1;
        const isLowerRow = index >= 2;

        return (
          <div
            key={item.label}
            className={cn(
              isRightColumn && 'md:border-l md:border-border/25',
              isLowerRow && 'border-t border-border/25',
            )}
          >
            <MetadataItem label={item.label}>{item.value}</MetadataItem>
          </div>
        );
      })}
    </div>
  );
}

function SectionSwitch({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-border/60 bg-muted/15 p-1',
        compact && 'rounded-sm p-0.5',
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          size="xs"
          className={cn(
            'rounded-sm px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground',
            compact && 'h-7 px-2 text-[10px] uppercase tracking-[0.08em]',
            value === option.value &&
              'bg-card text-foreground shadow-sm hover:bg-card',
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function TabHelp({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label="Tab help"
            className="inline-flex size-4 items-center justify-center text-muted-foreground/65 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground cursor-help"
          />
        }
      >
        <InfoIcon className="size-4" />
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-left leading-5">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function SemanticQueryTab({ trace }: { trace: TileBackendTrace }) {
  const [activeSection, setActiveSection] = React.useState<'api' | 'yaml'>(
    'api',
  );
  const [activeExecutionLabel, setActiveExecutionLabel] = React.useState(
    trace.executions[0]?.label ?? 'Query',
  );
  const activeExecution =
    trace.executions.find(
      (execution) => execution.label === activeExecutionLabel,
    ) ?? trace.executions[0];
  const exploreDeepLink = activeExecution?.exploreUrl;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SectionSwitch
            options={[
              { value: 'api', label: 'API request' },
              { value: 'yaml', label: 'Semantic source YAML' },
            ]}
            value={activeSection}
            onChange={(value) => setActiveSection(value as 'api' | 'yaml')}
          />
          {activeSection === 'api' ? (
            <TabHelp content="Review the semantic payload sent to Lightdash for the selected execution window." />
          ) : (
            <TabHelp content="Inspect the relevant YAML definitions from the Lightdash model file that back the fields used by this tile." />
          )}
        </div>
      </div>

      {activeSection === 'api' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {trace.executions.length > 1 ? (
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Execution
              </p>
              <SectionSwitch
                options={trace.executions.map((execution) => ({
                  value: execution.label,
                  label: execution.label,
                }))}
                value={activeExecutionLabel}
                onChange={setActiveExecutionLabel}
                compact
              />
            </div>
          ) : null}

          {activeExecution ? (
            <CodeSection
              title={
                trace.executions.length > 1 ? 'Request payload' : 'API request'
              }
              icon={<FileJson2Icon className="size-4 text-primary" />}
              content={formatSemanticRequest(activeExecution.semanticRequest)}
              language="json"
              headerAction={
                <div className="flex items-center gap-2">
                  {exploreDeepLink ? (
                    <a
                      href={exploreDeepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/5 px-2.5 py-1.5 text-[11px] font-medium text-violet-200/80 transition-colors hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-violet-100"
                    >
                      <LightdashMark className="size-3.5" />
                      Explore in Lightdash
                    </a>
                  ) : null}
                  <CopyButton
                    value={formatSemanticRequest(
                      activeExecution.semanticRequest,
                    )}
                  />
                </div>
              }
              className="flex min-h-0 flex-1 flex-col"
              preClassName="min-h-0 flex-1"
            />
          ) : null}
        </div>
      ) : (
        <CodeSection
          title="Relevant model snippet"
          icon={<DatabaseZapIcon className="size-4 text-primary" />}
          content={trace.semanticYamlSnippet}
          language="yaml"
          headerAction={
            <div className="flex items-center gap-2">
              {trace.githubModelUrl ? (
                <a
                  href={trace.githubModelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] font-medium text-foreground/80 transition-colors hover:border-border hover:bg-background hover:text-foreground"
                >
                  <GitHubMark className="size-3.5 text-foreground/80" />
                  Open in GitHub
                </a>
              ) : null}
              <CopyButton value={trace.semanticYamlSnippet} />
            </div>
          }
          className="flex min-h-0 flex-1 flex-col"
          preClassName="min-h-0 flex-1"
        />
      )}
    </div>
  );
}

function getLightdashSqlRunnerDeepLink(
  baseUrl: string | undefined,
  sql: string,
) {
  if (!baseUrl) {
    return undefined;
  }

  const params = new URLSearchParams({
    sql_runner: JSON.stringify({ sql }),
  });

  return `${baseUrl}?${params.toString()}`;
}

function SqlTab({ trace }: { trace: TileBackendTrace }) {
  const [activeExecutionLabel, setActiveExecutionLabel] = React.useState(
    trace.executions[0]?.label ?? 'Query',
  );
  const activeExecution =
    trace.executions.find(
      (execution) => execution.label === activeExecutionLabel,
    ) ?? trace.executions[0];
  const sqlRunnerDeepLink = activeExecution
    ? getLightdashSqlRunnerDeepLink(
        trace.sqlRunnerUrl,
        activeExecution.compiledSql,
      )
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 pb-2">
      <div className="flex items-center gap-3">
        {trace.executions.length > 1 ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Execution
            </p>
            <SectionSwitch
              options={trace.executions.map((execution) => ({
                value: execution.label,
                label: execution.label,
              }))}
              value={activeExecutionLabel}
              onChange={setActiveExecutionLabel}
              compact
            />
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <DatabaseZapIcon className="size-3.5 text-primary" />
            SQL query
          </div>
        )}
        <TabHelp content="This is the exact SQL compiled for the selected execution and sent to BigQuery." />
      </div>
      {activeExecution ? (
        <CodeSection
          key={`${activeExecution.label}-sql`}
          title={trace.executions.length > 1 ? 'Query' : 'Query'}
          icon={<DatabaseZapIcon className="size-4 text-primary" />}
          content={activeExecution.compiledSql}
          language="sql"
          headerAction={
            <div className="flex items-center gap-2">
              {sqlRunnerDeepLink ? (
                <a
                  href={sqlRunnerDeepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/5 px-2.5 py-1.5 text-[11px] font-medium text-violet-200/80 transition-colors hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-violet-100"
                >
                  <LightdashMark className="size-3.5" />
                  Open in Lightdash
                </a>
              ) : null}
              <CopyButton value={activeExecution.compiledSql} />
            </div>
          }
          className="flex min-h-0 flex-1 flex-col"
          preClassName="min-h-0 flex-1"
        />
      ) : null}
    </div>
  );
}

function formatCacheStatus(status: TileBackendTrace['cacheStatus']) {
  if (!status) {
    return 'Unknown';
  }

  return status === 'hit' ? 'Hit' : 'Miss';
}

function formatSemanticRequest(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function TileBackendSheet({
  title,
  trace,
  defaultOpen = false,
  triggerClassName,
  triggerStopsPropagation = false,
}: {
  title: string;
  trace?: TileBackendTrace;
  defaultOpen?: boolean;
  triggerClassName?: string;
  triggerStopsPropagation?: boolean;
}) {
  if (!trace) {
    return null;
  }

  const triggerProps = triggerStopsPropagation
    ? {
        onClick: (event: React.MouseEvent<HTMLButtonElement>) =>
          event.stopPropagation(),
        onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) =>
          event.stopPropagation(),
      }
    : undefined;

  return (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Open tile backend trace"
            className={cn(
              'cursor-pointer rounded-md border border-transparent bg-background/0 text-muted-foreground/80 opacity-0 shadow-none transition-all duration-150 group-hover:border-border/40 group-hover:bg-background/70 group-hover:text-foreground/80 group-hover:opacity-100 hover:border-border/80 hover:bg-background hover:text-foreground hover:shadow-sm focus-visible:border-ring focus-visible:bg-background focus-visible:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/35 active:translate-y-0',
              triggerClassName,
            )}
            {...triggerProps}
          />
        }
      >
        <CodeXmlIcon />
      </SheetTrigger>
      <SheetContent side="right" className="max-w-[70rem] gap-5 p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="gap-4 border-b border-border/70 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle>{title}</SheetTitle>
                  <TileKindBadge kind={trace.kind} />
                </div>
                <SheetDescription>
                  Inspect the semantic request sent to Lightdash and the
                  compiled SQL executed in BigQuery for this tile.
                </SheetDescription>
              </div>
            </div>

            <MetadataSection trace={trace} />
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
            <Tabs
              defaultValue="semantic-query"
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList variant="line">
                <TabsTrigger value="semantic-query">Semantic query</TabsTrigger>
                <TabsTrigger value="sql">SQL</TabsTrigger>
              </TabsList>

              <TabsContent
                value="semantic-query"
                className="mt-4 flex min-h-0 flex-1 flex-col"
              >
                <SemanticQueryTab trace={trace} />
              </TabsContent>

              <TabsContent
                value="sql"
                className="mt-4 flex min-h-0 flex-1 flex-col"
              >
                <SqlTab trace={trace} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
