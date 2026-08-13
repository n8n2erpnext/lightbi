import { evaluateNumericHealth } from "../numeric-health-gate";
import type { LegacyObservationV1 } from "./legacy-canonical-comparison-contracts";

export function captureLegacyObservationForTest(input: Omit<LegacyObservationV1,"observationId">): LegacyObservationV1 {
  return { ...structuredClone(input), observationId:`legacy:${input.moduleId}:${input.outputField}` };
}
export function observeNumericHealthForTest(columnName:string,values:unknown[]):LegacyObservationV1{
  const raw=evaluateNumericHealth(columnName,values);
  return captureLegacyObservationForTest({moduleId:"numeric_health",outputField:"isSafeForSum",available:true,deterministic:true,raw,numericScore:raw.parseSuccessRate,category:null,warnings:raw.warningMessage?[raw.warningMessage]:[],blockers:raw.isSafeForSum?[]:["unsafe_for_sum"],decisions:{isSafeForSum:raw.isSafeForSum},authority:"planning",provenance:["evaluateNumericHealth"]});
}
export function withControlledLegacyClockForTest<T>(epochMs:number,run:()=>T):{value:T;restored:true}{const original=Date.now;Date.now=()=>epochMs;try{return{value:run(),restored:true}}finally{Date.now=original}}
