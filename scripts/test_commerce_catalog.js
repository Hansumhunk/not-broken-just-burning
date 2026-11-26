const test = require('node:test'); const assert=require('node:assert/strict');
const {catalog,ownedProducts}=require('../js/commerce-catalog.js');
test('five unique proposed products remain locked',()=>{assert.equal(catalog.length,5);assert.equal(new Set(catalog.map(p=>p.slug)).size,5);assert.ok(catalog.every(p=>p.status==='coming_soon' && !p.priceApproved && !p.deliveryReady));assert.ok(catalog.every(p=>!p.downloadUrl && !p.priceId));});
test('subscription does not imply ownership',()=>{assert.deepEqual(ownedProducts({source:'server',updatedAt:1,tier:'paid',products:[]}),[]);});
test('a free member can own an independent product',()=>{assert.equal(ownedProducts({source:'server',updatedAt:1,tier:'free',products:['forge-workbook','unknown']})[0].slug,'forge-workbook');});
test('missing, unverified, guest and error states fail closed',()=>{for(const state of [null,{}, {source:'local',updatedAt:1,tier:'paid',products:['forge-workbook']},{source:'server_error',updatedAt:1,tier:'free',products:['forge-workbook']},{source:'server',updatedAt:1,tier:'guest',products:['forge-workbook']}])assert.deepEqual(ownedProducts(state),[]);});
