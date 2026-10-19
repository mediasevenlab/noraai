import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
  createMealFromBotRequestSchema,
  createMealFromBotResponseSchema,
  createUserMealRequestSchema,
  createUserMealResponseSchema,
  deleteMealResponseSchema,
  generationPricingResponseSchema,
  resetGenerationSpendResponseSchema,
  listMealsResponseSchema,
  mealMutationResponseSchema,
  mealsGeminiRequestSchema,
  mealsGeminiResponseSchema,
  mealsNoraRequestSchema,
  mealEngineResponseSchema,
  updateMealEngineRequestSchema,
  mealsTranscribeRequestSchema,
  mealsTranscribeResponseSchema,
  noraModelChatRequestSchema,
  noraModelChatResponseSchema,
  mealComposerTurnRequestSchema,
  mealComposerTurnResponseSchema,
  refineMealRequestSchema,
  rewriteMealRequestSchema,
  selectMealVersionRequestSchema,
  shareMealRequestSchema,
  likeMealRequestSchema,
  setMealPlanDoneRequestSchema,
  mentorUnreadMealsResponseSchema,
  markMentorMealsViewedRequestSchema,
  markMentorMealsViewedResponseSchema,
  telegramUserLookupResponseSchema,
  telegramUsernameSchema,
  type MealsGeminiResponse,
  type MealsNoraRequest,
  type MealsTranscribeRequest,
  type MealsTranscribeResponse,
  type NoraModelChatRequest,
  type NoraModelChatResponse,
} from '@web-app-demo/contracts'

import type { MiddlewareHandler } from 'hono'
import { validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { MealsService } from '../application/meals-service'
import { MealsFailure } from '../domain/errors'

import type { AppMealComposer } from '../application/app-meal-composer'
import type { createMealEngineStore } from '../infrastructure/meal-engine-store'
import { executeMeals } from './errors'
import { createRequireServiceToken } from './service-token'
import { generationRequestKey, rememberGenerationUsage } from '../application/generation-usage-bridge'
const errorContent = {
  'application/json': {
    schema: z.object({
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    }),
  },
}

const mealsNoraRoute = createRoute({
  method: 'post',
  path: '/meals-nora',
  tags: ['Internal'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: mealsNoraRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealsGeminiResponseSchema } },
      description: 'Nora meal card. Photo uses the vision model, text uses the text model.',
    },
    401: { content: errorContent, description: 'Service token required' },
    502: { content: errorContent, description: 'Upstream model failure' },
    503: { content: errorContent, description: 'Nora model is not configured' },
  },
})
const mealsGeminiRoute = createRoute({
  method: 'post',
  path: '/meals-gemini',
  tags: ['Internal Meals'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: mealsGeminiRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealsGeminiResponseSchema } },
      description: 'Gemini meal card',
    },
    401: { content: errorContent, description: 'Service token required' },
    502: { content: errorContent, description: 'Upstream Gemini failure' },
    503: { content: errorContent, description: 'Gemini not configured' },
  },
})
const mealsTranscribeRoute = createRoute({
  method: 'post',
  path: '/meals-transcribe',
  tags: ['Internal Meals'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: mealsTranscribeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealsTranscribeResponseSchema } },
      description: 'Gemini voice transcript',
    },
    401: { content: errorContent, description: 'Service token required' },
    502: { content: errorContent, description: 'Upstream Gemini failure' },
    503: { content: errorContent, description: 'Gemini not configured' },
  },
})
const telegramLookupRoute = createRoute({
  method: 'get',
  path: '/users/by-telegram/{username}',
  tags: ['Internal Meals'],
  request: {
    params: z.object({
      username: telegramUsernameSchema,
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: telegramUserLookupResponseSchema } },
      description: 'Telegram username lookup',
    },
    401: { content: errorContent, description: 'Service token required' },
  },
})
const createMealRoute = createRoute({
  method: 'post',
  path: '/meals',
  tags: ['Internal Meals'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createMealFromBotRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createMealFromBotResponseSchema } },
      description: 'Created or existing meal',
    },
    401: { content: errorContent, description: 'Service token required' },
  },
})
const listMyMealsRoute = createRoute({
  method: 'get',
  path: '/me/meals',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: listMealsResponseSchema } },
      description: 'Current user meals',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})
