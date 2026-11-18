/* Draft commerce metadata only. Prices are proposals, not authoritative checkout data. No protected file paths. */
(function(root) {
  const catalog = Object.freeze([
  {
    "slug": "boundary-builder-workbook",
    "title": "The Boundary Builder Workbook",
    "price": "$14.99",
    "format": "Printable PDF workbook",
    "short": "Practice setting limits you can actually uphold, with communication examples and follow-through exercises.",
    "scope": "Boundary definitions; internal and external limits; scripts; co-parenting, relationship and workplace scenarios; practice pages.",
    "wave": "Wave 1",
    "status": "coming_soon",
    "priceApproved": false,
    "deliveryReady": false
  },
  {
    "slug": "forge-workbook",
    "title": "The Forge Workbook",
    "price": "$19.99",
    "format": "Printable PDF workbook",
    "short": "A structured way to examine a difficult thought without dismissing emotion or mistaking intensity for evidence.",
    "scope": "Facts and assumptions; supporting and challenging evidence; pattern checks; Six Sacred Questions; revised conclusions and next actions.",
    "wave": "Wave 1",
    "status": "coming_soon",
    "priceApproved": false,
    "deliveryReady": false
  },
  {
    "slug": "30-days-through-the-fire",
    "title": "30 Days Through the Fire",
    "price": "$24.99",
    "format": "Printable guided journal",
    "short": "A daily structure for moving from chaos toward a more deliberate routine.",
    "scope": "Thirty daily practices; weekly themes of stabilization, clarity, agency and rebuilding; progress checkpoints.",
    "wave": "Wave 2",
    "status": "coming_soon",
    "priceApproved": false,
    "deliveryReady": false
  },
  {
    "slug": "masculine-restoration-guide",
    "title": "Masculine Restoration Guide",
    "price": "$29.99",
    "format": "Printable guide and workbook",
    "short": "Rebuild a sense of direction and responsibility without equating strength with control.",
    "scope": "Six anchors: steadiness, direction, strength with restraint, protection with boundaries, responsibility with self-respect, brotherhood and connection; audit and action plan.",
    "wave": "Wave 2",
    "status": "coming_soon",
    "priceApproved": false,
    "deliveryReady": false
  },
  {
    "slug": "hawk-complete-toolkit",
    "title": "H.A.W.K. Complete Toolkit",
    "price": "$49.99",
    "format": "Printable toolkit bundle",
    "short": "Organize information and next steps during divorce, separation or custody stress.",
    "scope": "Proposed printable case-organization templates, timeline, evidence index, communication and parenting logs, document organization and action planning. Existing free H.A.W.K. tools remain free.",
    "wave": "Wave 3",
    "status": "coming_soon",
    "priceApproved": false,
    "deliveryReady": false
  }
].map(Object.freeze));
  function ownedProducts(state) {
    if (state?.source !== 'server' || !state.updatedAt || state.tier === 'guest' || !Array.isArray(state.products)) return [];
    return catalog.filter(item => state.products.includes(item.slug));
  }
  const api = Object.freeze({catalog, ownedProducts});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NBJBCommerceCatalog = api;
})(typeof window !== 'undefined' ? window : globalThis);
