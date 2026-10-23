# Local n8n

This checkout is a separate copy. Its n8n project is `ai-news-1-n8n` on `127.0.0.1:5680`, and its workflows call this copy's API on port `3010`. Do not start or import into `nutrition-app-n8n`: that project is the other local checkout and already owns port `5679`.

n8n is an optional local workflow tool. It is isolated from the application:

- `n8n` stores workflows, credentials, and execution metadata in its own `n8n_postgres` service and named Docker volumes.
- It does not access the application's PostgreSQL database.
- Its editor is bound only to `127.0.0.1:5680`; it is not publicly reachable.
- It runs under the dedicated `ai-news-1-n8n` Compose project, so application E2E and Docker smoke cleanup cannot remove its volumes.

## First run

Create the local configuration:

```powershell
Copy-Item n8n/.env.example n8n/.env
```

Set a unique `N8N_DB_PASSWORD` and a stable, random `N8N_ENCRYPTION_KEY`. Do not change the encryption key after creating credentials in n8n; doing so prevents n8n from decrypting them.

Start n8n and its database from the repository root:

```powershell
docker compose -p ai-news-1-n8n --env-file n8n/.env -f docker-compose.n8n.yml pull n8n n8n_postgres
docker compose -p ai-news-1-n8n --env-file n8n/.env -f docker-compose.n8n.yml up -d n8n
docker compose -p ai-news-1-n8n --env-file n8n/.env -f docker-compose.n8n.yml ps n8n n8n_postgres
```

