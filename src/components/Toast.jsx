import React from 'react';
import { useMlm } from '../context/MlmContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = useMlm();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarn = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`toast-card ${isSuccess ? 'toast-success' : isError ? 'toast-error' : isWarn ? 'toast-warn' : 'toast-info'}`}
          >
            <div className="toast-icon-wrap">
              {isSuccess && <CheckCircle2 size={18} className="text-emerald" />}
              {isError && <AlertCircle size={18} className="text-rose" />}
              {isWarn && <AlertTriangle size={18} className="text-amber" />}
              {!isSuccess && !isError && !isWarn && <Info size={18} className="text-cyan" />}
            </div>
            <div className="toast-body">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button onClick={() => removeToast(toast.id)} className="toast-close-btn">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
