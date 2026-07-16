import { useState, useEffect, type FormEvent } from "react";
import { Search, RotateCcw } from "lucide-react";

export interface UserFilters {
  keyword: string;
  role: string;
  status: string;
}

interface UserSearchBarProps {
  filters: UserFilters;
  loading: boolean;
  onSearch: (filters: UserFilters) => void;
  onReset: () => void;
}

const EMPTY_FILTERS: UserFilters = { keyword: "", role: "", status: "" };

export function UserSearchBar({
  filters,
  loading,
  onSearch,
  onReset,
}: UserSearchBarProps) {
  const [local, setLocal] = useState<UserFilters>(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch({ ...local });
  };

  const handleReset = () => {
    setLocal({ ...EMPTY_FILTERS });
    onReset();
  };

  return (
    <form className="um-search-bar" onSubmit={handleSubmit}>
      <div className="um-search-row">
        {/* keyword */}
        <div className="um-search-field um-search-field--keyword">
          <label className="um-sr-only" htmlFor="um-keyword">
            用户名关键字
          </label>
          <span className="um-search-icon">
            <Search size={16} />
          </span>
          <input
            id="um-keyword"
            className="um-search-input"
            type="text"
            placeholder="搜索用户名或邮箱"
            value={local.keyword}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, keyword: e.target.value }))
            }
            disabled={loading}
          />
        </div>

        {/* role */}
        <div className="um-search-field">
          <label className="um-sr-only" htmlFor="um-role">
            角色筛选
          </label>
          <select
            id="um-role"
            className="um-search-select"
            value={local.role}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, role: e.target.value }))
            }
            disabled={loading}
          >
            <option value="">全部角色</option>
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
          </select>
        </div>

        {/* status */}
        <div className="um-search-field">
          <label className="um-sr-only" htmlFor="um-status">
            状态筛选
          </label>
          <select
            id="um-status"
            className="um-search-select"
            value={local.status}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, status: e.target.value }))
            }
            disabled={loading}
          >
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">禁用</option>
          </select>
        </div>

        {/* actions */}
        <div className="um-search-actions">
          <button
            type="submit"
            className="um-btn um-btn--primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="um-btn-spinner" />
                查询中...
              </>
            ) : (
              "查询"
            )}
          </button>
          <button
            type="button"
            className="um-btn um-btn--ghost"
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw size={14} />
            重置
          </button>
        </div>
      </div>
    </form>
  );
}
