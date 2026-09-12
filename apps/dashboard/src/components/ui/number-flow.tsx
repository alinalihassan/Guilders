import { lazy, Suspense, useSyncExternalStore } from "react";

interface NumberFlowProps {
  value: number;
  format?: Intl.NumberFormatOptions;
  className?: string;
  style?: React.CSSProperties;
}

function NumberFlowStatic({ value, format, className, style }: NumberFlowProps) {
  return (
    <span className={className} style={style} suppressHydrationWarning>
      {new Intl.NumberFormat(undefined, format).format(value)}
    </span>
  );
}

const NumberFlowLazy = lazy(() => import("@number-flow/react"));

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function NumberFlow(props: NumberFlowProps) {
  const isClient = useIsClient();
  if (!isClient) {
    return <NumberFlowStatic {...props} />;
  }

  return (
    <Suspense fallback={<NumberFlowStatic {...props} />}>
      <NumberFlowLazy {...props} />
    </Suspense>
  );
}
