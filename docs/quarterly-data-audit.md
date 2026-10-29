# 季度重复数据核查（2026-10-29）

微软早期营收横平来自历史数据中的年度平均占位：2005 年四季都被填成 10,339,750,000 美元，2006 年四季都被填成 11,514,250,000 美元。它们并非实际季度业绩。另有部分公司的财政季度被重复映射到相邻自然季度，少量营业利润历史反推值也出现了伪重复。

按微软官方 FY2007 10-K 的季度表，2005 年自然季度营收依次应为 96.20、101.61、97.41、118.37 亿美元。微软 2007 年前两个自然季度的净利润占位也一并更正。

## 核查范围与结果

扫描全部 45 家公司的连续季度，检查营收、净利润、营业利润的完全相同非零值，并逐项核对公司财报。共对 17 家公司应用 94 条有来源的季度记录，修正 457 个字段（包括毛利率、ROE、同比和日期等关联字段）；来源清单包含 34 条记录。这是针对重复季度及其关联数据的核查，不是对全部历史财务字段的重新审计。

图表按财政期间结束日映射自然季度；1、4、7、10 月前 7 天结束的期间归前一季度，与现有 SEC 更新器一致。下表时间范围包含为校验、季度对齐所保留的相邻季度，部分字段原本正确而保持不变。

| 公司 | 核对季度范围 | 变更字段数 |
| --- | --- | ---: |
| 微软 | 2005Q1–2007Q2 | 41 |
| 苹果 | 2005Q1–2007Q4 | 89 |
| 亚马逊 | 2005Q1–2007Q4 | 63 |
| Meta | 2010Q1–2010Q4 | 28 |
| Salesforce | 2008Q2–2008Q2 | 9 |
| CrowdStrike | 2018Q1–2018Q1 | 6 |
| Snowflake | 2019Q3–2019Q3 | 6 |
| Zoom | 2018Q1–2018Q1 | 6 |
| 家得宝 | 2008Q2–2008Q2 | 9 |
| 沃尔玛 | 2008Q2–2008Q2 | 9 |
| 美光 | 2005Q3–2005Q3 | 6 |
| 英伟达 | 2004Q2–2008Q3 | 116 |
| 思科 | 2008Q3–2008Q3 | 8 |
| 埃克森美孚 | 2005Q1–2010Q4 | 43 |
| AMD | 2006Q3–2006Q4 | 14 |
| 谷歌 | 2008Q4–2009Q1 | 2 |
| Adobe | 2005Q3–2005Q4 | 2 |

## 保留的真实相等值

以下五处与官方披露一致，未人为制造波动：

| 公司 | 指标 | 连续季度 | 每季金额（美元） |
| --- | --- | --- | ---: |
| 埃克森美孚 | 营收 | 2024Q4 / 2025Q1 | 81,058,000,000 |
| visa | 净利润 | 2018Q4 / 2019Q1 | 2,977,000,000 |
| servicenow | 净利润 | 2022Q4 / 2023Q1 | 150,000,000 |
| AMD | 营业利润 | 2014Q2 / 2014Q3 | 63,000,000 |
| AMD | 营业利润 | 2015Q1 / 2015Q2 | -137,000,000 |

## 持续校验

- 官方修正表纳入自动刷新、历史回填与营业利润回填，优先于年度平均或历史反推值。
- 自动更新发布前运行 `node scripts/audit-quarterly-data.cjs --check`。已修正数据或历史缓存回退、出现未核查重复时会失败，等待来源核查。
- `--write` 可重复执行；当前再次执行不会产生修正。

## 验证

- 新增 6 项数据质量测试全部通过，包括年度合计、季度映射、真实重复保留、上游覆盖恢复与缓存一致性。
- 微软、苹果、亚马逊、英伟达、Meta、埃克森美孚的选定季度合计与官方年度总数吻合。
- 本地浏览器已验证微软 2005–2007 年营收柱状图。
- 全量测试 247 项，234 项通过、13 项失败；失败项与修改前基线相同，无新增失败。

## 官方财报与披露来源

每条修正对应的来源 ID、具体数值和实际季度日期，见仓库 `data/quarterly-data-audit.json`。英伟达 FY2006 来源为公司编制的 10-K/A，由 AnnualReports 镜像托管；其余按下列公司/SEC 页面查阅。

