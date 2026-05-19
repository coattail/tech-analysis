(function attachCompanySelection(globalScope) {
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

  const api = {
    cloneCompanySet,
    setPendingCompanyVisibility,
    setAllPendingCompanyVisibility,
    applyPendingCompanies,
    hasCompanySelectionChanged,
    shouldKeepSelectionPendingUntilGenerate,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.CompanySelectionUtils = api;
})(typeof window !== "undefined" ? window : globalThis);
