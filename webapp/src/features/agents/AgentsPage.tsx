import { useEffect, useState } from 'react'
import type { ChatAgentId, UserDto } from '@web-app-demo/contracts'

import { SettingsCanvas, SettingsEntry } from '@/components/settings-canvas'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth'

import { loadAgents, selectAgent, type ChatAgentView } from './api'

export function AgentsPage({ user }: { user: UserDto }) {
  const transport = useAuth().transport
  const [view, setView] = useState<ChatAgentView | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    loadAgents(transport)
      .then((result) => {
        if (current) setView(result)
      })
      .catch((reason: unknown) => {
        if (!current) return
        setError(reason instanceof Error ? reason.message : 'Не удалось открыть агентов')
      })
    return () => {
      current = false
    }
  }, [transport])

  function choose(id: ChatAgentId) {
    if (!view || view.agent === id) return
    const previous = view
    setView({ ...view, agent: id })
    setError('')
    void selectAgent(transport, id).then(setView).catch((reason: unknown) => {
      setView(previous)
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить')
    })
  }

  return (
    <SettingsCanvas
      description="Один агент читает карточку компании и отбирает подходящие закупки. Включён может быть только один."
      eyebrow="Аккаунт"
      meta={user.email}
      phoneSheet
      showJumpLink={false}
      showMobileTitle
      title="ИИ агенты"
    >
      <SettingsEntry
        description="Нора работает сразу. ChatGPT и Gemini подключатся, когда будет ключ API."
        hideTitleOnMobile={false}
        controlsClassName="px-4 py-4"
        title="Агенты"
      >
        {error ? <p className="mb-3 text-[13px] text-[var(--nora-error)]">{error}</p> : null}
        {!view ? (
          <p className="font-[family-name:var(--nora-font)] text-[13px] leading-5 text-[var(--nora-text-secondary)]">
            Открываю агентов…
          </p>
        ) : (
          <ul className="flex flex-col">
            {view.agents.map((agent) => (
              <li key={agent.id} className="flex items-center gap-4 border-t border-[var(--nora-divider)] py-3 first:border-t-0 first:pt-1 last:pb-1">
                <div className="min-w-0 flex-1 py-1.5">
                  <div className="truncate font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                    {agent.name}
                  </div>
                  <div className="mt-1 font-[family-name:var(--nora-font)] text-[12px] leading-5 text-[var(--nora-text-tertiary)]">
                    {agent.detail}
                  </div>
                </div>
                <Switch
                  aria-label={view.agent === agent.id ? `Выбран агент ${agent.name}` : `Выбрать ${agent.name}`}
                  checked={view.agent === agent.id}
                  onCheckedChange={(on) => {
                    if (on) choose(agent.id)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsEntry>
    </SettingsCanvas>
  )
}
