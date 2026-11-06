import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  pill?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      pill = true,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25",
      secondary:
        "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-500/25",
      destructive:
        "bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/20",
      outline:
        "border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-xs",
      ghost:
        "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80",
    };

    const sizeStyles = {
      sm: "h-8 px-3.5 text-xs",
      md: "h-10 px-5 text-sm",
      lg: "h-12 px-7 text-base",
    };

    const isButtonDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          pill ? "rounded-full" : "rounded-xl",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={isButtonDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0 mr-2" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";