const createMyMealRoute = createRoute({
  method: 'post',
  path: '/me/meals',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createUserMealRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createUserMealResponseSchema } },
      description: 'Created or existing meal',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
  },
})
const transcribeMyVoiceRoute = createRoute({
  method: 'post',
  path: '/me/meals/transcribe',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: mealsTranscribeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealsTranscribeResponseSchema } },
      description: 'Voice transcript for the meal composer',
    },
    401: { content: errorContent, description: 'Authentication required' },
    502: { content: errorContent, description: 'Upstream transcription failure' },
    503: { content: errorContent, description: 'Transcription is not configured' },
  },
})
const modelChatRoute = createRoute({
  method: 'post',
  path: '/me/model-chat',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: noraModelChatRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: noraModelChatResponseSchema } },
      description: 'Plain reply from the configured text or vision model',
    },
    400: { content: errorContent, description: 'Empty chat turn' },
    401: { content: errorContent, description: 'Authentication required' },
    502: { content: errorContent, description: 'Upstream model failure' },
    503: { content: errorContent, description: 'Nora model is not configured' },
  },
})
const modelChatTranscribeRoute = createRoute({
  method: 'post',
  path: '/me/model-chat/transcribe',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: mealsTranscribeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealsTranscribeResponseSchema } },
      description: 'Transcript from the office speech model',
    },
    401: { content: errorContent, description: 'Authentication required' },
    502: { content: errorContent, description: 'Upstream speech failure' },
    503: { content: errorContent, description: 'Speech model is not configured' },
  },
})
const composerTurnRoute = createRoute({
  method: 'post',
  path: '/me/meals/composer',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: mealComposerTurnRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealComposerTurnResponseSchema } },
      description: 'In-app meal chat turn',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})
const composerSnapshotRoute = createRoute({
  method: 'get',
  path: '/me/meals/composer',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: mealComposerTurnResponseSchema } },
      description: 'In-app meal chat snapshot',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})
const refineMyMealRoute = createRoute({
  method: 'post',
  path: '/me/meals/{mealId}/refine',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ mealId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: refineMealRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealMutationResponseSchema } },
      description: 'Refined meal with a new version',
    },
    400: { content: errorContent, description: 'Invalid refine request' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Meal not found' },
  },
})
const selectMyMealVersionRoute = createRoute({
  method: 'post',
  path: '/me/meals/{mealId}/select-version',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ mealId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: selectMealVersionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealMutationResponseSchema } },
      description: 'Meal with selected version applied',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Meal or version not found' },
  },
})
const rewriteMyMealRoute = createRoute({
  method: 'post',
  path: '/me/meals/{mealId}/rewrite',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ mealId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: rewriteMealRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealMutationResponseSchema } },
      description: 'Meal plate replaced without a new chat version',
    },
    400: { content: errorContent, description: 'Invalid rewrite request' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Meal not found' },
    409: { content: errorContent, description: 'Meal changed while saving' },
  },
})
const shareMyMealRoute = createRoute({
  method: 'patch',
  path: '/me/meals/{mealId}/share',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ mealId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: shareMealRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealMutationResponseSchema } },
      description: 'Meal sharing updated',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Meal not found' },
  },
})

const setMyMealPlanDoneRoute = createRoute({
  method: 'patch',
  path: '/me/meals/{mealId}/plan-done',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ mealId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: setMealPlanDoneRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealMutationResponseSchema } },
      description: 'Planned meal completion updated',
    },
    400: { content: errorContent, description: 'Meal is not a planned meal' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Meal not found' },
  },
})

const deleteMyMealRoute = createRoute({
  method: 'delete',
  path: '/me/meals/{mealId}',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ mealId: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteMealResponseSchema } },
      description: 'Meal deleted',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Meal not found' },
  },
})
const mealEngineRoute = createRoute({
  method: 'get',
  path: '/me/meal-engine',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: mealEngineResponseSchema } },
      description: 'Diary model chosen by the current user',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})
const updateMealEngineRoute = createRoute({
  method: 'put',
  path: '/me/meal-engine',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: updateMealEngineRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealEngineResponseSchema } },
      description: 'Saved diary model',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Only a user can choose the diary model' },
  },
})
const generationPricingRoute = createRoute({
  method: 'get',
  path: '/me/generation-pricing',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: generationPricingResponseSchema } },
      description: 'Current dollar rate and model token prices',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})
const resetMyGenerationSpendRoute = createRoute({
  method: 'post',
  path: '/me/generation-spend/reset',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: resetGenerationSpendResponseSchema } },
      description: 'Current user generation spend cleared',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})
