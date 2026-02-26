import { memo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";

type MarkdownProps = ComponentProps<typeof Streamdown>;

const NonMemoizedMarkdown = ({ className, children, ...props }: MarkdownProps) => {
  return (
    <Streamdown
      caret="block"
      isAnimating={true}
      className={[
        "size-full",
        "[&>*:first-child]:mt-0",
        "[&>*:last-child]:mb-0",
        "[&_code]:whitespace-pre-wrap",
        "[&_code]:break-words",
        "[&_pre]:max-w-full",
        "[&_pre]:overflow-x-auto",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Streamdown>
  );
};

export const Markdown = memo(NonMemoizedMarkdown);
