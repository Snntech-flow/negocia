export type AmortizationInput = {
  balance: number; annualRate: number; months: number; system: "sac" | "price";
  strategy: "term" | "payment"; contribution: number; intervalMonths: number;
};
export type AmortizationRow = {month:number; payment:number; interest:number; principal:number; contribution:number; balance:number};
const cents = (value:number) => Math.round((value + Number.EPSILON) * 100) / 100;
function installment(balance:number, rate:number, months:number) {
  return rate === 0 ? balance / months : balance * rate / (1 - (1 + rate) ** -months);
}
export function simulateAmortization(input:AmortizationInput) {
  if (![input.balance,input.annualRate,input.months,input.contribution,input.intervalMonths].every(Number.isFinite)
      || input.balance <= 0 || input.balance > 1e9 || input.annualRate < 0 || input.annualRate > 100
      || !Number.isInteger(input.months) || input.months < 1 || input.months > 600
      || input.contribution < 0 || input.contribution > 1e9 || !Number.isInteger(input.intervalMonths)
      || input.intervalMonths < 1 || input.intervalMonths > 600
      || !["sac","price"].includes(input.system) || !["term","payment"].includes(input.strategy)) {
    throw new Error("Confira os valores: saldo positivo, juros de 0 a 100% ao ano, prazo e intervalo entre 1 e 600 meses.");
  }
  const rate = (1 + input.annualRate / 100) ** (1 / 12) - 1;
  function schedule(withContributions:boolean) {
    let balance = cents(input.balance);
    let fixedPrincipal = balance / input.months;
    let fixedPayment = installment(balance,rate,input.months);
    const rows:AmortizationRow[] = [];
    for(let month=1;month<=input.months && balance>0;month++) {
      const interest = cents(balance * rate);
      const principal = month === input.months ? balance : Math.min(balance, cents(input.system === "sac" ? fixedPrincipal : fixedPayment - interest));
      const payment = cents(principal + interest);
      balance = cents(balance - principal);
      const contribution = withContributions && month % input.intervalMonths === 0 ? Math.min(balance,cents(input.contribution)) : 0;
      balance = cents(balance - contribution);
      rows.push({month,payment,interest,principal,contribution,balance});
      if(contribution>0 && input.strategy === "payment" && month<input.months) {
        fixedPrincipal = balance / (input.months - month);
        fixedPayment = installment(balance,rate,input.months-month);
      }
    }
    const interest = cents(rows.reduce((sum,row)=>sum+row.interest,0));
    const contributions = cents(rows.reduce((sum,row)=>sum+row.contribution,0));
    return { rows, months:rows.length, interest, contributions, total:cents(rows.reduce((sum,row)=>sum+row.payment+row.contribution,0)), firstPayment:rows[0]?.payment || 0, lastPayment:rows.at(-1)?.payment || 0 };
  }
  const original = schedule(false);
  const scenario = schedule(true);
  return { original, scenario, monthlyRate:rate, monthsSaved:original.months-scenario.months, interestSaved:cents(original.interest-scenario.interest) };
}
