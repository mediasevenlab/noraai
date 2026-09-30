import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  XIcon,
} from "@/components/icons"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentProgress,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Spinner } from "@/components/ui/spinner"

import type { ComponentDoc } from "./types"

export const attachmentDoc: ComponentDoc = {
  id: "attachment",
  examples: [
    {
      title: "File attachment",
      description: "Done-состояние: media 40px, padding как у shadcn, цвета Nora.",
      code: `import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { FileTextIcon, XIcon } from "@/components/icons"

export function AttachmentDemo() {
  return (
    <Attachment state="done">
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>report.pdf</AttachmentTitle>
        <AttachmentDescription>245 KB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Remove">
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  )
}`,
      render: () => (
        <Attachment state="done">
          <AttachmentMedia>
            <FileTextIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>report.pdf</AttachmentTitle>
            <AttachmentDescription>245 KB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove">
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ),
    },
    {
      title: "Image",
      description: "Image media variant с превью и action.",
      code: `<Attachment state="done">
  <AttachmentMedia variant="image">
    <img src="..." alt="Preview" />
  </AttachmentMedia>
  ...
</Attachment>`,
      render: () => (
        <Attachment state="done">
          <AttachmentMedia variant="image">
            <img
              src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=120&h=120&fit=crop"
              alt="Preview"
            />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>hero.jpg</AttachmentTitle>
            <AttachmentDescription>1.2 MB · JPEG</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove">
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ),
    },
    {
      title: "States",
      description: "idle · uploading (+ progress) · processing · error · done.",
      code: `<Attachment state="uploading">
  <AttachmentContent>
    <AttachmentTitle>uploading.pdf</AttachmentTitle>
    <AttachmentDescription>Uploading… 42%</AttachmentDescription>
    <AttachmentProgress value={42} />
  </AttachmentContent>
</Attachment>`,
      render: () => (
        <div className="flex w-full max-w-md flex-col gap-3">
          <Attachment state="idle">
            <AttachmentMedia>
              <FileIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>Drop a file</AttachmentTitle>
              <AttachmentDescription>PDF, PNG up to 10MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger aria-label="Choose file" />
          </Attachment>
          <Attachment state="uploading">
            <AttachmentMedia>
              <Spinner />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>uploading.pdf</AttachmentTitle>
              <AttachmentDescription>Uploading… 42%</AttachmentDescription>
              <AttachmentProgress value={42} />
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Cancel upload">
                <XIcon />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="processing">
            <AttachmentMedia>
              <Spinner />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>processing.pdf</AttachmentTitle>
              <AttachmentDescription>Processing…</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Cancel">
                <XIcon />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="error">
            <AttachmentMedia>
              <FileTextIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>failed.pdf</AttachmentTitle>
              <AttachmentDescription>Upload failed</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove">
                <XIcon />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="done">
            <AttachmentMedia>
              <FileTextIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>done.pdf</AttachmentTitle>
              <AttachmentDescription>Ready</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove">
                <XIcon />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </div>
      ),
    },
    {
      title: "Sizes",
      description: "default (40) · sm (32) · xs (28) — исходная шкала shadcn.",
      code: `<Attachment size="default">...</Attachment>
<Attachment size="sm">...</Attachment>
<Attachment size="xs">...</Attachment>`,
      render: () => (
        <div className="flex flex-col items-start gap-3">
          {(["default", "sm", "xs"] as const).map((size) => (
            <Attachment key={size} size={size} state="done">
              <AttachmentMedia>
                <FileTextIcon />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>file-{size}.pdf</AttachmentTitle>
                <AttachmentDescription>Size {size}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label="Remove">
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </div>
      ),
    },
    {
      title: "Vertical",
      description: "Vertical orientation: media-first карточка с action.",
      code: `<Attachment orientation="vertical" state="done">
  <AttachmentMedia variant="image">...</AttachmentMedia>
  <AttachmentContent>...</AttachmentContent>
</Attachment>`,
      render: () => (
        <Attachment orientation="vertical" state="done" className="w-28">
          <AttachmentMedia variant="image">
            <img
              src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=200&h=200&fit=crop"
              alt="Preview"
            />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>photo.jpg</AttachmentTitle>
            <AttachmentDescription>800 KB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove">
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ),
    },
    {
      title: "Group",
      description: "Горизонтальный скролл-ряд с snap и actions.",
      code: `<AttachmentGroup>
  <Attachment>...</Attachment>
  <Attachment>...</Attachment>
</AttachmentGroup>`,
      render: () => (
        <AttachmentGroup className="max-w-md">
          {["brief.pdf", "notes.txt", "cover.png"].map((name) => (
            <Attachment key={name} state="done" size="sm">
              <AttachmentMedia>
                {name.endsWith(".png") ? <ImageIcon /> : <FileTextIcon />}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{name}</AttachmentTitle>
                <AttachmentDescription>Ready</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label={`Remove ${name}`}>
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      ),
    },
  ],
}
