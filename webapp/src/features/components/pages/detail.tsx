import { Navigate, useParams } from '@tanstack/react-router'

import { COMPONENT_DOCS } from '@/components/docs/component-demos'
import { DemoBlock } from '@/components/docs/demo-block'
import { DocsPager } from '@/components/docs/docs-pager'
import { DocsPage } from '@/components/docs/docs-chrome'
import { Badge } from '@/components/ui/badge'
import { filterBaseExamples } from '@/lib/merged-demo-policy'
import type { ComponentDoc } from '@/components/docs/demos/types'
import {
  COMPONENTS,
  COMP_BASE_PATH,
  NORA_COMPONENTS,
  componentPath,
  getBaseIdForNoraDoc,
  isNoraOnlyComponent,
} from '../nav'

type Example = ComponentDoc['examples'][number]

function ExampleBlocks({
  examples,
  keyPrefix,
}: {
  examples: Example[]
  keyPrefix: string
}) {
  if (!examples.length) return null
  return (
    <div className="flex flex-col gap-8">
      {examples.map((example) => (
        <DemoBlock
          key={`${keyPrefix}-${example.title}`}
          title={example.title}
          description={example.description}
          code={example.code}
        >
          {example.render()}
        </DemoBlock>
      ))}
    </div>
  )
}

function MergedExamples({
  baseId,
  baseDoc,
  extraDocs,
}: {
  baseId: string
  baseDoc: ComponentDoc
  extraDocs: ComponentDoc[]
}) {
  const baseVariants = filterBaseExamples(baseId, baseDoc.examples)

  return (
    <div className="flex flex-col gap-8">
      {extraDocs.map((doc) => {
        const meta = NORA_COMPONENTS.find((c) => c.id === doc.id)
        const showVariantTitle = extraDocs.length > 1 && Boolean(meta)
        return (
          <div key={doc.id} className="flex flex-col gap-8">
            {showVariantTitle ? (
              <h2 className="font-heading text-[15px] font-semibold tracking-[-0.01em] text-[var(--nora-text)]">
                {meta!.name}
              </h2>
            ) : null}
            <ExampleBlocks examples={doc.examples} keyPrefix={doc.id} />
          </div>
        )
      })}

      {baseVariants.length ? (
        <ExampleBlocks
          examples={baseVariants}
          keyPrefix={`base-${baseId}`}
        />
      ) : null}
    </div>
  )
}

export function ComponentDetailPage() {
  const { componentId: id } = useParams({
    from: '/adminWorkspace/admin/components/$componentId',
  })

  if (id.startsWith('nora-')) {
    const baseId = getBaseIdForNoraDoc(id)
    if (baseId) {
      return (
        <Navigate
          params={{ componentId: baseId }}
          replace
          to="/admin/components/$componentId"
        />
      )
    }
  }

  const meta = COMPONENTS.find((c) => c.id === id)
  if (!meta) {
    return <Navigate replace to="/admin/components" />
  }

  const index = COMPONENTS.findIndex((c) => c.id === meta.id)
  const prev = COMPONENTS[index - 1]
  const next = COMPONENTS[index + 1]
  const pager = (
    <DocsPager
      prev={
        prev
          ? { name: prev.name, to: componentPath(prev.id) }
          : { name: 'Все компоненты', to: COMP_BASE_PATH }
      }
      next={
        next ? { name: next.name, to: componentPath(next.id) } : undefined
      }
    />
  )

  if (isNoraOnlyComponent(id)) {
    const doc = COMPONENT_DOCS[id]
    if (!doc) return <Navigate replace to="/admin/components" />
    const noraMeta = NORA_COMPONENTS.find((c) => c.id === id)
    return (
      <DocsPage
        title={meta.name}
        description={noraMeta?.description ?? meta.description}
      >
        <ExampleBlocks examples={doc.examples} keyPrefix={id} />
        {pager}
      </DocsPage>
    )
  }

  const baseDoc = COMPONENT_DOCS[id]
  if (!baseDoc) {
    return <Navigate replace to="/admin/components" />
  }

  const extraDocs = (meta.extraDemoIds ?? [])
    .map((docId) => COMPONENT_DOCS[docId])
    .filter(Boolean) as ComponentDoc[]

  const description =
    extraDocs.length === 1
      ? (NORA_COMPONENTS.find((c) => c.id === meta.extraDemoIds?.[0])
          ?.description ?? meta.description)
      : meta.description

  return (
    <DocsPage title={meta.name} description={description}>
      {meta.isNew ? (
        <Badge className="w-fit" variant="secondary">
          New
        </Badge>
      ) : null}

      {extraDocs.length ? (
        <MergedExamples
          baseId={id}
          baseDoc={baseDoc}
          extraDocs={extraDocs}
        />
      ) : (
        <ExampleBlocks examples={baseDoc.examples} keyPrefix={id} />
      )}

      {pager}
    </DocsPage>
  )
}
