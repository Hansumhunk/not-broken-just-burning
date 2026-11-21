import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),"utf8");
const original=JSON.parse(read("launch-backend-staging/commerce/inventory-release-candidate-v1.3.json"));
const candidate=JSON.parse(read("launch-backend-staging/commerce/inventory-release-candidate-v1.5-four-product-review.json"));
const bySlug=(doc,slug)=>doc.products.find(p=>p.slug===slug);
const hash={
  "masculine-restoration-guide": {
    version:"1.1",price:2999,sku:"NBJB-MR-004",
    zip:["NBJB-MR-004_v1.1_customer.zip",596685,"831b1ea4f5922f4775287bc21eed5fdade27c9671e51b13119c17921e771da4b"],
    pdfs:[["masculine_customer_v1.1.pdf",900636,"e20e0c31e8a8b1b25309dea18e0bf5c0a321b275bc1359c492bd235b29f44b84"],["masculine_print_v1.1.pdf",801275,"7786066d079e3741256e29f17158766fefec5d494612d99386bef59d0faaa89c"]]
  },
  "hawk-complete-toolkit": {
    version:"1.1",price:4999,sku:"NBJB-HK-005",
    zip:["NBJB-HK-005_v1.1_customer.zip",705480,"e47071901f5b59ac26409e3fe21391c2eea47aa128b2bbd2c0d67c2af8f26ec7"],
    pdfs:[["hawk_customer_v1.1.pdf",1081566,"9296df847764f803b523736b05c5d7b789a624e5d452ccdc004178675590d28a"],["hawk_print_v1.1.pdf",989968,"17aea7c19e0cea7b1ac2cd59bd744d2e87d77332baa352f237c465b55f335bef"]]
  }
};
test("frozen Wave One assets are unchanged, and four-product review remains unapproved",()=>{
 for(const slug of ["boundary-builder-workbook","forge-workbook"]){
  assert.deepEqual(bySlug(candidate,slug),bySlug(original,slug),slug);
 }
 assert.equal(candidate.productionActivation,false);
 assert.equal(candidate.products.length,original.products.length);
 for(const p of candidate.products)assert.equal(p.approved,false,p.slug);
 assert.deepEqual(bySlug(candidate,"30-days-through-the-fire").archive,bySlug(original,"30-days-through-the-fire").archive);
});
test("MR and HAWK candidate asset sizes and sha256 are exact, without embedding any paid files",()=>{
 for(const [slug,x] of Object.entries(hash)){
  const p=bySlug(candidate,slug);
  assert.equal(p.sku,x.sku);assert.equal(p.version,x.version);assert.equal(p.priceCents,x.price);
  assert.deepEqual([p.archive.filename,p.archive.bytes,p.archive.sha256],x.zip);
  assert.deepEqual(p.allowedContents.map(q=>[q.filename,q.bytes,q.sha256]),x.pdfs);
  assert.equal(p.approved,false);assert.equal(p.editorialApproval,false);assert.equal(p.priceApproval,false);
 }
});
test("public storefront prepares verified product listings but cannot activate via browser flag",()=>{
 const page=read("store.html"),client=read("js/commerce-client.js"),switchCode=read("js/commerce-release.js");
 assert.match(page,/96-page PDF guide/);
 assert.match(page,/121-page PDF toolkit/);
 assert.match(page,/ten existing H\\.A\\.W\\.K\\. guides and offline tools remain free/i);
 assert.match(page,/data-commerce-buy="masculine-restoration-guide" disabled/);
 assert.match(page,/data-commerce-buy="hawk-complete-toolkit" disabled/);
 assert.match(switchCode,/enabled:false/);
 assert.match(client,/location\\.origin==='https:\\/\\/notbrokenjustburning\\.com'/);
});
