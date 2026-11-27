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
    "wave": "Wave 2",
    "status": "coming_soon",
    "priceApproved": false,
    "deliveryReady": false
  },
  {
    "slug": "30-days-through-the-fire",
    "title": "30 Days Through the Fire",
    "price": "$24.99",
    "format": "Version 1.1 · 81-page reading + 80-page print edition",
    "short": "A daily structure for moving from chaos toward a more deliberate routine.",
    "scope": "Thirty daily practices; weekly themes of stabilization, clarity, agency and rebuilding; progress checkpoints.",
    "wave": "Wave 2",
    "status": "coming_soon",
    "priceApproved": false,
    "deliveryReady": false
  },
  {
    "slug": "masculine-restoration-guide",
    "title": "Masculine Restoration",
    "price": "$24.99",
    "format": "Version 2.0 RC1 · 73-page reading + 73-page print edition",
    "short": "Educational workbook on identity reconstruction.",
    "scope": "Accepted successor PDF pair; independent review and commercial release remain held.",
    "wave": "Wave 2",
    "status": "coming_soon",
    "priceApproved": false,
    "deliveryReady": false
  },
  {
    "slug": "hawk-complete-toolkit",
    "title": "H.A.W.K. Complete Toolkit",
    "price": "$49.99",
    "format": "Version 1.1 · 121-page toolkit + 120-page print edition",
    "short": "An optional printable binder for organizing practical tasks during separation or divorce; the ten free H.A.W.K. guides remain free.",
    "scope": "Thirty three-sheet working packets, ten free-tool navigators, fictional linked-binder example and ten repeat-use registers; two printable non-fillable PDFs. Educational organization, not legal advice.",
    "wave": "Wave 4",
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
