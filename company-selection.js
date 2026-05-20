(function attachCompanySelection(globalScope) {
  const DEFAULT_INITIAL_COMPANIES = ["nvidia"];
  const DEFAULT_INITIAL_VIEW = {
    metric: "netIncome",
    frequency: "quarterly",
    chartMode: "bar",
    priceComparisonEnabled: true,
  };
  const DISPLAY_PERIOD_STARTS = {
    quarterly: "2005Q1",
    rollingAnnual: "2005Q1",
    annual: "2005",
  };

  function cloneCompanySet(companyIds) {
    return new Set(companyIds ?? []);
  }

  function setPendingCompanyVisibility(currentPendingCompanies, companyId, visible) {
    const nextPendingCompanies = cloneCompanySet(currentPendingCompanies);
    if (visible) {
      nextPendingCompanies.add(companyId);
    } else {
      nextPendingCompanies.delete(companyId);
    }
    return nextPendingCompanies;
  }

  function setAllPendingCompanyVisibility(companies, visible) {
    if (!visible) return new Set();

    return new Set(
      companies.map((company) => (typeof company === "string" ? company : company.id)),
    );
  }

  function applyPendingCompanies(pendingCompanies) {
    return cloneCompanySet(pendingCompanies);
  }

  function hasCompanySelectionChanged(appliedCompanies, pendingCompanies) {
    const applied = cloneCompanySet(appliedCompanies);
    const pending = cloneCompanySet(pendingCompanies);

    if (applied.size !== pending.size) return true;

    for (const companyId of applied) {
      if (!pending.has(companyId)) return true;
    }

    return false;
  }

  function shouldKeepSelectionPendingUntilGenerate({
    priceComparisonEnabled,
    appliedCompanies,
    pendingCompanies,
  }) {
    return Boolean(priceComparisonEnabled)
      && hasCompanySelectionChanged(appliedCompanies, pendingCompanies);
  }

  function shouldResetRangeAfterApplyingCompanies({
    appliedCompanies,
    pendingCompanies,
  }) {
    return hasCompanySelectionChanged(appliedCompanies, pendingCompanies);
  }

  function getDisplayPeriodStart(frequency) {
    return DISPLAY_PERIOD_STARTS[frequency] ?? DISPLAY_PERIOD_STARTS.quarterly;
  }

  const api = {
    DEFAULT_INITIAL_COMPANIES,
    DEFAULT_INITIAL_VIEW,
    cloneCompanySet,
    setPendingCompanyVisibility,
    setAllPendingCompanyVisibility,
    applyPendingCompanies,
    hasCompanySelectionChanged,
    shouldKeepSelectionPendingUntilGenerate,
    shouldResetRangeAfterApplyingCompanies,
    getDisplayPeriodStart,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.CompanySelectionUtils = api;
})(typeof window !== "undefined" ? window : globalThis);
