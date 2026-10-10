import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateNegotiationDocuments, clientDocumentList, type NegotiationDocuments } from '../src/lib/negotiation-documents';
const data: NegotiationDocuments = { propertyId: null, propertyTitle: '', city: '', financing: false, fgts: false, statuses: {}, costs: [0,0,0,0,0,0] };
test('client list excludes financing and FGTS unless selected and respects not applicable', () => {
 assert.equal(clientDocumentList(data, 'comprador').length, 3);
 assert.equal(clientDocumentList({...data, financing:true, fgts:true}, 'comprador').length, 6);
 assert.equal(clientDocumentList({...data, statuses:{'comprador-0':'nao_aplica'}}, 'comprador').length, 2);
 assert.ok(clientDocumentList(data, 'comprador').every(row => !row.includes('ônus')));
});
test('rejects malformed statuses and invalid costs', () => {
 assert.throws(() => validateNegotiationDocuments({...data, statuses:{'vendedor-100':'recebido'}}));
 assert.throws(() => validateNegotiationDocuments({...data, costs:[NaN,0,0,0,0,0]}));
 assert.throws(() => validateNegotiationDocuments({...data, costs:[-1,0,0,0,0,0]}));
 assert.deepEqual(validateNegotiationDocuments(data),data);
});
test('grava só os campos conhecidos: chaves extras enviadas são descartadas', () => {
 const tampered = { ...data, extra: 'x'.repeat(10_000), statuses: {}, customGroups: { comprador: ['Doc'], vendedor: [], imovel: [], outro: ['x'] } } as unknown as NegotiationDocuments;
 assert.throws(() => validateNegotiationDocuments(tampered), /lista de documentos/);
 const clean = validateNegotiationDocuments({ ...data, extra: 'x'.repeat(10_000) } as unknown as NegotiationDocuments);
 assert.deepEqual(Object.keys(clean).sort(), ['city', 'costs', 'fgts', 'financing', 'propertyId', 'propertyTitle', 'statuses']);
});
