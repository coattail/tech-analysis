# 现金流缺口核查与补录（2026-11-02）

核查覆盖项目内全部 46 家公司，从已有实际营收的首个季度（最早 2005Q1）到最新实际营收季度，共 3,123 个公司季度。新增 214 个原本缺失的指标值：经营现金流 40 个、CapEx 80 个、自由现金流 94 个。另将部分已存在的供应商四舍五入值、净处置符号和历史分类改为官方财报数。

目前 35 家公司的上述三项指标在核查区间内完整。尚缺经营现金流 22 个、CapEx 151 个、自由现金流 151 个；其中 129 个 CapEx 缺口来自两家银行未单列可比现金资本开支，其余 22 个公司季度缺少可准确拆分的独立季度现金流。所有未能核实的数值保留空值，没有采用零值占位、年度均分、插值或预测填补。

## 新增缺失指标及原始来源

| 公司 | 经营现金流 | CapEx | 自由现金流 | 主要官方来源（含比较期） |
|---|---:|---:|---:|---|
| Meta | 1 | 1 | 1 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/1326801/000119312512175673/d287954ds1a.htm) |
| 摩根大通 | 14 | 0 | 0 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/19617/000095012306009855/y23738e10vqza.htm) |
| 礼来 | 0 | 14 | 14 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/59478/000095013706005239/c04851e10vq.htm) |
| ASML | 2 | 2 | 2 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/937966/000093796615000005/usgaapfinancialstatementsq.htm) |
| Netflix | 0 | 13 | 13 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/1065280/000119312506230314/d10q.htm) |
| 美国银行 | 14 | 0 | 14 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/70858/000119312506105418/d10q.htm) |
| 卡特彼勒 | 0 | 14 | 14 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/18230/000001823006000237/form10q_1q06.htm) |
| 雪佛龙 | 0 | 12 | 12 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/93410/000095013406008713/f18554e10vq.htm) |
| Palantir | 1 | 1 | 1 | [SEC 财报](https://data.sec.gov/api/xbrl/companyfacts/CIK0001321655.json) |
| SAP | 2 | 2 | 2 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/1000184/000132693209000100/f03080exv99w1.htm) |
| ServiceNow | 3 | 3 | 3 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/1373715/000119312512212288/d301887ds1a.htm) |
| Datadog | 1 | 1 | 1 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/1561550/000095012319005985/filename1.htm) |
| Snowflake | 2 | 2 | 2 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/1640147/000162827920000112/filename1.htm) |
| Adobe | 0 | 15 | 15 | [SEC 财报](https://www.sec.gov/Archives/edgar/data/796343/000110465906024558/a06-8704_110q.htm) |

## 关键对账

- **Meta 2011Q2**：经营现金流 = 2011 上半年 4.74 亿 − Q1 3.45 亿 = **1.29 亿美元**；CapEx = 上半年 2.85 亿 − Q1 1.53 亿 = **1.32 亿美元**；自由现金流 = **−300 万美元**。来源：[上半年比较期现金流表](https://www.sec.gov/Archives/edgar/data/1326801/000119312512325997/d371464d10q.htm)、[IPO Q1 比较期](https://www.sec.gov/Archives/edgar/data/1326801/000119312512175673/d287954ds1a.htm)。截图中的四家公司在此季度现均有真实现金流数据。
- **Datadog 2018**：全年经营现金流 1,082.9 万美元，CapEx 1,583.8 万美元，自由现金流 −500.9 万美元；四个季度逐项相加与全年一致。CapEx 含现金 PP&E 和资本化软件。Q1 来自[已公开的 IPO 申报草稿](https://www.sec.gov/Archives/edgar/data/1561550/000095012319005985/filename1.htm)，H1 来自[IPO 修订申报](https://www.sec.gov/Archives/edgar/data/1561550/000119312519240411/d745413ds1a.htm)。
- **Snowflake 截至 2020-01-31 财年**：经营现金流 −17,655.8 万美元，CapEx 2,284.8 万美元。2019-04-30 季度可从[最早公开 IPO 草稿](https://www.sec.gov/Archives/edgar/data/1640147/000162827920000112/filename1.htm)取得，与[H1 招股书比较期](https://www.sec.gov/Archives/edgar/data/1640147/000162828020013667/snowflake424b4.htm)、[9M 比较期](https://www.sec.gov/Archives/edgar/data/1640147/000164014720000023/snow-20201031.htm)相减后恢复后续两个季度。包含资本化软件，未将半年数直接当季度数。
- **ServiceNow 2011**：Q1 来自 [IPO 独立季度现金流表](https://www.sec.gov/Archives/edgar/data/1373715/000119312512212288/d301887ds1a.htm)；Q2 = H1 − Q1；Q4 = H2 − Q3。Q1+Q2 的经营现金流 2,675.7 万美元、CapEx 667.6 万美元；Q3+Q4 的经营现金流 1,322 万美元、CapEx 795.9 万美元。
- **Netflix**：早期 CapEx 按现金流重分类后的 PP&E 加披露的无形资产支付，使用[2006Q3 财报中的历史重分类表](https://www.sec.gov/Archives/edgar/data/1065280/000119312506230314/d10q.htm)及后续比较期，排除内容库支出。2008Q1 则由 H1 与独立 Q2 的准确差额恢复。
- **ASML**：沿用原系列的 US GAAP 现金流口径，未混用 IFRS 下资本化研发的不同口径。**SAP**：经营现金流包含已披露终止经营现金流。两家公司保留原始欧元数值，以项目采用的季度平均汇率转换为美元。
- **美国银行**：保留现金流表“物业及设备净支出”口径；2006Q1 净处置为负 CapEx，不能改为正支出。**卡特彼勒**：采用公司单列的现金 CapEx，不混入金融子公司的出租设备购买。

每个补录点的来源、报告期末、口径、累计数相减依据保存在 cash-flow-history.json 和 cash-flow-overrides.json 中。自动刷新仍优先应用这些官方补录，避免后续刷新丢失。

## 仍未取得可验证独立季度数的完整清单

| 公司 | 剩余季度 | 涉及指标 | 核查结论 |
|---|---|---|---|
| Meta | 2010Q1、2010Q2、2010Q3、2010Q4 | 三项 | 2010 年仅找到全年现金流；IPO 文件的季度业绩表未披露相应独立季度现金流。 |
| 摩根大通 | 2005Q1–2026Q2（86 季） | CapEx、自由现金流 | 现金流表未单列可比现金 CapEx，无法据此准确计算本项目定义的自由现金流。 |
| 美国银行 | 2015Q4–2026Q2（43 季） | CapEx、自由现金流 | 这些期间未单列可比物业设备现金净支出；不能将供应商的缺失占位 0 当成真实 CapEx。 |
| Palantir | 2019Q1、2019Q2 | 三项 | 2019 H1 累计数已披露，可恢复 Q3；Q1、Q2 缺少可准确拆分的独立现金流。 |
| AbbVie | 2026Q3 | 三项 | 2026-10-30 业绩公告未附该季度现金流；核查时 SEC CompanyFacts 尚无该季 10-Q 现金流。后续季报发布后可正常刷新。 |
| Datadog | 2017Q1、2017Q2、2017Q3、2017Q4 | 三项 | 2017 年公开申报仅有全年现金流；公开草稿已追溯至其最早可用季度。 |
| Snowflake | 2018Q4、2019Q1 | 三项 | 最早财年的相关期间只有全年现金流，没有可用于拆分这两个季度的累计数。 |
| Cloudflare | 2017Q1、2017Q2、2017Q3、2017Q4 | 三项 | 2017 年公开申报仅有全年现金流，无法准确拆分季度。 |
| Zoom | 2018Q1 | 三项 | 截至 2018-01-31 财年只有全年现金流，缺少可用于求出末季的九个月累计数。 |
| Nebius | 2024Q2 | 三项 | 缺少剥离 Yandex 后现存业务该季度的独立现金流；不能拼入旧业务现金流。 |
| ChronoScale | 2024Q3、2024Q4、2025Q1 | 三项 | Cloud 业务 carve-out 比较期不足以准确拆分这些季度；排除同一 CIK 下无关的旧 Ekso 业务。 |

核查依据包括 SEC CompanyFacts、原始 10-Q/10-K、IPO 招股书及已公开 DRS 草稿，并检查了历史比较期。AbbVie 最新公告可见[官方业绩发布](https://news.abbvie.com/2026-10-30-AbbVie-Reports-Third-Quarter-2026-Financial-Results)。无法从已披露累计数准确拆分的期间继续留空。

## 图表与验证

Y 轴按当前可见公司、指标和时间范围计算：折线根据实际最小值、最大值收紧；柱形保留零基线；求和柱形按正、负堆叠总高度计算，边缘保留少量空间。

现金流、坐标轴及资源缓存相关 21 项测试通过。新增回归覆盖 Meta 2011Q2、IPO 比较期拆分、软件资本支出、早期公司全年对账、净处置负号和无插值约束。全套 269 项测试中 256 项通过，13 项为仓库原有的其他基本面、报告日期和价格历史断言问题。