- `msft-fy2007`：[ Microsoft FY2007 Form 10-K, Quarterly Information, p.69 (USD millions; mapped by period end) ](https://microsoft.gcs-web.com/static-files/c183d7a3-a7b8-4145-9b06-3f61efbff1ee)
- `aapl-fy2006`：[ Apple FY2006 Form 10-K, Note 13, restated FY2005 and FY2006 quarterly statements ](https://www.sec.gov/Archives/edgar/data/320193/000110465906084288/a06-25759_210k.htm)
- `aapl-recast2010`：[ Apple January 2010 revised quarterly schedules; retrospective revenue recognition, New Accounting columns ](https://www.sec.gov/Archives/edgar/data/320193/000119312510012096/dex993.htm)
- `amzn-fy2006`：[ Amazon 2006 Form 10-K, Note 15, quarterly results (net income includes change in accounting principle) ](https://www.sec.gov/Archives/edgar/data/1018724/000119312507034081/d10k.htm)
- `amzn-fy2007`：[ Amazon 2007 Form 10-K, Note 15, quarterly results ](https://www.sec.gov/Archives/edgar/data/1018724/000119312508024707/d10k.htm)
- `meta-s1`：[ Facebook May 2012 S-1/A, quarterly results of operations (USD millions) ](https://d18rn0p25nwr6d.cloudfront.net/CIK-0001326801/b60c5b79-00da-4359-a06f-568b42cf2438.html)
- `crm-fy2009`：[ Salesforce FY2009 Form 10-K, Note 12, selected quarterly data (USD thousands) ](https://www.sec.gov/Archives/edgar/data/1108524/000119312509048665/d10k.htm)
- `crwd-s1`：[ CrowdStrike 2019 S-1, quarterly results of operations ](https://www.sec.gov/Archives/edgar/data/1535527/000104746919003095/a2238800zs-1.htm)
- `snow-s1`：[ Snowflake 2020 S-1/A, quarterly results of operations, July 2019 vs October 2019 ](https://www.sec.gov/Archives/edgar/data/1640147/000162828020013381/snowflakes-1a1.htm)
- `zoom-s1`：[ Zoom 2019 S-1, quarterly results of operations, January 2018 vs April 2018 ](https://www.sec.gov/Archives/edgar/data/1585521/000119312519083351/d642624ds1.htm)
- `hd-q12008`：[ Home Depot fiscal Q1 2008 release, consolidated GAAP net earnings ](https://ir.homedepot.com/news-releases/2008/05-20-2008)
- `wmt-q12008`：[ Walmart fiscal Q1 2009 release, total revenues including membership/other income ](https://corporate.walmart.com/news/2008/05/13/wal-mart-reports-record-first-quarter-sales-and-earnings)
- `mu-fy2006`：[ Micron FY2006 Form 10-K, FY2005 quarterly table (USD millions); revenue FY2005 Q4 1258 ](https://www.sec.gov/Archives/edgar/data/723125/000110465906072331/a06-20825_210k.htm)
- `nvda-fy2006-restated`：[ NVIDIA FY2006 Form 10-K/A, Note 17, as-restated quarterly table, p.123; USD thousands ](https://www.annualreports.com/HostedData/AnnualReportArchive/n/NASDAQ_NVDA_2006.pdf)
- `nvda-fy2007`：[ NVIDIA FY2007 Form 10-K, quarterly summary; mapped by actual period end ](https://www.sec.gov/Archives/edgar/data/1045810/000104581007000008/fy2007annualreportonform10-k.htm)
- `nvda-fy2009`：[ NVIDIA FY2009 Form 10-K, Note 18, quarterly summary (USD thousands) ](https://www.sec.gov/Archives/edgar/data/1045810/000104581009000013/fy2009form10k.htm)
- `csco-fy2008q4`：[ Cisco FY2008 Q4 earnings release (USD millions) ](https://newsroom.cisco.com/c/r/newsroom/en/us/a/y2008/m08/cisco-systems-reports-q4-and-fiscal-year-2008-earnings.html)
- `xom-fy2007`：[ ExxonMobil FY2007 Form 10-K, Quarterly Information, p.34 (USD millions; Sales and other operating revenue) ](https://investor.exxonmobil.com/sec-filings/annual-reports/content/0001193125-08-041781/0001193125-08-041781.pdf)
- `xom-quarterly-income2006`：[ ExxonMobil FY2006 results, Attachment VI, quarterly net income (USD millions) ](https://ir.exxonmobil.com/static-files/9154b636-9d29-4d84-b84c-b7c73a48b323)
- `xom-fy2010`：[ ExxonMobil FY2010 Form 10-K, Quarterly Information, 2009 and 2010 (USD millions) ](https://www.sec.gov/Archives/edgar/data/34088/000119312511047394/d10k.htm)
- `xom-fy2008`：[ ExxonMobil FY2008 Form 10-K, Quarterly Information, 2008 Q4 operating sales 80495 and net income 7820 USD millions ](https://www.sec.gov/Archives/edgar/data/34088/000119312509040966/d10k.htm)
- `amd-q42006`：[ AMD 2006 Q4 release, consolidated GAAP, Q4 vs Q3 (USD millions); cost of sales is not revenue ](https://ir.amd.com/news-events/press-releases/detail/259/amd-reports-fourth-quarter-and-annual-results)
- `goog-q42008`：[ Google Q4 2008 release, GAAP income from operations (USD thousands) ](https://www.sec.gov/Archives/edgar/data/1288776/000119312509009929/dex991.htm)
- `goog-q12009`：[ Google Q1 2009 release, GAAP income from operations (USD thousands) ](https://www.sec.gov/Archives/edgar/data/1288776/000119312509080681/dex991.htm)
- `adbe-q42005`：[ Adobe fiscal Q4 2005 release, GAAP operating income; Q4 USD thousands, Q3 comparative reported to one decimal million ](https://www.sec.gov/Archives/edgar/data/796343/000110465905061048/a05-21840_1ex99d1.htm)
- `xom-q42024`：[ ExxonMobil 2024 Q4 release, operating sales 81058 USD millions ](https://investor.exxonmobil.com/sec-filings/all-sec-filings/content/0000034088-25-000006/0000034088-25-000006.pdf)
- `xom-q12025`：[ ExxonMobil 2025 Q1 release, operating sales 81058 USD millions; genuine equality ](https://corporate.exxonmobil.com/news/news-releases/2025/0502_exxonmobil-announces-first-quarter-2025-results)
- `visa-fy2019q2`：[ Visa FY2019 Q2 quarterly results schedule, GAAP net income 2977 in both FY2019 Q1 and Q2 ](https://s1.q4cdn.com/050606653/files/doc_downloads/2019/sec/2QFY19-Form-8-K-with-Exhibits-AS-FILED.pdf)
- `now-q12023`：[ ServiceNow Q1 2023 earnings release, GAAP net income 150 USD millions ](https://newsroom.servicenow.com/press-releases/details/2023/ServiceNow-Reports-First-Quarter-2023-Financial-Results-04-26-2023-traffic/default.aspx)
- `now-q42022`：[ ServiceNow Q4 2022 earnings release; GAAP net income 150 USD millions ](https://newsroom.servicenow.com/press-releases/details/2023/ServiceNow-Reports-Fourth-Quarter-and-Full-Year-2022-Financial-Results-01-25-2023-12-00-AM/default.aspx)
- `amd-q22014`：[ AMD Q2 2014 earnings release, GAAP operating income 63 USD millions ](https://ir.amd.com/sec-filings/content/0001193125-14-271677/0001193125-14-271677.pdf)
- `amd-q32014`：[ AMD Q3 2014 earnings release, GAAP operating income 63 USD millions ](https://d1io3yog0oux5.cloudfront.net/_ee24874d4888cc56b59891df4ac06e6f/amd/news/2014-10-16_AMD_Reports_2014_Third_Quarter_571.pdf)
- `amd-q22015`：[ AMD Q2 2015 release, Q2 and comparative Q1 GAAP operating loss 137 USD millions ](https://ir.amd.com/news-events/press-releases/detail/626/amd-reports-2015-second-quarter-results)
- `xom-fy2005`：[ ExxonMobil FY2005 Form 10-K, quarterly sales, gross profit and net income (USD millions) ](https://www.sec.gov/Archives/edgar/data/34088/000119312506040951/d10k.htm)
