import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium leading-none tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-muted-foreground",
        destructive: "border-transparent bg-destructive/12 text-destructive",
        outline: "border-border text-muted-foreground",
        amber: "border-transparent bg-clovior-amber/15 text-clovior-amber",
        mint: "border-transparent bg-clovior-mint/15 text-clovior-mint",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
