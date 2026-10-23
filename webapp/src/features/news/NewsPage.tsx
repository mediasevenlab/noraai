import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { NewsPost } from '@web-app-demo/contracts'

import {
  BookmarkIcon,
  CalendarIcon,
  CirclePlusIcon,
  ClapperboardIcon,
  DownloadIcon,
  ImagePlusIcon,
  NewspaperIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from '@/components/icons'

import { noraPageDescriptionClass, noraPageTitleClass } from '@/components/PageLayout'
import { NoraButton, NoraInput } from '@/components/nora/primitives'
import { ProductFeedEmpty, productCardOriginAnchorClass, productDesktopCardMinHeightClass, productFeedGridClass, productFeedPageClass, productSheetOverlayChipClass, productToolbarSelectContentClass, productToolbarSelectItemClass } from '@/components/nora/product-sheet'
import { ProductToolbarSearch } from '@/components/nora/toolbar-search'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth'
import { feedDayHeading } from './days'
import {
  DiaryPeriodPicker,
  diaryToolbarPairDividerClass,
  diaryToolbarPillClass,
} from './PeriodPicker'
import { cn } from '@/lib/utils'

import { deleteNewsChannel, deleteNewsPost, importNewsPosts, listNewsPosts, updateNewsPost } from './api'
import { groupNewsByDay, postsCountLabel } from './days'
import { waitForSavedPosts } from './watch-feed'
import { newsCoverUrls, newsSlides } from './gallery'
import { NewsSlides } from './NewsSlides'

import {
  parseTelegramChannelLink,
  readNewsChannels,
  writeNewsChannels,
  type NewsChannel,
} from './channels'

const FILTER_GROUPS = [
  {
    id: 'source',
    label: 'Источник',
    options: [
      { value: 'all', label: 'Все' },
      { value: 'telegram', label: 'Telegram' },
      { value: 'sites', label: 'Сайты' },
    ],
  },
  {
    id: 'topic',
    label: 'Тема',
    options: [
      { value: 'general', label: 'Общее' },
      { value: 'tech', label: 'Технологии' },
      { value: 'economy', label: 'Экономика' },
    ],
  },
  {
    id: 'order',
    label: 'Порядок',
    options: [
      { value: 'new', label: 'Сначала новые' },
      { value: 'old', label: 'Сначала старые' },
    ],
  },
] as const

function localDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const newsPeriodStart = new Date()
newsPeriodStart.setDate(newsPeriodStart.getDate() - 29)
const NEWS_PERIOD_START = localDateInput(newsPeriodStart)

function shiftLocalDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localDateInput(date)
}

const dateFieldClass =
  'h-9 w-full rounded-[10px] border-0 bg-[var(--nora-inset)] px-2 font-[family-name:var(--nora-font)] text-[12px] font-light text-[var(--nora-text)] outline-none'

const newsDialogTitleClass =
  'font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]'

const newsDialogMetaClass =
  'font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]'

const newsEditFieldClass =
  'w-full rounded-[9.5px] border border-[color-mix(in_srgb,var(--nora-panel)_88%,#000)] bg-[var(--nora-panel)] p-3 outline-none focus-visible:shadow-[var(--nora-shadow-focus)] [.scheme-editor-dark_&]:border-[color-mix(in_srgb,var(--nora-panel)_70%,#fff)]'

const newsEditTypeClass =
  'font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]'

const newsMenuContentClass = cn(
  'account-workspace-menu',
  productToolbarSelectContentClass,
  'min-w-44',
)

const newsGroupsMenuClass = cn(
  'account-workspace-menu',
  'w-max! min-w-0! max-w-none overflow-hidden rounded-[16px]! p-1!',
)

const newsMenuItemClass = cn(
  productToolbarSelectItemClass,
  'data-checked:bg-[var(--nora-tint)] data-checked:!font-medium data-checked:text-[var(--nora-on-accent)]',
  'data-checked:[&_svg]:text-[var(--nora-on-accent)]',
  'hover:data-checked:bg-[var(--nora-tint)] hover:data-checked:text-[var(--nora-on-accent)]',
  'data-highlighted:data-checked:bg-[var(--nora-tint)] data-highlighted:data-checked:!font-medium data-highlighted:data-checked:text-[var(--nora-on-accent)]',
)

const newsHeroClass = 'relative shrink-0 px-2.5 pt-2.5 sm:px-2 sm:pt-2'
const newsHeroFrameClass =
  'relative h-[min(52.8vw,288px)] w-full overflow-hidden rounded-[12px] bg-black shadow-[inset_0_0_0_1px_var(--nora-border)] sm:h-[322px] sm:rounded-[14px]'

