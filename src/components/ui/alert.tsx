"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex gap-3 rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
        success:
          "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
        error:
          "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const Icon = ({ variant }: { variant: AlertVariant }) => {
  const cls = "h-4 w-4 mt-0.5 shrink-0";
  switch (variant) {
    case "success":
      return <CheckCircle2 className={cls} />;
    case "warning":
      return <AlertTriangle className={cls} />;
    case "error":
      return <XCircle className={cls} />;
    default:
      return <Info className={cls} />;
  }
};

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = "info",
  title,
  children,
  ...props
}) => (
  <div
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  >
    <Icon variant={variant ?? "info"} />
    <div className="space-y-1">
      {title && <p className="font-semibold leading-none">{title}</p>}
      {children && <div className="text-sm">{children}</div>}
    </div>
  </div>
);
