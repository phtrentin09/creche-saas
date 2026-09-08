import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Altura, peso e tracking vêm da direção visual (chips de estado): 22px,
// 10.5px/700, 0.06em, uppercase — vale pra todo chip do produto, não só
// os das telas redesenhadas.
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 text-[10.5px] font-bold tracking-[0.06em] uppercase whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        // Sólido de propósito (não é mais tint) — grave precisa ser
        // inconfundível: mensalidade em atraso, vacina vencida.
        destructive: "bg-destructive text-white [a]:hover:bg-destructive/90",
        warning: "bg-warning-bg text-warning-ink border-warning-border [a]:hover:bg-warning-border/60",
        success: "bg-success-bg text-success-ink border-success-border [a]:hover:bg-success-border/60",
        // Presente (agenda) — teal claro, nunca verde: verde é reservado
        // pra dinheiro pago.
        teal: "bg-brand-50 text-brand-900 [a]:hover:bg-brand-300/40",
        // Saiu (agenda) — sólido escuro neutro.
        dark: "bg-chip-dark text-white [a]:hover:bg-chip-dark/90",
        // Faltou (agenda) — cinza-grafite neutro, nunca vermelho: vermelho
        // é reservado pra alerta de cobrança/vacina.
        neutral: "bg-chip-bg text-ink-2 border-chip-border [a]:hover:bg-chip-border/60",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