const listSharedMealsRoute = createRoute({
  method: 'get',
  path: '/shared',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: listMealsResponseSchema } },
      description: 'Public shared meals',
    },
    401: { content: errorContent, description: 'Authentication required' },
  },
})
const likeSharedMealRoute = createRoute({
  method: 'patch',
  path: '/{mealId}/like',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ mealId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: likeMealRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealMutationResponseSchema } },
      description: 'Meal like updated',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Forbidden' },
    404: { content: errorContent, description: 'Meal not found' },
  },
})
const listMentorMealsRoute = createRoute({
  method: 'get',
  path: '/users/{userId}/meals',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      userId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: listMealsResponseSchema } },
      description: 'Mentee meals for assigned mentor',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor assignment required' },
  },
})
const listMentorUnreadMealsRoute = createRoute({
  method: 'get',
  path: '/unread-meals',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: mentorUnreadMealsResponseSchema } },
      description: 'Unread mentee meal counts for the current mentor',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor access required' },
  },
})
const markMentorMealsViewedRoute = createRoute({
  method: 'post',
  path: '/users/{userId}/meals-viewed',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      userId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': { schema: markMentorMealsViewedRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: markMentorMealsViewedResponseSchema } },
      description: 'Visible mentee meals marked as viewed by the mentor',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor assignment required' },
  },
})
const createMentorMealRoute = createRoute({
  method: 'post',
  path: '/users/{userId}/meals',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      userId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: createUserMealRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createUserMealResponseSchema } },
      description: 'Created or existing mentee meal',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor assignment required' },
  },
})
const refineMentorMealRoute = createRoute({
  method: 'post',
  path: '/users/{userId}/meals/{mealId}/refine',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      userId: z.string().uuid(),
      mealId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: refineMealRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealMutationResponseSchema } },
      description: 'Refined mentee meal',
    },
    400: { content: errorContent, description: 'Invalid refine request' },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor assignment required' },
    404: { content: errorContent, description: 'Meal not found' },
  },
})
const selectMentorMealVersionRoute = createRoute({
  method: 'post',
  path: '/users/{userId}/meals/{mealId}/select-version',
  tags: ['Meals'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      userId: z.string().uuid(),
      mealId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: selectMealVersionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: mealMutationResponseSchema } },
      description: 'Mentee meal with selected version applied',
    },
    401: { content: errorContent, description: 'Authentication required' },
    403: { content: errorContent, description: 'Mentor assignment required' },
    404: { content: errorContent, description: 'Meal or version not found' },
  },
})
type CreateMealsRoutesOptions = {
  composer: AppMealComposer
  mealEngine: ReturnType<typeof createMealEngineStore>
  analyzeNora: (input: MealsNoraRequest) => Promise<MealsGeminiResponse>
  chatWithNora: (input: NoraModelChatRequest) => Promise<NoraModelChatResponse>
  transcribeChatVoice: (input: MealsTranscribeRequest) => Promise<MealsTranscribeResponse>
  internalServiceToken: string | undefined
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  requireMentor: MiddlewareHandler<AuthHttpEnv>
  service: MealsService
  transcribeUserVoice: (input: MealsTranscribeRequest) => Promise<MealsTranscribeResponse>
  verifyImageSignature: (
    mealId: string,
    exp: string | undefined,
    sig: string | undefined,
  ) => boolean
  verifyExtraImageSignature: (
    mealId: string,
    index: number,
    exp: string | undefined,
    sig: string | undefined,
  ) => boolean
}

