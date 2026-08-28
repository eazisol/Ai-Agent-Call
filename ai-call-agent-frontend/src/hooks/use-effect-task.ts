import * as React from "react";

/** Run a task after the current effect phase (avoids sync setState-in-effect lint). */
export function useEffectTask(
  task: () => void | Promise<unknown>,
  deps: React.DependencyList,
) {
  React.useEffect(() => {
    queueMicrotask(() => {
      void task();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps for `task`
  }, deps);
}
