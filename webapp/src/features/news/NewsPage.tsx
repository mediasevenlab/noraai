import { useEffect, useMemo, useState } from 'react'
import type { NewsPost } from '@web-app-demo/contracts'

import {
  BookmarkIcon,
  CirclePlusIcon,
  ClapperboardIcon,
  DownloadIcon,
  LinkIcon,
  NewspaperIcon,
  Share2Icon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from '@/components/icons'

import { noraPageDescriptionClass, noraPageTitleClass } from '@/components/PageLayout'
import { NoraButton, NoraHoverTip, NoraInput } from '@/components/nora/primitives'
import { ProductFeedEmpty, productDesktopCardMinHeightClass, productFeedGridClass, productFeedPageClass, productSheetOverlayChipClass, productToolbarSelectContentClass, productToolbarSelectItemClass } from '@/components/nora/product-sheet'
import { ProductToolbarSearch } from '@/components/nora/toolbar-search'
import {
  Dialog,
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
import {
  DiaryPeriodPicker,
  diaryToolbarPairDividerClass,
  diaryToolbarPillClass,
} from '@/features/diary'
import { ApiRequestError } from '@/platform/api'
import { cn } from '@/lib/utils'

import { deleteNewsChannel, deleteNewsPost, importNewsPosts, listNewsPosts } from './api'

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

  useEffect(() => {
    let cancelled = false
    const listed = new Set(readNewsChannels().map((channel) => channel.handle.toLowerCase()))
    void listNewsPosts(transport)
      .then(async (feed) => {
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

  function toggleBookmark(postId: string) {
    setBookmarks((current) => {
      const next = current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [postId, ...current]
      writeNewsBookmarks(next)
      return next
    })
  }

  async function sharePostLink(post: NewsPost) {
    try {
      await navigator.clipboard.writeText(post.href)
      toast.success('Ссылка скопирована', { icon: <LinkIcon className="size-4" /> })
    } catch {
      toast.error('Не удалось скопировать ссылку')
    }
  }

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
    try {
      const result = await importNewsPosts(
        transport,
        channels.map((channel) => channel.handle),
        { from: range.from.toISOString(), to: range.to.toISOString() },
      )
      const listed = new Set(channels.map((channel) => channel.handle.toLowerCase()))
      setPosts(result.posts.filter((post) => listed.has(post.channelHandle.toLowerCase())))
      if (result.imported > 0) toast.success(`Новых постов: ${result.imported}`)
      else if (result.failed.length > 0) toast.error('Не удалось открыть канал')
      else toast.info('Новых постов за этот период нет')
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? 'Не удалось выгрузить посты' : 'Не удалось выгрузить посты')
    } finally {
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
        <div className={productFeedGridClass}>
          {visible.map((post) => (
            <NewsCard
              key={post.id}
              post={post}
              saved={bookmarks.includes(post.id)}
              onDelete={() => {
                void deletePost(post)
              }}
              onOpen={() => setOpenPost(post)}
              onShare={() => {
                void sharePostLink(post)
              }}
              onToggleSave={() => toggleBookmark(post.id)}
            />
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
        <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden md:max-w-[min(560px,calc(100%-2rem))]">
          {openPost ? (
            <NewsPostView
              post={openPost}
              saved={bookmarks.includes(openPost.id)}
              onShare={() => {
                void sharePostLink(openPost)
              }}
              onToggleSave={() => toggleBookmark(openPost.id)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function NewsCard({
  post,
  saved,
  onOpen,
  onDelete,
  onShare,
  onToggleSave,
}: {
  post: NewsPost
  saved: boolean
  onOpen: () => void
  onDelete: () => void
  onShare: () => void
  onToggleSave: () => void
}) {
  const title = postTitle(post)
  const cover = post.media.find((item) => item.kind === 'image')
  const hasVideo = post.media.some((item) => item.kind === 'video')
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
      <button className="flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col text-left" type="button" onClick={onOpen}>
        <div className="relative shrink-0 px-2 pt-2">
          <div className="relative block w-full" data-slot="meal-card-preview">
            <div
              className="relative aspect-[4/3] max-h-[132px] w-full overflow-hidden bg-[var(--nora-inset)] shadow-[inset_0_0_0_1px_var(--nora-border)] sm:max-h-[148px] md:aspect-auto md:h-[168px] md:max-h-none"
              data-slot="meal-cover"
            >
              {cover ? (
                <img alt="" className="size-full object-cover" src={cover.url} />
              ) : (
                <span className="flex size-full items-center justify-center text-[var(--nora-text-tertiary)]">
                  <NewspaperIcon aria-hidden className="size-6" strokeWidth={1.5} />
                </span>
              )}
              {hasVideo ? (
                <span className="absolute right-2 bottom-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                  <ClapperboardIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                </span>
              ) : null}
            </div>
          </div>
        </div>
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
        <div className="flex items-center justify-between gap-2 py-2">
          <p className="min-w-0 truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)]">
            @{post.channelHandle} · {formatPostTime(post.postedAt)}
          </p>
          <NewsPostActions saved={saved} onShare={onShare} onToggleSave={onToggleSave} />
        </div>
      </div>
    </article>
  )
}

function NewsPostActions({
  saved,
  onShare,
  onToggleSave,
}: {
  saved: boolean
  onShare: () => void
  onToggleSave: () => void
}) {
  const shareLabel = 'Поделиться ссылкой'
  const saveLabel = saved ? 'Убрать из закладок' : 'Добавить в закладки'
  const buttonClass = cn(
    'nora-press-grow inline-flex size-6 shrink-0 items-center justify-center rounded-full border-0 bg-transparent',
    'text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]',
  )
  return (
    <div className="flex shrink-0 items-center justify-end gap-1">
      <NoraHoverTip label={shareLabel}>
        <button aria-label={shareLabel} className={buttonClass} type="button" onClick={onShare}>
          <Share2Icon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      </NoraHoverTip>
      <NoraHoverTip label={saveLabel}>
        <button
          aria-label={saveLabel}
          aria-pressed={saved}
          className={cn(buttonClass, saved && 'text-[var(--nora-tint)] hover:text-[var(--nora-tint)]')}
          type="button"
          onClick={onToggleSave}
        >
          <BookmarkIcon aria-hidden className={cn('size-4', saved && 'fill-current')} strokeWidth={1.75} />
        </button>
      </NoraHoverTip>
    </div>
  )
}

function NewsPostView({
  post,
  saved,
  onShare,
  onToggleSave,
}: {
  post: NewsPost
  saved: boolean
  onShare: () => void
  onToggleSave: () => void
}) {
  const images = post.media.filter((item) => item.kind === 'image')
  const videos = post.media.filter((item) => item.kind === 'video')
  const heroVideo = videos[0]
  const heroImage = heroVideo ? undefined : images[0]
  const extraImages = heroVideo ? images : images.slice(1)
  const extraVideos = videos.slice(1)
  return (
    <>
      {heroVideo || heroImage ? (
        <div className={newsHeroClass}>
          <div className={newsHeroFrameClass}>
            {heroVideo ? (
              <video
                className="size-full object-contain"
                controls
                playsInline
                poster={images[0]?.url}
                preload="metadata"
                src={heroVideo.url}
              />
            ) : (
              <img alt="" className="size-full object-cover" src={heroImage?.url} />
            )}
          </div>
        </div>
      ) : null}
      <DialogHeader className="gap-1 px-3 pt-3 sm:px-4 sm:pt-3.5">
        <DialogTitle className={newsDialogTitleClass}>{postTitle(post)}</DialogTitle>
        <DialogDescription className={newsDialogMetaClass}>
          @{post.channelHandle} · {formatPostTime(post.postedAt)}
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pt-3 pb-4 sm:px-4">
        {extraVideos.map((item) => (
          <video
            key={item.url}
            className="max-h-[360px] w-full rounded-[12px] bg-black sm:rounded-[14px]"
            controls
            playsInline
            preload="metadata"
            src={item.url}
          />
        ))}
        {extraImages.map((item) => (
          <img key={item.url} alt="" className="w-full rounded-[12px] sm:rounded-[14px]" src={item.url} />
        ))}
        {postBody(post) ? (
          <p className="whitespace-pre-wrap font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]">
            {postBody(post)}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 px-3 sm:px-4">
        <div aria-hidden className={newsFooterDividerClass} />
        <div className="flex justify-end py-2">
          <NewsPostActions saved={saved} onShare={onShare} onToggleSave={onToggleSave} />
        </div>
      </div>
    </>
  )
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