export function createMealsRoutes({
  composer,
  mealEngine,
  analyzeNora,
  chatWithNora,
  transcribeChatVoice,
  internalServiceToken,
  requireAuth,
  requireMentor,
  service,
  transcribeUserVoice,
  verifyImageSignature,
  verifyExtraImageSignature,
}: CreateMealsRoutesOptions) {
  const requireServiceToken = createRequireServiceToken(internalServiceToken)
  const internalRoutes = new OpenAPIHono({ defaultHook: validationErrorHook })
  internalRoutes.use('*', requireServiceToken)
  internalRoutes.openapi(mealsNoraRoute, async (c) => {
    const input = c.req.valid('json')
    const result = await executeMeals(() => analyzeNora(input))
    rememberGenerationUsage(generationRequestKey(input), result.usage)
    return c.json(result, 200)
  })
  internalRoutes.openapi(mealsGeminiRoute, async (c) => {
    const input = c.req.valid('json')
    const result = await executeMeals(() => service.analyzeMeal(input))
    rememberGenerationUsage(generationRequestKey(input), result.usage)
    return c.json(result, 200)
  })
  internalRoutes.openapi(mealsTranscribeRoute, async (c) => {
    const input = c.req.valid('json')
    const result = await executeMeals(() => service.transcribeAudio(input))
    rememberGenerationUsage(generationRequestKey({ audioBase64: input.audioBase64 }), result.usage)
    return c.json(result, 200)
  })
  internalRoutes.openapi(telegramLookupRoute, async (c) => {
    const result = await executeMeals(() =>
      service.lookupTelegramUser(c.req.valid('param').username),
    )
    return c.json(result, 200)
  })
  internalRoutes.openapi(createMealRoute, async (c) => {
    const result = await executeMeals(() => service.createMealFromBot(c.req.valid('json')))
    return c.json(result, 200)
  })
  const userMealsRoutes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  userMealsRoutes.use('*', requireAuth)
  userMealsRoutes.openapi(listMyMealsRoute, async (c) => {
    const result = await executeMeals(() => service.listCurrentUserMeals(c.var.user.id))
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(createMyMealRoute, async (c) => {
    const result = await executeMeals(() =>
      service.createUserMeal(c.var.user, c.req.valid('json')),
    )
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(modelChatRoute, async (c) => {
    const result = await executeMeals(() => chatWithNora(c.req.valid('json')))
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(modelChatTranscribeRoute, async (c) => {
    const result = await executeMeals(() => transcribeChatVoice(c.req.valid('json')))
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(transcribeMyVoiceRoute, async (c) => {
    const result = await executeMeals(async () => {
      const thinking = await mealEngine.thinking(c.var.user.id)
      return transcribeUserVoice({
        ...c.req.valid('json'),
        ...(thinking ? {} : { thinking: false }),
      })
    })
    await service.rememberVoiceUsage(c.var.user.id, result.usage)
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(composerSnapshotRoute, async (c) => {
    return c.json(composer.snapshot(c.var.user.id), 200)
  })
  userMealsRoutes.openapi(composerTurnRoute, async (c) => {
    const result = await executeMeals(() =>
      composer.applyTurn(c.var.user.id, c.req.valid('json')),
    )
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(refineMyMealRoute, async (c) => {
    const result = await executeMeals(() =>
      service.refineMeal(c.var.user, c.req.valid('param').mealId, c.req.valid('json')),
    )
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(rewriteMyMealRoute, async (c) => {
    const result = await executeMeals(() =>
      service.rewriteMealPlate(c.var.user, c.req.valid('param').mealId, c.req.valid('json')),
    )
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(selectMyMealVersionRoute, async (c) => {
    const result = await executeMeals(() =>
      service.selectMealVersion(
        c.var.user,
        c.req.valid('param').mealId,
        c.req.valid('json').versionId,
      ),
    )
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(shareMyMealRoute, async (c) => {
    const result = await executeMeals(() =>
      service.setMealShared(
        c.var.user,
        c.req.valid('param').mealId,
        c.req.valid('json').shared,
      ),
    )
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(setMyMealPlanDoneRoute, async (c) => {
    const body = c.req.valid('json')
    const result = await executeMeals(() =>
      service.setMealPlanDone(
        c.var.user,
        c.req.valid('param').mealId,
        body.done,
        body.recordedAt,
      ),
    )
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(deleteMyMealRoute, async (c) => {
    const result = await executeMeals(() =>
      service.deleteMeal(c.var.user, c.req.valid('param').mealId),
    )
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(mealEngineRoute, async (c) => {
    const settings = await executeMeals(() => mealEngine.getSettings(c.var.user.id))
    return c.json(settings, 200)
  })
  userMealsRoutes.openapi(updateMealEngineRoute, async (c) => {
    const body = c.req.valid('json')
    const saved = await executeMeals(async () => {
      if (c.var.user.role !== 'user') {
        throw new MealsFailure('forbidden', 'Модель дневника выбирает пользователь')
      }
      return mealEngine.set(c.var.user.id, body.engine, body.thinking)
    })
    return c.json(saved, 200)
  })
  userMealsRoutes.openapi(generationPricingRoute, async (c) => {
    const result = await executeMeals(() => service.generationPricing())
    return c.json(result, 200)
  })
  userMealsRoutes.openapi(resetMyGenerationSpendRoute, async (c) => {
    const result = await executeMeals(() => service.resetGenerationSpend(c.var.user.id))
    return c.json(result, 200)
  })
  const mentorMealsRoutes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  mentorMealsRoutes.use('*', requireAuth)
  mentorMealsRoutes.use('*', requireMentor)
  mentorMealsRoutes.openapi(listMentorUnreadMealsRoute, async (c) => {
    const result = await executeMeals(() => service.listMentorUnreadMeals(c.var.user.id))
    return c.json(result, 200)
  })
  mentorMealsRoutes.openapi(markMentorMealsViewedRoute, async (c) => {
    const result = await executeMeals(() =>
      service.markMenteeMealsViewed(
        c.var.user.id,
        c.req.valid('param').userId,
        c.req.valid('json').mealIds,
      ),
    )
    return c.json(result, 200)
  })
  mentorMealsRoutes.openapi(listMentorMealsRoute, async (c) => {
    const result = await executeMeals(() =>
      service.listMentorUserMeals(c.var.user.id, c.req.valid('param').userId),
    )
    return c.json(result, 200)
  })
  mentorMealsRoutes.openapi(createMentorMealRoute, async (c) => {
    const params = c.req.valid('param')
    const result = await executeMeals(() =>
      service.createUserMeal(c.var.user, c.req.valid('json'), params.userId),
    )
    return c.json(result, 200)
  })
  mentorMealsRoutes.openapi(refineMentorMealRoute, async (c) => {
    const params = c.req.valid('param')
    const result = await executeMeals(() =>
      service.refineMeal(c.var.user, params.mealId, c.req.valid('json'), params.userId),
    )
    return c.json(result, 200)
  })
  mentorMealsRoutes.openapi(selectMentorMealVersionRoute, async (c) => {
    const params = c.req.valid('param')
    const result = await executeMeals(() =>
      service.selectMealVersion(
        c.var.user,
        params.mealId,
        c.req.valid('json').versionId,
        params.userId,
      ),
    )
    return c.json(result, 200)
  })
  const mealImageRoutes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  mealImageRoutes.openapi(listSharedMealsRoute, async (c) => {
    await requireAuth(c, async () => undefined)
    const result = await executeMeals(() => service.listSharedMeals(c.var.user.id))
    return c.json(result, 200)
  })
  mealImageRoutes.openapi(likeSharedMealRoute, async (c) => {
    await requireAuth(c, async () => undefined)
    const result = await executeMeals(() =>
      service.setMealLike(c.var.user, c.req.valid('param').mealId, c.req.valid('json').liked),
    )
    return c.json(result, 200)
  })
  mealImageRoutes.get('/:mealId/image', async (c) => {
    const mealId = c.req.param('mealId')
    const signedAccess = verifyImageSignature(mealId, c.req.query('exp'), c.req.query('sig'))
    let actor: { id: string; role: string } | null = null
    if (!signedAccess) {
      await requireAuth(c, async () => undefined)
      actor = c.var.user
    }
    const image = await executeMeals(() =>
      service.readMealImage(actor, mealId, signedAccess, c.req.query('size')),
    )
    return new Response(new Uint8Array(image.bytes), {
      status: 200,
      headers: {
        'Content-Type': image.mime,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${image.filename}"`,
      },
    })
  })
  mealImageRoutes.get('/:mealId/extras/:index', async (c) => {
    const mealId = c.req.param('mealId')
    const index = Number(c.req.param('index'))
    if (!Number.isInteger(index) || index < 0) {
      return c.json({ error: { code: 'not_found', message: 'Meal extra image not found' } }, 404)
    }
    const signedAccess = verifyExtraImageSignature(
      mealId,
      index,
      c.req.query('exp'),
      c.req.query('sig'),
    )
    let actor: { id: string; role: string } | null = null
    if (!signedAccess) {
      await requireAuth(c, async () => undefined)
      actor = c.var.user
    }
    const image = await executeMeals(() =>
      service.readMealExtraImage(actor, mealId, index, signedAccess, c.req.query('size')),
    )
    return new Response(new Uint8Array(image.bytes), {
      status: 200,
      headers: {
        'Content-Type': image.mime,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${image.filename}"`,
      },
    })
  })
  return {
    internalRoutes,
    mealImageRoutes,
    mentorMealsRoutes,
    userMealsRoutes,
  }
}
