import { lazy, Suspense } from "react";

interface NumberFlowProps {
  value: number;
  format?: Intl.NumberFormatOptions;
  className?: string;
  style?: React.CSSProperties;
}

function NumberFlowStatic({ value, format, className, style }: NumberFlowProps) {
  return (
    <span className={className} style={style}>
      {new Intl.NumberFormat(undefined, format).format(value)}
    </span>
  );
}

// Prevent @number-flow/react from being evaluated during SSR where HTMLElement is unavailable
const NumberFlowLazy = lazy(() =>
  typeof HTMLElement !== "undefined"
    ? import("@number-flow/react")
    : (Promise.resolve({
        default: NumberFlowStatic,
      }) as Promise<{ default: typeof NumberFlowStatic }>),
);

export default function NumberFlow(props: NumberFlowProps) {
  return (
    <Suspense fallback={<NumberFlowStatic {...props} />}>
      <NumberFlowLazy {...props} />
    </Suspense>
  );
}
