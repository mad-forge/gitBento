import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-black transition disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-white text-slate-950 hover:bg-cyan-100",
        glass:
          "border border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.12]",
        neon:
          "bg-gradient-to-r from-cyan-300 to-fuchsia-300 text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.22)] hover:brightness-110",
        ghost: "text-white/48 hover:bg-white/[0.08] hover:text-white",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-10 px-4",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
