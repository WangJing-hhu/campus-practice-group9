import { useState } from "react";
import { AlertTriangle, Loader } from "lucide-react";

interface UserDeleteConfirmProps {
  username: string;
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UserDeleteConfirm({
  username,
  open,
  loading,
  onConfirm,
  onCancel,
}: UserDeleteConfirmProps) {
  const [secondStep, setSecondStep] = useState(false);

  if (!open) return null;

  const handleFirstConfirm = () => {
    setSecondStep(true);
  };

  const handleBack = () => {
    setSecondStep(false);
  };

  const handleFinalConfirm = () => {
    onConfirm();
    setSecondStep(false);
  };

  const handleCancel = () => {
    setSecondStep(false);
    onCancel();
  };

  return (
    <div className="um-overlay" onClick={handleCancel}>
      <div
        className="um-modal um-modal--confirm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="um-confirm-icon">
          <AlertTriangle size={28} />
        </div>

        <h3 className="um-confirm-title">确认删除用户</h3>

        <p className="um-confirm-desc">
          {secondStep
            ? `此操作将逻辑删除用户「${username}」。删除后该用户不再出现在普通用户列表中，且无法恢复。`
            : `即将删除用户「${username}」。此为逻辑删除，删除后该用户将不再出现在普通用户列表中。`}
        </p>

        <p className="um-confirm-warning">
          请确认是否继续？此操作不可撤销。
        </p>

        {secondStep ? (
          <div className="um-confirm-actions">
            <button
              className="um-btn um-btn--ghost"
              onClick={handleBack}
              disabled={loading}
            >
              返回
            </button>
            <button
              className="um-btn um-btn--danger"
              onClick={handleFinalConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={14} className="spin" /> 删除中...
                </>
              ) : (
                "确认删除"
              )}
            </button>
          </div>
        ) : (
          <div className="um-confirm-actions">
            <button
              className="um-btn um-btn--ghost"
              onClick={handleCancel}
              disabled={loading}
            >
              取消
            </button>
            <button
              className="um-btn um-btn--danger-outline"
              onClick={handleFirstConfirm}
            >
              继续删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
