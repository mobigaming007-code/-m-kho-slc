"use client";

import { useCallback, useMemo, useState } from "react";

type ToastState = { message: string; type: "info" | "success" | "warning" | "error"; visible: boolean };

export function useFeedback() {
  const [toastState, setToastState] = useState<ToastState>({ message: "", type: "info", visible: false });
  const [loading, setLoadingState] = useState({ visible: false, message: "Đang xử lý..." });

  const toast = useCallback((message: string, type: ToastState["type"] = "info") => {
    setToastState({ message, type, visible: true });
    window.setTimeout(() => setToastState((current) => ({ ...current, visible: false })), 3500);
  }, []);

  const setLoading = useCallback((visible: boolean, message = "Đang xử lý...") => {
    setLoadingState({ visible, message });
  }, []);

  const feedback = useMemo(
    () => <Feedback toastState={toastState} loading={loading} />,
    [toastState, loading],
  );

  return { toast, setLoading, feedback };
}

function Feedback({
  toastState,
  loading,
}: {
  toastState: ToastState;
  loading: { visible: boolean; message: string };
}) {
  return (
    <>
      <div className={`toast ${toastState.visible ? "show" : ""} ${toastState.type}`}>{toastState.message}</div>
      <div className={`loading-overlay ${loading.visible ? "show" : ""}`}>
        <div className="loading-card">
          <div className="spinner" />
          <div className="loading-text">{loading.message}</div>
        </div>
      </div>
    </>
  );
}
