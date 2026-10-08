import assert from "node:assert/strict";
import test from "node:test";
import { simulateAmortization, type AmortizationInput } from "../src/lib/amortization";

const base:AmortizationInput={balance:100000,annualRate:12.6825030132,months:120,system:"price",strategy:"term",contribution:5000,intervalMonths:6};
test("Price converte a taxa efetiva anual e preserva o principal no fluxo inteiro",()=>{
 const result=simulateAmortization(base);
 assert.ok(Math.abs(result.monthlyRate-.01)<1e-10);
 const expected=100000*.01/(1-Math.pow(1.01,-120));
 assert.ok(Math.abs(result.original.firstPayment-expected)<.02);
 for(const schedule of [result.original,result.scenario]) {
   assert.equal(schedule.rows.at(-1)?.balance,0);
   assert.ok(Math.abs(schedule.rows.reduce((total,row)=>total+row.principal+row.contribution,0)-base.balance)<.02);
   assert.ok(Math.abs(schedule.total-base.balance-schedule.interest)<.02);
   assert.ok(schedule.rows.every(row=>row.balance>=0 && row.contribution>=0));
 }
 assert.ok(result.monthsSaved>0);
 assert.ok(result.interestSaved>0);
});
test("SAC sem juros e aporte limitado ao saldo quita sem cobranças negativas",()=>{
 const result=simulateAmortization({...base,balance:1200,annualRate:0,months:12,system:"sac",contribution:5000,intervalMonths:1});
 assert.equal(result.original.firstPayment,100);
 assert.equal(result.scenario.months,1);
 assert.equal(result.scenario.contributions,1100);
 assert.equal(result.scenario.interest,0);
 assert.equal(result.scenario.total,1200);
});
test("reduzir prestação mantém o prazo e recalcula a parcela depois do aporte",()=>{
 for(const system of ["sac","price"] as const) {
  const result=simulateAmortization({...base,system,strategy:"payment",contribution:1000,intervalMonths:12});
  assert.equal(result.scenario.months,base.months);
  assert.ok(result.scenario.rows[12].payment<result.original.rows[12].payment);
  assert.ok(result.interestSaved>0);
 }
});
test("sem aportes, ou com intervalo após o contrato, os fluxos são iguais",()=>{
 for(const input of [{...base,contribution:0},{...base,intervalMonths:240}]) {
  const result=simulateAmortization(input);
  assert.deepEqual(result.scenario,result.original);
 }
});
test("entrada inválida não produz uma simulação",()=>{
 for(const patch of [{balance:0},{annualRate:-1},{months:0},{months:12.5},{months:601},{intervalMonths:0},{contribution:NaN},{balance:Infinity}]) {
  assert.throws(()=>simulateAmortization({...base,...patch}));
 }
});
