import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { cn } from "./lib/utils";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type MDXProps = ComponentProps<any> & {
  className?: string;
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ className, ...props }: MDXProps) => (
      <h1
        className={cn(
          "text-4xl font-extrabold lg:text-5xl tracking-tight mt-10",
          className,
        )}
        {...props}
      />
    ),
    h2: ({ className, ...props }: MDXProps) => (
      <h2
        className={cn(
          "border-b pb-2 text-3xl font-semibold tracking-tight mt-6 first:mt-0",
          className,
        )}
        {...props}
      />
    ),
    h3: ({ className, ...props }: MDXProps) => (
      <h3
        className={cn(
          "text-2xl font-semibold tracking-tight mt-6 mb-6",
          className,
        )}
        {...props}
      />
    ),
    h4: ({ className, ...props }: MDXProps) => (
      <h4
        className={cn(
          "text-xl font-semibold tracking-tight mt-8 mb-4",
          className,
        )}
        {...props}
      />
    ),
    p: ({ className, ...props }: MDXProps) => (
      <p
        className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
        {...props}
      />
    ),
    ul: ({ className, ...props }: MDXProps) => (
      <ul
        className={cn(
          "mt-6 mb-6 ml-6 list-disc marker:text-zinc-500 [&>li]:mt-2",
          className,
        )}
        {...props}
      />
    ),
    ol: ({ className, ...props }: MDXProps) => (
      <ol
        className={cn(
          "mt-6 mb-6 ml-6 list-decimal marker:text-zinc-500 [&>li]:mt-2",
          className,
        )}
        {...props}
      />
    ),
    li: ({ className, ...props }: MDXProps) => (
      <li className={cn("leading-7", className)} {...props} />
    ),
    blockquote: ({ className, ...props }: MDXProps) => (
      <blockquote
        className={cn(
          "mt-6 border-l-2 border-zinc-300 pl-6 italic text-zinc-800 dark:border-zinc-600 dark:text-zinc-200",
          className,
        )}
        {...props}
      />
    ),
    a: ({ className, ...props }: MDXProps) => (
      <a
        className={cn(
          "font-medium underline underline-offset-4 decoration-zinc-400/50 hover:text-zinc-900 hover:decoration-zinc-700 dark:decoration-zinc-600/50 dark:hover:text-zinc-50 dark:hover:decoration-zinc-400",
          className,
        )}
        {...props}
      />
    ),
    hr: ({ className, ...props }: MDXProps) => (
      <hr
        className={cn("my-8 border-zinc-200 dark:border-zinc-800", className)}
        {...props}
      />
    ),
    table: ({ className, ...props }: MDXProps) => (
      <div className="my-6 w-full overflow-y-auto">
        <table className={cn("w-full", className)} {...props} />
      </div>
    ),
    tr: ({ className, ...props }: MDXProps) => (
      <tr
        className={cn(
          "m-0 border-t border-zinc-300 p-0 even:bg-zinc-100 dark:border-zinc-700 dark:even:bg-zinc-800/50",
          className,
        )}
        {...props}
      />
    ),
    th: ({ className, ...props }: MDXProps) => (
      <th
        className={cn(
          "border border-zinc-200 px-4 py-2 text-left font-bold dark:border-zinc-700 [&[align=center]]:text-center [&[align=right]]:text-right",
          className,
        )}
        {...props}
      />
    ),
    td: ({ className, ...props }: MDXProps) => (
      <td
        className={cn(
          "border border-zinc-200 px-4 py-2 text-left dark:border-zinc-700 [&[align=center]]:text-center [&[align=right]]:text-right",
          className,
        )}
        {...props}
      />
    ),
    code: ({ className, ...props }: MDXProps) => (
      <code
        className={cn(
          "relative rounded bg-zinc-100 px-[0.3rem] py-[0.2rem] font-mono text-sm dark:bg-zinc-800",
          className,
        )}
        {...props}
      />
    ),
  };
}
