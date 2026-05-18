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

  const api = {
    cloneCompanySet,
    setPendingCompanyVisibility,
    setAllPendingCompanyVisibility,
    applyPendingCompanies,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.CompanySelectionUtils = api;
})(typeof window !== "undefined" ? window : globalThis);
