import { accordionDoc } from "./demos/accordion"
import { alertDoc } from "./demos/alert"
import { alertDialogDoc } from "./demos/alert-dialog"
import { aspectRatioDoc } from "./demos/aspect-ratio"
import { attachmentDoc } from "./demos/attachment"
import { avatarDoc } from "./demos/avatar"
import { badgeDoc } from "./demos/badge"
import { breadcrumbDoc } from "./demos/breadcrumb"
import { bubbleDoc } from "./demos/bubble"
import { buttonDoc } from "./demos/button"
import { buttonGroupDoc } from "./demos/button-group"
import { calendarDoc } from "./demos/calendar"
import { cardDoc } from "./demos/card"
import { carouselDoc } from "./demos/carousel"
import { chartDoc } from "./demos/chart"
import { checkboxDoc } from "./demos/checkbox"
import { collapsibleDoc } from "./demos/collapsible"
import { comboboxDoc } from "./demos/combobox"
import { commandDoc } from "./demos/command"
import { contextMenuDoc } from "./demos/context-menu"
import { dataTableDoc } from "./demos/data-table"
import { datePickerDoc } from "./demos/date-picker"
import { dialogDoc } from "./demos/dialog"
import { directionDoc } from "./demos/direction"
import { drawerDoc } from "./demos/drawer"
import { dropdownMenuDoc } from "./demos/dropdown-menu"
import { emptyDoc } from "./demos/empty"
import { fieldDoc } from "./demos/field"
import { NoraIconDoc } from "./demos/nora-icon"
import { NORA_COMPONENT_DOCS } from "./nora-component-docs"
import { hoverCardDoc } from "./demos/hover-card"
import { inputDoc } from "./demos/input"
import { inputGroupDoc } from "./demos/input-group"
import { inputOtpDoc } from "./demos/input-otp"
import { itemDoc } from "./demos/item"
import { kbdDoc } from "./demos/kbd"
import { labelDoc } from "./demos/label"
import { markerDoc } from "./demos/marker"
import { menubarDoc } from "./demos/menubar"
import { messageDoc } from "./demos/message"
import { messageScrollerDoc } from "./demos/message-scroller"
import { nativeSelectDoc } from "./demos/native-select"
import { navigationMenuDoc } from "./demos/navigation-menu"
import { paginationDoc } from "./demos/pagination"
import { popoverDoc } from "./demos/popover"
import { progressDoc } from "./demos/progress"
import { radioGroupDoc } from "./demos/radio-group"
import { resizableDoc } from "./demos/resizable"
import { scrollAreaDoc } from "./demos/scroll-area"
import { selectDoc } from "./demos/select"
import { separatorDoc } from "./demos/separator"
import { sheetDoc } from "./demos/sheet"
import { sidebarDoc } from "./demos/sidebar"
import { skeletonDoc } from "./demos/skeleton"
import { sliderDoc } from "./demos/slider"
import { sonnerDoc } from "./demos/sonner"
import { spinnerDoc } from "./demos/spinner"
import { switchDoc } from "./demos/switch"
import { tableDoc } from "./demos/table"
import { tabsDoc } from "./demos/tabs"
import { textareaDoc } from "./demos/textarea"
import { toastDoc } from "./demos/toast"
import { toggleDoc } from "./demos/toggle"
import { toggleGroupDoc } from "./demos/toggle-group"
import { tooltipDoc } from "./demos/tooltip"
import { typographyDoc } from "./demos/typography"
import type { ComponentDoc, DemoExample } from "./demos/types"

export type { ComponentDoc, DemoExample }

const ALL_DOCS: ComponentDoc[] = [
  ...NORA_COMPONENT_DOCS,
  NoraIconDoc,
  accordionDoc,
  alertDoc,
  alertDialogDoc,
  aspectRatioDoc,
  attachmentDoc,
  avatarDoc,
  badgeDoc,
  breadcrumbDoc,
  bubbleDoc,
  buttonDoc,
  buttonGroupDoc,
  calendarDoc,
  cardDoc,
  carouselDoc,
  chartDoc,
  checkboxDoc,
  collapsibleDoc,
  comboboxDoc,
  commandDoc,
  contextMenuDoc,
  dataTableDoc,
  datePickerDoc,
  dialogDoc,
  directionDoc,
  drawerDoc,
  dropdownMenuDoc,
  emptyDoc,
  fieldDoc,
  hoverCardDoc,
  inputDoc,
  inputGroupDoc,
  inputOtpDoc,
  itemDoc,
  kbdDoc,
  labelDoc,
  markerDoc,
  menubarDoc,
  messageDoc,
  messageScrollerDoc,
  nativeSelectDoc,
  navigationMenuDoc,
  paginationDoc,
  popoverDoc,
  progressDoc,
  radioGroupDoc,
  resizableDoc,
  scrollAreaDoc,
  selectDoc,
  separatorDoc,
  sheetDoc,
  sidebarDoc,
  skeletonDoc,
  sliderDoc,
  sonnerDoc,
  spinnerDoc,
  switchDoc,
  tableDoc,
  tabsDoc,
  textareaDoc,
  toastDoc,
  toggleDoc,
  toggleGroupDoc,
  tooltipDoc,
  typographyDoc,
]

export const COMPONENT_DOCS: Record<string, ComponentDoc> = Object.fromEntries(
  ALL_DOCS.map((doc) => [doc.id, doc])
)

export const FULL_DEMO_IDS = ALL_DOCS.map((doc) => doc.id)

export const STUB_COMPONENT_IDS: string[] = []
