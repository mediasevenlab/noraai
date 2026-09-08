import { DocsCardLink, DocsPage, DocsSection } from '@/components/docs/docs-chrome'
import { BLOCKS, blockPath } from '../nav'

export function BlocksIndexPage() {
  return (
    <DocsPage
      title="Блоки"
      description={`${BLOCKS.length} готовых UI-блоков Nora UI — от панелей редактора до типичных product-паттернов.`}
    >
      <DocsSection title={`Все блоки (${BLOCKS.length})`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {BLOCKS.map((block) => (
            <DocsCardLink
              key={block.id}
              to={blockPath(block.id)}
              title={block.name}
              description={block.description}
            />
          ))}
        </div>
      </DocsSection>
    </DocsPage>
  )
}
