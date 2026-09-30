import { BLOCKS_BASE_PATH } from '@/features/blocks'
import { COMP_BASE_PATH } from '@/features/components'
import { BLOCKS, COMPONENTS } from '@/lib/components-nav'
import { NORA_ICONS, NORA_TOKENS } from '@/lib/nora-icons'
import { DocsCardLink, DocsPage, DocsSection } from '../docs-page'
import { DS_PAGES, dsPath } from '../nav'

const DS_DESCRIPTIONS: Record<string, string> = {
  colors: 'Семантические цветовые токены трёх схем, акцентные и статусные цвета.',
  typography: 'Гарнитуры Inter, Inter Display и Input Mono; шкала размеров и начертаний.',
  icons: `Библиотека из ${NORA_ICONS.length} иконок, извлечённых из интерфейса.`,
  spacing: 'Базовая единица 5px, шкала отступов и высоты строк.',
  radius: 'Шкала скруглений от 4px до pill.',
  shadows: 'Уровни высоты: кнопки, поповеры, модальные окна.',
  borders: 'Рамки, разделители и фокус-кольца.',
  motion: 'Длительности, кривые и типовые переходы.',
  tokens: 'Полная таблица извлечённых CSS-переменных с поиском.',
}

const tokenCount = Object.keys(NORA_TOKENS.dark).length

export function DsOverviewPage() {
  return (
    <DocsPage
      title="Nora UI — дизайн-система"
      description={`Nora UI: один слой React (shadcn / Base UI) и один источник токенов --nora-*. ${tokenCount} токенов. Три схемы оформления. Без HTML-снапшотов и без перехвата native select.`}
    >
      <DocsSection
        title="Три цветовые схемы"
        description="Nora использует три контекста оформления. Ниже — превью Editor Dark, Editor Light и Marketing."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <DocsCardLink
            to={dsPath('colors')}
            title="Editor Dark"
            description="Тёмная тема редактора: панели #111, холст #171717, контролы #1f1f1f, текст #FFF/#999."
          />
          <DocsCardLink
            to={dsPath('colors')}
            title="Editor Light"
            description="Светлая тема редактора: панели #FFF, канвас #EEE, текст #222/#666."
          />
          <DocsCardLink
            to={dsPath('colors')}
            title="Marketing"
            description="Маркетинговый сайт: чёрный фон #000, крупная типографика Inter Display, акцент lime."
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { bg: '#171717', swatches: ['#0099ff', '#1f1f1f', '#fff'] },
            { bg: '#fff', swatches: ['#0099ff', '#f3f3f3', '#222'] },
            { bg: '#000', swatches: ['#0099ff', '#cbff00', '#141414'] },
          ].map((preview, i) => (
            <div
              key={i}
              className="flex h-14 items-center justify-center gap-1.5 rounded-[10px] ring-1 ring-border"
              style={{ background: preview.bg }}
            >
              {preview.swatches.map((c) => (
                <span
                  key={c}
                  className="size-[22px] rounded-md"
                  style={{
                    background: c,
                    // Soft hairline only — hard #333 reads louder than Nora light chrome.
                    boxShadow:
                      c === '#f3f3f3' || c === '#fff' || c === '#141414'
                        ? 'inset 0 0 0 1px var(--nora-artboard-stroke, rgba(0,0,0,0.08))'
                        : undefined,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Структура системы">
        <div className="grid gap-3 sm:grid-cols-3">
          {DS_PAGES.filter((p) => p.id !== 'overview').map((p) => (
            <DocsCardLink
              key={p.id}
              to={dsPath(p.id)}
              title={p.name}
              description={DS_DESCRIPTIONS[p.id] ?? ''}
            />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        title="Компоненты и блоки"
        description="Единый каталог Nora UI — без раздельных «слоёв» и пометок происхождения."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <DocsCardLink
            to={COMP_BASE_PATH}
            title="Компоненты"
            description={`${COMPONENTS.length} компонентов с живыми примерами во всех трёх схемах.`}
          />
          <DocsCardLink
            to={BLOCKS_BASE_PATH}
            title="Блоки"
            description={`${BLOCKS.length} готовых UI-блоков продукта и редактора.`}
          />
        </div>
      </DocsSection>

      <DocsSection title="Принципы UI Nora">
        <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Плотность.</span>{' '}
            Базовый кегль — 12px, строка панели — 30px, контрол — 30px. Интерфейс
            компактный, но не тесный: всё выравнено по шагу 5px.
          </p>
          <p>
            <span className="font-semibold text-foreground">Плоские поля.</span>{' '}
            Инпуты и контролы не имеют рамок — только заливка поверхности
            (#2B2B2B / #F3F3F3). Рамка появляется только в фокусе — синее
            свечение.
          </p>
          <p>
            <span className="font-semibold text-foreground">Один акцент.</span>{' '}
            Синий #0099FF — единственный интерактивный акцент; фиолетовый
            #8855FF зарезервирован за компонентами, красный #FF3366 — за
            разрушающими действиями.
          </p>
          <p>
            <span className="font-semibold text-foreground">
              Мгновенная обратная связь.
            </span>{' '}
            Переходы 100–150ms, hover-состояния у каждого интерактивного
            элемента, выделение — всегда заливка tint, а не рамка.
          </p>
        </div>
      </DocsSection>
    </DocsPage>
  )
}