const pillButtonClass = cn(
  diaryToolbarPillClass,
  'nora-press-grow gap-1 px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] [&>svg]:size-3.5',
)

const newsFooterDividerClass =
  'border-t border-[color-mix(in_srgb,var(--nora-divider)_70%,transparent)] dark:border-[var(--nora-border-strong)]'

const BOOKMARKS_KEY = 'ai-news.news-bookmarks'

function readNewsBookmarks() {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
  } catch {
    return []
  }
}

function writeNewsBookmarks(ids: readonly string[]) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids))
}

export function NewsPage() {
  const { transport } = useAuth()
  const [filters, setFilters] = useState({
    source: 'all',
    topic: 'general',
    order: 'new',
  })
  const [channelFilter, setChannelFilter] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [bookmarks, setBookmarks] = useState<string[]>(() => readNewsBookmarks())
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [channelsOpen, setChannelsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [channelError, setChannelError] = useState('')
  const [channels, setChannels] = useState<NewsChannel[]>(() => readNewsChannels())
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [ready, setReady] = useState(false)
  const [importing, setImporting] = useState(false)
  const [period, setPeriod] = useState<{ from: Date; to: Date } | null>(null)
  const [exportFrom, setExportFrom] = useState(() => shiftLocalDate(-1))
  const [exportTo, setExportTo] = useState(() => shiftLocalDate(0))
  const [openPost, setOpenPost] = useState<NewsPost | null>(null)
  const exportWatch = useRef<AbortController | null>(null)

  function addChannel() {
    const parsed = parseTelegramChannelLink(draft)
    if (!parsed) {
      setChannelError('Вставьте ссылку вида https://t.me/channel или @channel')
      return
    }
    if (channels.some((channel) => channel.handle.toLowerCase() === parsed.handle.toLowerCase())) {
      setChannelError('Этот канал уже добавлен')
      return
    }
    const next = [{ id: crypto.randomUUID(), ...parsed }, ...channels]
    setChannels(next)
    writeNewsChannels(next)
    setDraft('')
    setChannelError('')
  }

  function removeChannel(id: string) {
    const channel = channels.find((item) => item.id === id)
    const next = channels.filter((item) => item.id !== id)
    setChannels(next)
    writeNewsChannels(next)
    if (!channel) return
    const handle = channel.handle.toLowerCase()
    if (channelFilter === handle) setChannelFilter('all')
    setPosts((current) => current.filter((post) => post.channelHandle.toLowerCase() !== handle))
    setOpenPost((current) => (current?.channelHandle.toLowerCase() === handle ? null : current))
    void deleteNewsChannel(transport, handle).catch(() => {
      toast.error('Не удалось убрать посты канала')
    })
  }

  useEffect(() => () => exportWatch.current?.abort(), [])

  useEffect(() => {
    let cancelled = false
    const listed = new Set(readNewsChannels().map((channel) => channel.handle.toLowerCase()))
    void listNewsPosts(transport)
      .then(async (feed) => {
        if (listed.size === 0) {
          if (!cancelled) setPosts(feed.posts)
          return
        }
        const kept = feed.posts.filter((post) => listed.has(post.channelHandle.toLowerCase()))
        const dropped = [...new Set(
          feed.posts
            .filter((post) => !listed.has(post.channelHandle.toLowerCase()))
            .map((post) => post.channelHandle.toLowerCase()),
        )]
        if (!cancelled) setPosts(kept)
        await Promise.all(dropped.map((handle) => deleteNewsChannel(transport, handle).catch(() => undefined)))
      })
      .catch(() => {
        if (!cancelled) toast.error('Не удалось загрузить новости')
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [transport])

  const visible = useMemo(() => {
    const listed = new Set(channels.map((channel) => channel.handle.toLowerCase()))
    const needle = query.trim().toLowerCase()
    const filtered = posts.filter((post) => {
      if (!listed.has(post.channelHandle.toLowerCase())) return false
      if (channelFilter !== 'all' && post.channelHandle.toLowerCase() !== channelFilter) return false
      if (favoritesOnly && !bookmarks.includes(post.id)) return false
      if (filters.source === 'sites') return false
      if (needle && !`${post.channelHandle}\n${post.text}`.toLowerCase().includes(needle)) return false
      if (!period) return true
      const time = new Date(post.postedAt).getTime()
      return time >= period.from.getTime() && time <= period.to.getTime()
    })
    filtered.sort((left, right) => {
      const delta = new Date(left.postedAt).getTime() - new Date(right.postedAt).getTime()
      return filters.order === 'old' ? delta : -delta
    })
    return filtered
  }, [bookmarks, channelFilter, channels, favoritesOnly, filters.order, filters.source, period, posts, query])

  function exportRange() {
    const from = new Date(`${exportFrom}T00:00:00`)
    const to = new Date(`${exportTo}T23:59:59.999`)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null
    if (to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000) return 'long' as const
    return { from, to }
  }

  async function exportPosts() {
    if (channels.length === 0 || importing) return
    const range = exportRange()
    if (range === 'long') {
      toast.warning('Интервал не длиннее 31 дня')
      return
    }
    if (!range) {
      toast.warning('Дата «от» позже даты «до»')
      return
    }
    setImporting(true)
    exportWatch.current?.abort()
    const watch = new AbortController()
    exportWatch.current = watch
    const listed = new Set(channels.map((channel) => channel.handle.toLowerCase()))
    const previousIds = new Set(posts.map((post) => post.id))
    const applyFeed = (feed: NewsPost[]) => {
      setPosts(feed.filter((post) => listed.has(post.channelHandle.toLowerCase())))
    }
    const appeared = waitForSavedPosts({
      previousIds,
      signal: watch.signal,
      load: async () => (await listNewsPosts(transport)).posts,
    }).then((feed) => {
      if (feed && !watch.signal.aborted) applyFeed(feed)
      return feed
    })
    const started = Date.now()
    try {
      const result = await importNewsPosts(
        transport,
        channels.map((channel) => channel.handle),
        { from: range.from.toISOString(), to: range.to.toISOString() },
      )
      watch.abort()
      applyFeed(result.posts)
      if (result.archived > 0) toast.success(`В архив: ${result.archived}`)
      else if (result.imported > 0) toast.success(`Новых постов: ${result.imported}`)
      else if (result.failed.length > 0) toast.error('Не удалось открыть канал')
      else toast.info('Новых постов за этот период нет')
      if (result.archived > 0 && result.failed.length > 0) toast.warning('Часть каналов не выгрузилась')
    } catch {
      const slow = Date.now() - started >= 15_000
      if (!slow) watch.abort()
      const feed = slow ? await appeared : null
      if (feed) {
        const added = feed.filter((post) => listed.has(post.channelHandle.toLowerCase()) && !previousIds.has(post.id)).length
        if (added > 0) toast.success(`В архив: ${added}`)
        else toast.info('Новых постов за этот период нет')
      } else {
        toast.error('Не удалось выгрузить посты')
      }
    } finally {
      watch.abort()
      setImporting(false)
    }
  }

  async function deletePost(post: NewsPost) {
    try {
      await deleteNewsPost(transport, post.id)
      setPosts((current) => current.filter((item) => item.id !== post.id))
      setOpenPost((current) => (current?.id === post.id ? null : current))
      setBookmarks((current) => {
        if (!current.includes(post.id)) return current
        const next = current.filter((id) => id !== post.id)
        writeNewsBookmarks(next)
        return next
      })
      toast.success('Пост удалён', { icon: <Trash2Icon className="size-4" /> })
    } catch {
      toast.error('Не удалось удалить пост')
    }
  }

  return (
    <section className={productFeedPageClass}>
      <div className="flex flex-col gap-1">
        <h1 className={noraPageTitleClass}>Новости</h1>
        <p className={noraPageDescriptionClass}>Посты из добавленных Telegram-каналов.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button className={pillButtonClass} type="button" />}
          >
            <SlidersHorizontalIcon aria-hidden strokeWidth={1.75} />
            Фильтр
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={newsMenuContentClass} sideOffset={8}>
            {FILTER_GROUPS.map((group, index) => (
              <div key={group.id}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel className="font-[family-name:var(--nora-font)] text-[12px] font-light text-[var(--nora-text-tertiary)]">
                  {group.label}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters[group.id]}
                  onValueChange={(value) => {
                    setFilters((current) => ({ ...current, [group.id]: value }))
                  }}
                >
                  {group.options.map((option) => (
                    <DropdownMenuRadioItem key={option.value} className={newsMenuItemClass} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button className={pillButtonClass} type="button" />}
          >
            <UsersIcon aria-hidden strokeWidth={1.75} />
            Группы
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={newsGroupsMenuClass} sideOffset={8}>
            <DropdownMenuRadioGroup value={channelFilter} onValueChange={setChannelFilter}>
              <DropdownMenuRadioItem className={newsMenuItemClass} value="all">
                Все
              </DropdownMenuRadioItem>
              {channels.map((channel) => (
                <DropdownMenuRadioItem
                  key={channel.id}
                  className={newsMenuItemClass}
                  value={channel.handle.toLowerCase()}
                >
                  @{channel.handle}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          aria-pressed={favoritesOnly}
          className={cn(
            pillButtonClass,
            'data-active:text-[var(--nora-text)]',
          )}
          data-active={favoritesOnly || undefined}
          type="button"
          onClick={() => setFavoritesOnly((current) => !current)}
        >
          <BookmarkIcon aria-hidden className={cn(favoritesOnly && 'fill-current')} strokeWidth={1.75} />
          Избранное
        </button>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div
            className={cn(
              diaryToolbarPillClass,
              searchOpen
                ? 'min-w-0 flex-1 px-1 sm:w-64 sm:flex-none'
                : 'px-1',
            )}
          >
            <DiaryPeriodPicker
              disabled={searchOpen}
              onFilterChange={setPeriod}
              periodStart={NEWS_PERIOD_START}
              subjectKey="news"
            />
            <span aria-hidden className={diaryToolbarPairDividerClass} />
            <ProductToolbarSearch
              expanded={searchOpen}
              onExpandedChange={setSearchOpen}
              onValueChange={setQuery}
              value={query}
            />
          </div>
          <button
            className={pillButtonClass}
            type="button"
            onClick={() => {
              setChannelError('')
              setChannelsOpen(true)
            }}
          >
            <CirclePlusIcon aria-hidden strokeWidth={1.75} />
            Добавить
          </button>
          <button
            className={cn(pillButtonClass, 'disabled:opacity-50')}
            disabled={importing || channels.length === 0}
            type="button"
            onClick={() => {
              void exportPosts()
            }}
          >
            <DownloadIcon aria-hidden strokeWidth={1.75} />
            {importing ? 'Выгрузка…' : 'Выгрузить'}
          </button>
        </div>
      </div>

      {ready && visible.length === 0 ? (
        <ProductFeedEmpty
          description={
            channels.length > 0 && posts.length > 0
              ? 'По этому фильтру постов нет.'
              : 'Добавьте канал и нажмите «Выгрузить».'
          }
          icon={<NewspaperIcon aria-hidden strokeWidth={1.75} />}
          title={channels.length > 0 && posts.length > 0 ? 'Ничего не найдено' : 'Пока пусто'}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groupNewsByDay(visible).map((group) => (
            <section key={group.dayKey} className="flex flex-col gap-5">
              <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="ios-glass-glare inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[var(--nora-text)] py-0 pr-2.5 pl-2 font-[family-name:var(--nora-font)] text-[12px] font-normal leading-none text-white dark:bg-[#2C2C2E]">
                  <CalendarIcon aria-hidden className="size-[13px] text-white" strokeWidth={1.75} />
                  {feedDayHeading(group.dayIso)}
                </div>
                <div className="ios-glass-glare inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[var(--nora-input-bg)] py-0 pr-2.5 pl-2 font-[family-name:var(--nora-font)] text-[12px] font-normal leading-none text-[var(--nora-text-secondary)]">
                  <NewspaperIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
                  {postsCountLabel(group.posts.length)}
                </div>
              </div>
              <div className={productFeedGridClass}>
                {group.posts.map((post) => (
                  <NewsCard
                    key={post.id}
                    post={post}
                    onDelete={() => {
                      void deletePost(post)
                    }}
                    onOpen={() => setOpenPost(post)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog
        open={channelsOpen}
        onOpenChange={(open) => {
          setChannelsOpen(open)
          if (!open) setChannelError('')
        }}
      >
        <DialogContent className="md:max-w-[min(440px,calc(100%-2rem))]">
          <DialogHeader className="gap-1">
            <DialogTitle className={newsDialogTitleClass}>Каналы</DialogTitle>
            <DialogDescription className={newsDialogMetaClass}>
              Вставьте ссылку на Telegram-канал и выберите период. «Выгрузить» заберёт посты за эти даты.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3 px-[15px] pt-3 pb-[15px]"
            onSubmit={(event) => {
              event.preventDefault()
              addChannel()
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                От
                <input
                  aria-label="Период от"
                  className={dateFieldClass}
                  max={exportTo}
                  type="date"
                  value={exportFrom}
                  onChange={(event) => setExportFrom(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                До
                <input
                  aria-label="Период до"
                  className={dateFieldClass}
                  min={exportFrom}
                  type="date"
                  value={exportTo}
                  onChange={(event) => setExportTo(event.target.value)}
                />
              </label>
            </div>
            <div className="flex items-start gap-2">
              <NoraInput
                aria-invalid={Boolean(channelError)}
                aria-label="Ссылка на Telegram-канал"
                error={Boolean(channelError)}
                placeholder="https://t.me/channel"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value)
                  if (channelError) setChannelError('')
                }}
              />
              <NoraButton
                aria-label="Добавить канал"
                className="!h-[2.42rem] !w-[2.42rem] !min-h-[2.42rem] shrink-0 !px-0 [&_svg]:!size-4"
                type="submit"
                variant="tinted"
              >
                <CirclePlusIcon aria-hidden className="size-4" strokeWidth={1.75} />
              </NoraButton>
            </div>
            {channelError ? (
              <p className="text-[12px] leading-4 text-[var(--nora-error)]" role="alert">
                {channelError}
              </p>
            ) : null}
            {channels.length === 0 ? (
              <p className="rounded-[14px] bg-[var(--nora-inset)] px-3 py-3 text-[13px] leading-5 text-[var(--nora-text-tertiary)]">
                Каналов пока нет.
              </p>
            ) : (
              <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                {channels.map((channel) => (
                  <li
                    key={channel.id}
                    className="flex min-h-11 items-center gap-2 rounded-[14px] bg-[var(--nora-inset)] px-3"
                  >
                    <a
                      className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)] hover:underline"
                      href={channel.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      @{channel.handle}
                    </a>
                    <button
                      aria-label={`Убрать @${channel.handle}`}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--nora-text-tertiary)] hover:text-[var(--nora-text)]"
                      type="button"
                      onClick={() => removeChannel(channel.id)}
                    >
                      <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openPost !== null} onOpenChange={(open) => { if (!open) setOpenPost(null) }}>
        <DialogContent showCloseButton={false} className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden md:max-w-[min(560px,calc(100%-2rem))]">
          {openPost ? (
            <NewsPostView
              post={openPost}
              onSaved={(next) => {
                setPosts((current) => current.map((item) => item.id === next.id ? next : item))
                setOpenPost(next)
                toast.success('Пост сохранён')
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function NewsCard({
  post,
  onOpen,
  onDelete,
}: {
  post: NewsPost
  onOpen: () => void
  onDelete: () => void
}) {
  const title = postTitle(post)
  const covers = newsCoverUrls(post.media)
  const hasVideo = post.media.some((item) => item.kind === 'video')
  const gallery = covers.length > 1
  return (
    <article
      className={cn('group relative flex h-full min-w-0 flex-col', productDesktopCardMinHeightClass)}
      data-slot="meal-card"
    >
      <button
        aria-label="Удалить пост"
        className={cn(
          productSheetOverlayChipClass,
          'nora-press-grow absolute top-4 right-4 z-[2] size-7',
          'sm:pointer-events-none sm:opacity-0',
          'sm:group-hover:pointer-events-auto sm:group-hover:opacity-100',
          'hover:bg-[var(--nora-error)] hover:text-white',
          'focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:shadow-[var(--nora-shadow-focus)]',
        )}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
      >
        <Trash2Icon aria-hidden className="size-4" />
      </button>
      {gallery ? (
        <div className="relative shrink-0 px-2 pt-2">
          <div className="relative block w-full" data-slot="meal-card-preview">
            <NewsCover ad={post.ad} covers={covers} hasVideo={hasVideo} onOpen={onOpen} />
          </div>
        </div>
      ) : null}
      <button className="flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col text-left" type="button" onClick={onOpen}>
        {gallery ? null : (
          <div className="relative shrink-0 px-2 pt-2">
            <div className="relative block w-full" data-slot="meal-card-preview">
              <NewsCover ad={post.ad} covers={covers} hasVideo={hasVideo} />
            </div>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col px-3 pt-3 sm:px-4 sm:pt-3.5">
          <h3 className="truncate font-[family-name:var(--nora-font)] text-[15px] font-medium leading-6 text-[var(--nora-text)]">
            {title}
          </h3>
          <p className="mt-2 line-clamp-3 h-[3.75rem] font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-composition)]">
            {postExcerpt(post, title)}
          </p>
        </div>
      </button>
      <div className="mt-auto px-3 sm:px-4">
        <div aria-hidden className={newsFooterDividerClass} />
        <div className="py-2">
          <p className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)]">
            @{post.channelHandle} · {formatPostTime(post.postedAt)}
          </p>
        </div>
      </div>
    </article>
  )
}

function NewsCover({
  ad,
  covers,
  hasVideo,
  onOpen,
}: {
  ad: boolean
  covers: string[]
  hasVideo: boolean
  onOpen?: () => void
}) {
  return (
    <div
      className="relative aspect-[4/3] max-h-[132px] w-full overflow-hidden bg-[var(--nora-inset)] shadow-[inset_0_0_0_1px_var(--nora-border)] sm:max-h-[148px] md:aspect-auto md:h-[168px] md:max-h-none"
      data-slot="meal-cover"
    >
      {covers.length > 1 ? (
        <NewsSlides
          size="card"
          slides={covers.map((url) => ({ kind: 'image', url }))}
          onActivate={onOpen}
        />
      ) : covers[0] ? (
        <img alt="" className="size-full object-cover" src={covers[0]} />
      ) : (
        <span className="flex size-full items-center justify-center text-[var(--nora-text-tertiary)]">
          <NewspaperIcon aria-hidden className="size-6" strokeWidth={1.5} />
        </span>
      )}
      {ad ? (
        <span className={cn(productCardOriginAnchorClass, 'z-[3]')}>
          <span className="ios-glass-glare-soft inline-flex h-[22px] items-center rounded-full bg-[var(--nora-success)] px-2 font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none whitespace-nowrap text-white backdrop-blur-[10px]">
            Реклама
          </span>
        </span>
      ) : null}
      {hasVideo ? (
        <span
          aria-label="Видео"
          className="pointer-events-none absolute right-2 bottom-2 z-[4] inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
          role="img"
        >
          <ClapperboardIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
        </span>
      ) : null}
    </div>
  )
}

type NewsDraftFile = {
  key: string
  kind: 'image' | 'video'
  url: string
  poster?: string
  keepIndex?: number
  file?: File
}

const EDITABLE_MEDIA = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime'

function draftFiles(post: NewsPost): NewsDraftFile[] {
  const poster = post.media.find((item) => item.role === 'poster' && item.kind === 'image')?.url
  return post.media.flatMap((item, index) => {
    if (item.role === 'poster') return []
    return [{
      key: `kept-${index}`,
      kind: item.kind,
      url: item.url,
      ...(item.kind === 'video' && poster ? { poster } : {}),
      keepIndex: index,
    }]
  })
}

function NewsPostView({
  post,
  onSaved,
}: {
  post: NewsPost
  onSaved: (post: NewsPost) => void
}) {
  const { transport } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [draft, setDraft] = useState<NewsDraftFile[]>([])
  const [selected, setSelected] = useState(0)
  const createdUrls = useRef<string[]>([])
  const bodyField = useRef<HTMLTextAreaElement>(null)
  const slides = newsSlides(post.media)

  useEffect(() => {
    setEditing(false)
    setSaving(false)
  }, [post.id])

  useEffect(() => () => {
    for (const url of createdUrls.current) URL.revokeObjectURL(url)
  }, [])

  useLayoutEffect(() => {
    const field = bodyField.current
    if (!editing || !field) return
    const dragged = field.style.height
    const style = getComputedStyle(field)
    const border = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth)
    field.style.minHeight = '0px'
    field.style.height = '0px'
    const needed = field.scrollHeight + border
    field.style.minHeight = `${needed}px`
    const chosen = Number.parseFloat(dragged)
    field.style.height = Number.isFinite(chosen) && chosen > needed ? dragged : ''
  }, [editing, body])

  function startEdit() {
    setTitle(editableTitle(post))
    setBody(editableBody(post))
    setDraft(draftFiles(post))
    setSelected(0)
    setEditing(true)
  }

  function cancelEdit() {
    if (saving) return
    for (const url of createdUrls.current) URL.revokeObjectURL(url)
    createdUrls.current = []
    setEditing(false)
  }

  function rememberFile(file: File): NewsDraftFile | null {
    const allowed = new Set(EDITABLE_MEDIA.split(','))
    if (!allowed.has(file.type)) return null
    const url = URL.createObjectURL(file)
    createdUrls.current.push(url)
    return {
      key: `new-${createdUrls.current.length}`,
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      url,
      file,
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    const next: NewsDraftFile[] = []
    for (const file of list) {
      if (draft.length + next.length >= 10) break
      const item = rememberFile(file)
      if (item) next.push(item)
    }
    if (next.length === 0) return
    setSelected(draft.length)
    setDraft((current) => [...current, ...next])
  }

  function replaceSelected(list: FileList | null) {
    const file = list?.[0]
    const index = Math.min(selected, Math.max(0, draft.length - 1))
    const current = draft[index]
    if (!file || !current) return
    const item = rememberFile(file)
    if (!item) return
    if (current.file) {
      URL.revokeObjectURL(current.url)
      createdUrls.current = createdUrls.current.filter((url) => url !== current.url)
    }
    setDraft((files) => files.map((entry, entryIndex) => entryIndex === index ? item : entry))
  }

  function removeFile(key: string) {
    const index = draft.findIndex((file) => file.key === key)
    if (index < 0) return
    const item = draft[index]
    if (item?.file) {
      URL.revokeObjectURL(item.url)
      createdUrls.current = createdUrls.current.filter((url) => url !== item.url)
    }
    const next = draft.filter((file) => file.key !== key)
    setDraft(next)
    setSelected((current) => index < current ? current - 1 : Math.min(current, Math.max(0, next.length - 1)))
  }

  async function save() {
    if (saving) return
    const form = new FormData()
    form.set('title', title)
    form.set('body', body)
    form.set('keep', JSON.stringify(draft.flatMap((item) => item.keepIndex === undefined ? [] : [item.keepIndex])))
    form.set('order', JSON.stringify(draft.map((item) => item.keepIndex === undefined ? 'file' : 'keep')))
    for (const item of draft) {
      if (item.file) form.append('file', item.file)
    }
    setSaving(true)
    try {
      const next = await updateNewsPost(transport, post.id, form)
      for (const item of draft) {
        if (!item.file) continue
        URL.revokeObjectURL(item.url)
        createdUrls.current = createdUrls.current.filter((url) => url !== item.url)
      }
      setEditing(false)
      onSaved(next)
    } catch {
      toast.error('Не удалось сохранить пост')
    } finally {
      setSaving(false)
    }
  }

  const canSave = title.trim().length > 0 || body.trim().length > 0 || draft.length > 0
  const selectedIndex = Math.min(selected, Math.max(0, draft.length - 1))
  const selectedFile = draft[selectedIndex]
  const previewSlides = selectedFile
    ? [{ kind: selectedFile.kind, url: selectedFile.url, ...(selectedFile.poster ? { poster: selectedFile.poster } : {}) }]
    : []
  const showHero = editing || slides.length > 0
  return (
    <>
      {showHero ? (
        <div className={newsHeroClass}>
          <div className={newsHeroFrameClass}>
            {editing && previewSlides.length === 0 ? null : (
              <NewsSlides key={editing ? selectedFile?.key : post.id} size="hero" slides={editing ? previewSlides : slides} />
            )}
            <NewsPostClose editing={editing} saving={saving} canSave={canSave} onCancel={cancelEdit} onEdit={startEdit} onSave={() => void save()} className="top-2 right-2" />
            {editing && selectedFile ? (
              <label className="absolute top-2 left-2 z-[5] inline-flex size-[30px] cursor-pointer items-center justify-center rounded-full bg-black/55 text-white">
                <ImagePlusIcon aria-hidden className="size-4" strokeWidth={1.75} />
                <span className="sr-only">Заменить файл</span>
                <input
                  accept={EDITABLE_MEDIA}
                  className="sr-only"
                  type="file"
                  onChange={(event) => {
                    replaceSelected(event.target.files)
                    event.target.value = ''
                  }}
                />
              </label>
            ) : null}
            {editing ? (
              <div className="absolute inset-x-2 bottom-2 z-[5] flex items-center gap-2">
                {draft.length > 0 ? (
                  <div className="flex min-w-0 gap-1.5 overflow-x-auto rounded-[16px] bg-black/80 p-1.5">
                    {draft.map((item, index) => (
                      <div key={item.key} className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-black">
                        <button
                          aria-label={`Показать файл ${index + 1}`}
                          aria-pressed={index === selectedIndex}
                          className="size-full"
                          type="button"
                          onClick={() => setSelected(index)}
                        >
                          {item.kind === 'video' ? (
                            <video className={cn('size-full object-cover', index !== selectedIndex && 'grayscale')} muted playsInline poster={item.poster} src={item.url} />
                          ) : (
                            <img alt="" className={cn('size-full object-cover', index !== selectedIndex && 'grayscale')} src={item.url} />
                          )}
                        </button>
                        <button
                          aria-label="Удалить файл"
                          className="absolute top-1 right-1 inline-flex size-5 items-center justify-center rounded-full bg-black/70 text-white"
                          type="button"
                          onClick={() => removeFile(item.key)}
                        >
                          <XIcon aria-hidden className="size-3" strokeWidth={1.75} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {draft.length < 10 ? (
                  <label className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white">
                    <PlusIcon aria-hidden className="size-4" strokeWidth={1.75} />
                    <span className="sr-only">Добавить фото или видео</span>
                    <input
                      accept={EDITABLE_MEDIA}
                      className="sr-only"
                      multiple
                      type="file"
                      onChange={(event) => {
                        addFiles(event.target.files)
                        event.target.value = ''
                      }}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <NewsPostClose editing={editing} saving={saving} canSave={canSave} onCancel={cancelEdit} onEdit={startEdit} onSave={() => void save()} className="top-3 right-3" />
      )}
      <DialogHeader className="gap-1 px-3 pt-3 sm:px-4 sm:pt-3.5">
        {editing ? (
          <>
            <DialogTitle className="sr-only">Редактирование поста</DialogTitle>
            <input
              aria-label="Заголовок"
              spellCheck={false}
              className={cn(newsEditFieldClass, newsEditTypeClass, 'h-auto appearance-none py-[8.4px]')}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </>
        ) : (
          <DialogTitle className={newsDialogTitleClass}>{postTitle(post)}</DialogTitle>
        )}
        <DialogDescription className={newsDialogMetaClass}>
          @{post.channelHandle} · {formatPostTime(post.postedAt)}
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pt-3 pb-4 sm:px-4">
        {editing ? (
          <div className={cn(newsEditFieldClass, 'p-0 pr-3 pb-3 focus-within:shadow-[var(--nora-shadow-focus)]')}>
            <textarea
              ref={bodyField}
              aria-label="Текст поста"
              spellCheck={false}
              className={cn(newsEditTypeClass, 'block min-h-5 w-full resize-y overflow-hidden border-0 bg-transparent px-3 pt-3 pb-[15px] whitespace-pre-wrap outline-none')}
              rows={1}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
        ) : postBody(post) ? (
          <p className="whitespace-pre-wrap font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]">
            {postBody(post)}
          </p>
        ) : null}
      </div>
    </>
  )
}

const newsCornerIconButtonClass =
  'inline-flex size-[30px] cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--nora-surface)] text-[var(--nora-text-tertiary)] outline-none hover:text-[var(--nora-text)] disabled:opacity-50'

function NewsPostClose({
  editing,
  saving,
  canSave,
  onCancel,
  onEdit,
  onSave,
  className,
}: {
  editing: boolean
  saving: boolean
  canSave: boolean
  onCancel: () => void
  onEdit: () => void
  onSave: () => void
  className: string
}) {
  return (
    <div className={cn('absolute z-[6] flex items-center gap-2', className)}>
      {editing ? (
        <button
          aria-label="Сохранить"
          className={newsCornerIconButtonClass}
          disabled={saving || !canSave}
          type="button"
          onClick={onSave}
        >
          <SaveIcon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      ) : (
        <button aria-label="Изменить" className={newsCornerIconButtonClass} type="button" onClick={onEdit}>
          <PencilIcon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      )}
      {editing ? (
        <button aria-label="Отмена" className={newsCornerIconButtonClass} disabled={saving} type="button" onClick={onCancel}>
          <XIcon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      ) : (
        <DialogClose className={newsCornerIconButtonClass}>
          <XIcon aria-hidden className="size-4" strokeWidth={1.75} />
          <span className="sr-only">Закрыть</span>
        </DialogClose>
      )}
    </div>
  )
}

function editableTitle(post: NewsPost) {
  return post.text.split('\n').map((item) => item.trim()).find(Boolean) ?? ''
}

function editableBody(post: NewsPost) {
  const lines = post.text.split('\n').map((item) => item.trim()).filter(Boolean)
  if (lines.length <= 1) return ''
  return lines.slice(1).join('\n\n')
}

function postTitle(post: NewsPost) {
  const line = post.text.split('\n').map((item) => item.trim()).find(Boolean)
  if (line) return line
  return post.media.some((item) => item.kind === 'video') ? 'Видео' : 'Фото'
}

function postBody(post: NewsPost) {
  const lines = post.text.split('\n').map((item) => item.trim()).filter(Boolean)
  if (lines.length <= 1) return ''
  return lines.slice(1).join('\n\n')
}

function postExcerpt(post: NewsPost, title: string) {
  const rest = post.text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(1)
    .join(' ')
  if (rest) return rest
  return post.text.trim() === title ? '' : post.text.trim()
}

function formatPostTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
