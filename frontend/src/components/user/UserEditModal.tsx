import { useEffect, useState, type FormEvent } from "react";
import { X, Loader, User, Mail, Shield } from "lucide-react";
import type { UserRecord, UserUpdatePayload } from "../../api/user";

interface UserEditModalProps {
  user: UserRecord | null;
  open: boolean;
  loading: boolean;
  onSave: (id: number, payload: UserUpdatePayload) => void;
  onClose: () => void;
}

export function UserEditModal({
  user,
  open,
  loading,
  onSave,
  onClose,
}: UserEditModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("user");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (user && open) {
      setEmail(user.email);
      setRole(user.role);
      setEmailError("");
    }
  }, [user, open]);

  if (!open || !user) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // validate
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("邮箱不能为空");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(trimmed)) {
      setEmailError("请输入正确的邮箱格式");
      return;
    }
    setEmailError("");

    onSave(user.id, {
      email: trimmed,
      role,
    });
  };

  const handleOverlayClick = () => {
    if (!loading) onClose();
  };

  return (
    <div className="um-overlay" onClick={handleOverlayClick}>
      <div
        className="um-modal um-modal--form"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="um-modal-header">
          <h3>编辑用户信息</h3>
          <button
            className="um-modal-close"
            onClick={onClose}
            disabled={loading}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit} className="um-modal-body">
          {/* username — read only */}
          <div className="um-field">
            <label className="um-field-label">
              <User size={14} />
              用户名
            </label>
            <input
              className="um-input um-input--readonly"
              type="text"
              value={user.username}
              readOnly
              tabIndex={-1}
            />
            <span className="um-field-hint">用户名不可修改</span>
          </div>

          {/* email */}
          <div className="um-field">
            <label className="um-field-label">
              <Mail size={14} />
              邮箱
            </label>
            <input
              className={`um-input ${emailError ? "um-input--error" : ""}`}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              placeholder="请输入邮箱地址"
              disabled={loading}
            />
            {emailError && <span className="um-field-err">{emailError}</span>}
          </div>

          {/* role */}
          <div className="um-field">
            <label className="um-field-label">
              <Shield size={14} />
              角色
            </label>
            <select
              className="um-input um-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>

          {/* actions */}
          <div className="um-form-actions">
            <button
              type="button"
              className="um-btn um-btn--ghost"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="um-btn um-btn--primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={14} className="spin" /> 保存中...
                </>
              ) : (
                "保存"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
