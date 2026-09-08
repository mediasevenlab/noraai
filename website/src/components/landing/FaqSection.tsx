import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { PixelChevron, PixelChevronButton } from './PixelChevron'
import ScrollRevealText from './ScrollRevealText'

const FAQ_ITEMS = [
  {
    id: 'plan',
    question: 'Как работает персональный план?',
    answer:
      'Вы указываете цели и базовые данные — 24nutrition помогает собрать рацион и дневник под ваш сценарий, а наставник может уточнить план.',
  },
  {
    id: 'goals',
    question: 'Можно ли вести несколько целей?',
    answer:
      'Да. В одном месте удобно совмещать дневник питания, недельные планы и работу с наставником без разрозненных таблиц и чатов.',
  },
  {
    id: 'reminders',
    question: 'Есть ли напоминания?',
    answer:
      'Отдельного планировщика напоминаний пока нет. Telegram-бот помогает записать приём в дневник, а наставник может получать уведомления о новых записях подопечного.',
  },
  {
    id: 'security',
    question: 'Безопасны ли мои данные о питании?',
    answer:
      'Да. Доступ защищён аккаунтом, а роли клиента и наставника ограничивают, кто что видит.',
  },
  {
    id: 'mentor',
    question: 'Можно ли работать с наставником?',
    answer:
      'Да. Наставник может передавать планы и следить за прогрессом прямо в приложении — без хаоса в переписке.',
  },
] as const

export default function FaqSection() {
  return (
    <section
      aria-labelledby="faq-title"
      className="border-b py-20 sm:py-24"
      id="faq"
    >
      <div className="site-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
        <div className="max-w-md space-y-4">
          <p className="flex items-center gap-2 text-sm font-medium tracking-tight text-foreground">
            <span>FAQs</span>
            <PixelChevron className="h-3 w-[7px] opacity-55" direction="down" />
          </p>
          <ScrollRevealText
            as="h2"
            className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
            id="faq-title"
            text="Частые вопросы"
            variant="primary"
          />
          <p className="text-base leading-7 text-muted-foreground text-pretty">
            Коротко о том, как 24nutrition помогает вести питание, планы и работу с наставником.
          </p>
        </div>

        <div className="rounded-[28px] bg-[#f7f7f7] px-5 py-1 sm:rounded-[32px] sm:px-6 dark:bg-muted">
          <Accordion className="w-full" collapsible defaultValue="goals" type="single">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem
                className="border-black/5 last:border-b-0 dark:border-border/60"
                key={item.id}
                value={item.id}
              >
                <AccordionTrigger
                  className={cn(
                    'gap-4 py-5 text-[15px] font-medium hover:no-underline sm:text-base',
                    '**:data-[slot=accordion-trigger-icon]:hidden'
                  )}
                >
                  <span className="flex-1 text-left">{item.question}</span>
                  <PixelChevronButton
                    className="pointer-events-none transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180"
                    direction="down"
                  />
                </AccordionTrigger>
                <AccordionContent className="pr-14 text-[15px] leading-6 text-muted-foreground">
                  <p>{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
