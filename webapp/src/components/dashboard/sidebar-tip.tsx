const SIDEBAR_TIP_TITLE = 18

export function sidebarTipTitle(title: string) {
  const trimmed = title.trim()
  if (trimmed.length <= SIDEBAR_TIP_TITLE) return trimmed
  return `${trimmed.slice(0, SIDEBAR_TIP_TITLE).trimEnd()}…`
}

export function sidebarTip(title: string, when = '') {
  return {
    hidden: false,
    children: (
      <span className="flex max-w-40 flex-col gap-1 text-left leading-4">
        <span className="block">{sidebarTipTitle(title)}</span>
        {when ? <span className="font-normal opacity-80">{when}</span> : null}
      </span>
    ),
  }
}