Open [http://localhost:5680](http://localhost:5680), then create the initial n8n owner account. This account is separate from application accounts.

## Imported workflows

Committed workflow exports live in `n8n/workflows/` (legacy nutrition-nora stack):

- `lab-pdf-webhook.json` — PDF → JSON lab analyze webhook
- `lab-interpret-webhook.json` — lab interpretation webhook
- `meal-diary-webhook.json` — meal diary analyze webhook (Telegram bot path)
- `meal-app-analyze.json` — meal diary analyze webhook (in-app Add modal)
- `meal-nora-analyze.json` — same card, office models (photo → vision, text → text model)
- `meal-voice-transcribe.json` — meal composer voice → text webhook
- `telegram-polling-pcc-inbox.json` — Telegram polling → inbox (unrelated PCC/Obsidian product; do not use for meals)
- `mentor-meal-notify.json` — mentor notification when a mentee saves a meal (Telegram now; extra messengers later)

Import into the local n8n container (n8n must already be running):

```powershell
.\n8n\import-workflows.ps1
```

The script upserts by the committed workflow `id` (`import:workflow --overwrite` when the CLI supports it, otherwise `delete:workflow --id=…` then import). Re-running it should not create duplicate workflows. Missing-delete on a first run is expected.

After import, open the editor and activate `Дневник питания: фото → карточка` when testing the meal bot, `Дневник питания: приложение → карточка` for the diary **Добавить** modal, `Дневник питания: голос → текст` for the meal-card voice composer, and `Наставник: новый приём подопечного` for mentor Telegram notifications. PCC credentials are separate and optional.

### Meal diary path (local)

Interactive Telegram UX (same as production `@nutrition_meals_bot`, with app user binding):

1. User starts a Telegram bind from Settings (code + bot link). The poller matches the 6-digit code to the claimed username or phone; profile PATCH cannot set a Telegram identity.
2. Photo / album starts a chat session (up to 5 photos). Without a caption the bot waits up to ~20 seconds for more photos, voice, or text; `/cancel` or the inline **Отменить загрузку** button clears the draft.
3. Caption on the photo, or a follow-up voice/text after photos, triggers analyze immediately. Voice/text first is accepted and the bot asks for a photo.
4. Poller calls `N8N_MEAL_WEBHOOK_URL` (default `http://127.0.0.1:5680/webhook/meal-diary-analyze`).
5. n8n posts to `http://host.docker.internal:3010/api/internal/meals-gemini` with `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`.
6. Backend persists the meal for the linked user; diary/mentor UI merges API meals with demo catalog cards.
7. In the diary meal modal, the owner (or assigned mentor) can refine a card with the model that user chose in Settings (`POST .../meals/:id/refine`): text and/or composition photo, up to 5 edits after the original. Versions appear in the dropdown (`vers. 1.0`, `vers. 2.0`, …); switching calls `.../select-version` and restores that snapshot’s title, macros, portion (each item with its own КБЖУ), comment, micronutrients, and assumptions.

Required backend env (see `backend/.env.example`):

- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `GEMINI_API_HOST` / `GEMINI_API_PORT` / `GEMINI_PROXY_TOKEN` — for regions blocked by Google, use the Netherlands Gemini HTTPS proxy (legacy lab-api values), not `generativelanguage.googleapis.com`
- `INTERNAL_SERVICE_TOKEN` (same value in n8n env as `INTERNAL_SERVICE_TOKEN`)
- `TELEGRAM_MEALS_BOT_TOKEN`
- `N8N_MEAL_WEBHOOK_URL`
- `N8N_APP_MEAL_WEBHOOK_URL` (default `http://127.0.0.1:5680/webhook/meal-app-analyze`)
- `N8N_NORA_MEAL_WEBHOOK_URL` (default `http://127.0.0.1:5680/webhook/meal-nora-analyze`) — used only when the user picks Nora in Settings
- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_TEXT_MODEL`, `LLM_VISION_MODEL` — office OpenAI-compatible API. The key stays in backend env. Photo uses the vision model, text-only uses the text model, and the backend queues them so the single GPU loads one model at a time. Ollama on `127.0.0.1:18005` answers 403 when nginx forwards `Host: llm.25nutrition.site`. The llm site must proxy with `proxy_set_header Host 127.0.0.1:18005;` and keep `proxy_read_timeout 300s`. `/healthz` stays on nginx and does not need the key.
- `LLM_STT_URL` — office speech model (GigaAM) for the settings chat microphone. Meal voice stays on the Gemini/n8n transcribe path. On Nora the backend joins the `nora-llm_default` network and calls the speech container on port 8080. The host address `127.0.0.1:18150` is not reachable from the nutrition container.
- `LLM_SEARCH_URL` — SearXNG for the chat. Local Compose publishes it on `http://127.0.0.1:18080`. On Nora the backend uses the docker-network address on port 8080. When the internet button is on, the backend searches the user's question and gives those results to the model. A photo in the thread does not turn that search off.
- `N8N_TRANSCRIBE_WEBHOOK_URL` (default `http://127.0.0.1:5680/webhook/meal-voice-transcribe`)
- `N8N_MENTOR_NOTIFY_WEBHOOK_URL` (default `http://127.0.0.1:5680/webhook/mentor-meal-notify`)
- `TELEGRAM_NOTIFY_BOT_TOKEN`
- `TELEGRAM_NOTIFY_BOT_USERNAME`

Put the same `INTERNAL_SERVICE_TOKEN` into `n8n/.env` (or `n8n/.env.secrets` if your compose loads it) so the Code node can read `$env.INTERNAL_SERVICE_TOKEN`. Compose maps `host.docker.internal` via `extra_hosts: host-gateway`.

If n8n is down, the poller, the in-app add-meal composer, and the meal-card voice composer fall back to Gemini directly on the backend and log `n8n … fallback to Gemini` with `fallbackFrom: "n8n"` on the analysis payload. The confirmation in the composer or meals bot says the card was parsed directly. Mentor meal notifications still do not block saving the meal: the first failure is returned as `mentorNotify: "failed"`, logged, shown in the confirmation, and retried twice in the process background.

### In-app add meal path (local)

1. In the diary, tap **Добавить**. The modal talks like the Telegram bot: photo first (or text/voice first, then photo).
2. Extra photos, a caption, follow-up text, or the send button collect the draft. Voice is transcribed into the input first. Analysis starts only when the user sends, then the modal replaces the chat with a card skeleton (including tabs and the version button) and the finished meal card so refinements can continue in place. Attached photos can be removed before send. The in-app modal does not auto-analyze after a wait; Telegram still does. Multiple dish photos are analyzed together; if n8n returns a card without nutrition or composition, the backend falls back to Gemini.
3. Webapp `POST /api/users/me/meals/composer` owns the chat session for the signed-in user.
4. Backend calls `N8N_APP_MEAL_WEBHOOK_URL` (default `http://127.0.0.1:5680/webhook/meal-app-analyze`); if that is unset it uses `N8N_MEAL_WEBHOOK_URL`.
5. n8n posts to `http://host.docker.internal:3010/api/internal/meals-gemini` with `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`.
6. Backend persists the meal as `source: manual` and returns the bot-style confirmation into the modal chat.

Required extra backend env: `N8N_APP_MEAL_WEBHOOK_URL`.

### Meal voice composer path (local)

1. In the diary meal modal, click the microphone (desktop) or press-and-hold it (phone).
2. Desktop: speak, then tap the checkmark to finish, or X to cancel. Phone: release the button to finish.
3. Webapp `POST /api/users/me/meals/transcribe` sends the recording.
4. Backend calls `N8N_TRANSCRIBE_WEBHOOK_URL`; n8n posts to `http://host.docker.internal:3010/api/internal/meals-transcribe`.
5. Gemini returns plain text; it is inserted into the composer field. Send still uses the existing refine path.

Gemini API values for the app belong in `backend/.env`. Optional copies for local automation can sit in gitignored `n8n/.env.secrets`.

### Mentor meal notifications (local)

When a mentee saves a **new** meal they created themselves (diary **Добавить** or the meals bot), the backend looks up their assigned mentor. If that mentor has bound the notifications bot, backend posts to `N8N_MENTOR_NOTIFY_WEBHOOK_URL` (default `http://127.0.0.1:5680/webhook/mentor-meal-notify`). n8n sends Telegram `sendMessage`. Meal edits, meals the mentor created for the mentee, and meals copied from a ration or the feed are not sent.

The notifications bot is separate from the meals bot. Mentors bind it from `/mentor/settings` with the same 6-digit code flow. The backend poller on `TELEGRAM_NOTIFY_BOT_TOKEN` only completes the bind and stores `telegramChatId`; n8n owns delivery so later messengers can share the same webhook. Put the same token in `n8n/.env` as `TELEGRAM_NOTIFY_BOT_TOKEN`.

On a host that cannot reach `api.telegram.org`, set `TELEGRAM_API_BASE` to the foreign proxy path (the same host as Gemini, with `/telegram`). The poller and this workflow then call that base and send `X-Gemini-Proxy-Token` from `GEMINI_PROXY_TOKEN`. Leave `TELEGRAM_API_BASE` empty to call Telegram directly.

News import uses the same proxy host when `GEMINI_API_HOST` is not `*.googleapis.com`. Public channel HTML is `GET /tme/s/{channel}`. Post images and video are `GET /cdn` with `X-Upstream-Url` set to an allowlisted `t.me` or Telegram CDN address. The browser only talks to this API, so playback does not need a VPN. Direct `t.me` is used when the Google host is configured.

Required extra backend env: `TELEGRAM_NOTIFY_BOT_TOKEN`, `TELEGRAM_NOTIFY_BOT_USERNAME`, `N8N_MENTOR_NOTIFY_WEBHOOK_URL`. Optional: `TELEGRAM_API_BASE`.

### News archive

«Выгрузить» walks the channel list in the order saved in the app, oldest post first inside one channel. The backend parses the public pages, skips posts that already have an archive copy, and calls `N8N_NEWS_ARCHIVE_WEBHOOK_URL` (default `http://127.0.0.1:5680/webhook/news-archive-sync`). The workflow asks the backend to publish each source post as one channel message. Several photos or videos become one album. A video preview image is not sent as its own message. Telegram cannot download a public CDN link itself, so the backend downloads each file and uploads the bytes. Sends are spaced a few seconds apart so the channel does not hit Telegram's rate limit. The backend then stores the returned message ids. The open news page asks for that saved list while the export runs, so the posts show up together even when the long request itself drops. Before that save, the same export step asks the model to read the post text and mark advertising. The check is not an n8n node. A second export does not publish those posts again. Deleting a post or its channel asks the same workflow to `deleteMessage` before the row is removed. A deleted post can be exported again. «Сохранить» in an open post writes the new title and text into the same archive message when the files stay the same. Adding or removing a photo or video sends a new archive message first and deletes the previous one only after that send succeeds. The model reads the edited text again and refreshes the ad mark. That save talks to Telegram directly and does not go through this workflow.

Put the news bot token and the private channel id in `n8n/.env` as well as the backend token in `backend/.env`. Do not commit either value. Recreate the n8n container after changing them so the workflow can read `$env`.

## Operations

```powershell
# View n8n logs
docker compose -p ai-news-1-n8n --env-file n8n/.env -f docker-compose.n8n.yml logs -f n8n

# Stop without deleting workflows or credentials
docker compose -p ai-news-1-n8n --env-file n8n/.env -f docker-compose.n8n.yml stop n8n n8n_postgres

# Start again
docker compose -p ai-news-1-n8n --env-file n8n/.env -f docker-compose.n8n.yml up -d n8n

# Check database readiness
docker compose -p ai-news-1-n8n --env-file n8n/.env -f docker-compose.n8n.yml exec n8n_postgres pg_isready -U n8n -d n8n
```

The `n8n_data` and `n8n_postgres_data` named volumes are persistent. Do not run `docker compose down -v` unless you intentionally want to erase n8n workflows, credentials, execution history, and its database.

## Application integration

Meal recognition uses authenticated backend internal routes (`INTERNAL_SERVICE_TOKEN`). Do not connect n8n directly to the application's database: it would bypass validation, authorization, auditing, and business rules owned by the backend.

This local configuration is not a public deployment. Before exposing n8n, configure HTTPS, a public webhook URL, access control, secret management, backups, and a dedicated production database.
