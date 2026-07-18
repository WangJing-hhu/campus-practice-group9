import { Checkbox, Select, Button, Space } from 'antd'
import { ClearOutlined } from '@ant-design/icons'

// ===== 筛选值 =====
export interface OfficialSourceFilterValue {
  officialOnly: boolean
  sites: string[]
  category: string | undefined
}

// ===== Props =====
export interface OfficialSourceFilterProps {
  /** 受控值 */
  value: OfficialSourceFilterValue
  /** 值变更回调 */
  onChange: (value: OfficialSourceFilterValue) => void
  /** 可用站点列表（父组件传入，不在此组件内请求接口） */
  availableSites?: string[]
  /** 可用分类列表 */
  availableCategories?: string[]
  /** 是否禁用 */
  disabled?: boolean
}

const DEFAULT_VALUE: OfficialSourceFilterValue = {
  officialOnly: false,
  sites: [],
  category: undefined,
}

// ===== 组件 =====
/**
 * 官网资料筛选组件。
 * 受控组件，只做展示和用户交互，不在组件内发请求。
 * 兼容父组件尚未接入的情况（availableSites / availableCategories 为空时不报错）。
 */
export function OfficialSourceFilter({
  value = DEFAULT_VALUE,
  onChange,
  availableSites = [],
  availableCategories = [],
  disabled = false,
}: OfficialSourceFilterProps) {
  const hasSites = availableSites.length > 0
  const hasCategories = availableCategories.length > 0

  const handleClear = () => {
    onChange({ ...DEFAULT_VALUE })
  }

  return (
    <div className="official-source-filter">
      <Space wrap size={[12, 8]}>
        <Checkbox
          checked={value.officialOnly}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, officialOnly: e.target.checked })}
          className="official-source-filter__checkbox"
        >
          只看官方来源
        </Checkbox>

        {hasSites && (
          <Select
            mode="multiple"
            placeholder="来源站点"
            value={value.sites}
            disabled={disabled || !value.officialOnly}
            onChange={(sites) => onChange({ ...value, sites })}
            options={availableSites.map((s) => ({ label: s, value: s }))}
            style={{ minWidth: 140 }}
            maxTagCount={2}
            allowClear
            className="official-source-filter__sites"
          />
        )}

        {hasCategories && (
          <Select
            placeholder="分类"
            value={value.category}
            disabled={disabled || !value.officialOnly}
            onChange={(category) => onChange({ ...value, category })}
            options={availableCategories.map((c) => ({ label: c, value: c }))}
            style={{ minWidth: 120 }}
            allowClear
            className="official-source-filter__category"
          />
        )}

        <Button
          icon={<ClearOutlined />}
          size="small"
          disabled={disabled}
          onClick={handleClear}
          className="official-source-filter__clear"
        >
          清空筛选
        </Button>
      </Space>
    </div>
  )
}
