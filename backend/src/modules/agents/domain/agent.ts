export const CHAT_AGENT_IDS = ['nora', 'chatgpt', 'gemini'] as const

export type ChatAgentId = (typeof CHAT_AGENT_IDS)[number]

export type AgentReady = Record<ChatAgentId, boolean>

export type AgentCard = {
  id: ChatAgentId
  name: string
  ready: boolean
  detail: string
}

export type AgentView = {
  agent: ChatAgentId
  agents: AgentCard[]
}

const NAMES: Record<ChatAgentId, string> = {
  nora: 'Нора',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
}

export function isChatAgent(value: string): value is ChatAgentId {
  return (CHAT_AGENT_IDS as readonly string[]).includes(value)
}

/** A stored value outside the three agents falls back to Nora. */
export function parseChatAgent(value: string | null | undefined): ChatAgentId {
  return value && isChatAgent(value) ? value : 'nora'
}

export function agentView(selected: ChatAgentId, ready: AgentReady): AgentView {
  return {
    agent: selected,
    agents: CHAT_AGENT_IDS.map((id) => ({
      id,
      name: NAMES[id],
      ready: ready[id],
      detail: agentDetail(id, ready[id]),
    })),
  }
}

function agentDetail(id: ChatAgentId, ready: boolean) {
  if (id === 'nora') {
    return ready
      ? 'Локальная модель подключена. Она читает карточку компании и отбирает закупки.'
      : 'Локальная модель не настроена.'
  }
  return ready
    ? `${NAMES[id]} подключён и может отбирать закупки по карточке компании.`
    : 'Ключ API ещё не задан. Отбор включится, когда ключ появится.'
}

export function agentName(id: ChatAgentId) {
  return NAMES[id]
}
