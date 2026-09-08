import { DocsCardLink, DocsPage, DocsSection } from '@/components/docs/docs-chrome'
import { COMPONENTS, componentPath } from '../nav'

export function ComponentsIndexPage() {
  return (
    <DocsPage
      title="Компоненты"
      description={`${COMPONENTS.length} компонентов Nora UI — единый каталог на Base UI с токенами и плотностью системы.`}
    >
      <DocsSection title={`Все компоненты (${COMPONENTS.length})`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMPONENTS.map((component) => (
            <DocsCardLink
              key={component.id}
              to={componentPath(component.id)}
              title={component.name}
              description={component.description}
              badge={component.isNew ? 'New' : undefined}
            />
          ))}
        </div>
      </DocsSection>
    </DocsPage>
  )
}
