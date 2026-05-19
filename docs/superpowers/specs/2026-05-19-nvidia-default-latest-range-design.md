# 英伟达默认股价对比与公司切换最新区间设计

## 背景

当前 Tech-Analysis 页面入口默认展示多家公司、营收、折线图。用户希望页面进入时直接呈现一个更明确的分析场景：英伟达季度净利润与股价对比。同时，当用户切换到任意公司后，时间轴右侧应自动对齐到该公司当前指标下的最新可用数值，避免图表停留在上一家公司或上一组公司的旧区间。

## 目标

1. 页面初始状态为“英伟达 + 季度 + 净利润 + 柱状图 + 股价对比”。
2. 初始时间范围覆盖英伟达当前净利润数据的完整可用历史，并在右侧停在最新有效季度。
3. 用户应用任意公司选择后，时间范围根据新的可见公司集合、当前频率、当前指标重新计算，并自动对齐到最新有效数据点。
4. 保留用户手动拖动时间轴的能力；只有应用公司选择、切换指标或切换频率这类上下文变化会自动重算范围。

## 非目标

- 不重构 Chart.js 图表架构。
- 不改变价格对比数据算法。
- 不改变用户手动拖动时间轴后的即时交互行为。
- 不新增新的 UI 控件。

## 设计

### 默认状态

在 `script.js` 中调整页面状态常量：

- 默认可见公司从当前多公司集合改为 `['nvidia']`；
- `state.metric` 从 `revenue` 改为 `netIncome`；
- `state.chartMode` 从 `line` 改为 `bar`；
- `state.priceComparisonEnabled` 改为 `true`；
- `state.frequency` 保持 `quarterly`。

这样页面初始化加载本地数据后，现有 `setRangeToVisibleDataBounds()` 会计算英伟达净利润的完整可用区间，`buildDatasetsForView()` 会在单公司柱状图里叠加股价线。

### 公司切换后的时间轴对齐

在 `generateSelectedCompanies()` 中，应用 `pendingCompanies` 后立即调用现有的范围计算逻辑：

1. `state.visibleCompanies = applyPendingCompanies(state.pendingCompanies)`；
2. `setRangeToVisibleDataBounds(state.frequency, state.metric)`；
3. `syncRangeControls()`；
4. `applyVisibilityStateToChart()`。

这会让右侧滑块随最新可用数据更新，同时左侧从该公司或公司组最早有效数据开始，符合项目 README 中“默认展示完整历史”的产品原则。

### 股价对比兜底

如果用户切换到单家公司但该公司没有日线股价数据，沿用现有 `syncPriceComparisonControl()` 和 `setPriceComparisonEnabled()` 的保护逻辑：股价对比不可用时关闭或隐藏，不阻断财务图表渲染。

## 测试

新增或调整轻量测试覆盖：

1. 默认公司集合为英伟达单公司。
2. 公司选择应用后应返回独立集合，现有测试保持通过。
3. 如可在工具函数层抽出纯函数，则测试“应用公司选择后需要重置范围”的决策；否则通过浏览器/本地页面 smoke test 验证入口图表状态和滑块右侧标签。

## 风险与处理

- **风险：默认开启股价对比但数据未加载。** 现有代码会检测日线数据可用性；不可用时显示原因并关闭 overlay。
- **风险：用户选择多家公司后柱状图/股价对比不适用。** 现有逻辑会把多公司视图回退为折线图并隐藏股价对比控制。
- **风险：切公司会覆盖用户此前手动选定的区间。** 这是本次需求的目标行为，仅在应用新的公司选择时发生；拖动滑块本身不触发重算。
