import * as Dialog from "@radix-ui/react-dialog"
import * as Slider from "@radix-ui/react-slider"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react"
import { cn } from "../lib/cn"

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinnabar",
  {
    variants: {
      variant: {
        default: "bg-cinnabar text-white hover:bg-seal",
        outline: "border border-line bg-card text-ink hover:border-cinnabar/40",
        ghost: "text-ink hover:bg-black/5",
        quiet: "bg-paper text-ink hover:bg-line",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"
  return <Comp className={cn(buttonStyles({ variant, size }), className)} {...props} />
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none ring-cinnabar/30 placeholder:text-muted/70 focus:ring-2",
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm leading-6 outline-none ring-cinnabar/30 placeholder:text-muted/70 focus:ring-2",
        className,
      )}
      {...props}
    />
  )
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
  footer?: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/45" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[80] flex max-h-[min(92dvh,880px)] w-[min(100%-1.25rem,34rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-card shadow-2xl",
            wide && "w-[min(100%-1.25rem,40rem)]",
          )}
        >
          <div className="overflow-y-auto p-5">
            <Dialog.Title className="font-serif text-2xl text-ink">{title}</Dialog.Title>
            {description ? <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description> : null}
            <div className="mt-4">{children}</div>
          </div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function RangeSlider({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <Slider.Root
      min={min}
      max={max}
      step={1}
      value={[value]}
      onValueChange={(next) => onChange(next[0] ?? min)}
      className="relative flex h-6 w-full touch-none items-center"
    >
      <Slider.Track className="relative h-1.5 grow rounded-full bg-line">
        <Slider.Range className="absolute h-full rounded-full bg-cinnabar" />
      </Slider.Track>
      <Slider.Thumb className="block size-4 rounded-full border-2 border-white bg-cinnabar shadow" aria-label="条数" />
    </Slider.Root>
  )
}
