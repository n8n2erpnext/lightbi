import type {
  CoreAction,
  DerivedMeasure,
  QuestionCandidate,
  SignalFamily,
  UnderstandingCoreInput,
  UnderstandingCoreResult,
  UniversalSignal
} from "./contracts";
import { detectUniversalSignals, inferOverlays } from "./signal-engine";

function first(signals: UniversalSignal[], predicate: (signal: UniversalSignal) => boolean): UniversalSignal | undefined {
  return signals.find(signal => signal.usableForDefaultQuestion && predicate(signal));
}

function firstAny(signals: UniversalSignal[], predicate: (signal: UniversalSignal) => boolean): UniversalSignal | undefined {
  return signals.find(predicate);
}

function all(signals: UniversalSignal[], predicate: (signal: UniversalSignal) => boolean): UniversalSignal[] {
  return signals.filter(signal => signal.usableForDefaultQuestion && predicate(signal));
}

function byId(id: string) {
  return (signal: UniversalSignal) => signal.id === id;
}

function byPrefix(prefix: string) {
  return (signal: UniversalSignal) => signal.id.startsWith(prefix);
}

function executionScope(input: UnderstandingCoreInput): CoreAction["executionScope"] {
  const sourceRows = input.sourceRowCount ?? input.rows.length;
  return sourceRows > input.rows.length ? "sample_preview" : "full_local_file";
}

const VIRTUAL_COUNT_MEASURES = new Set(["record_count", "row_count"]);

function defaultMeasureAggregations(
  actionKind: CoreAction["actionKind"],
  measures: string[],
  explicit?: Record<string, "SUM" | "COUNT" | "AVG">
): Record<string, "SUM" | "COUNT" | "AVG"> | undefined {
  if (explicit) return explicit;
  if ((actionKind !== "trend" && actionKind !== "group_by") || measures.length === 0) return undefined;
  return Object.fromEntries(
    measures.map(measure => [
      measure,
      VIRTUAL_COUNT_MEASURES.has(measure) ? "COUNT" : "SUM"
    ])
  );
}

function makeAction(
  questionId: string,
  label: string,
  actionKind: CoreAction["actionKind"],
  dimensions: string[],
  measures: string[],
  scope: CoreAction["executionScope"],
  derivedMeasures?: DerivedMeasure[],
  measureAggregations?: Record<string, "SUM" | "COUNT" | "AVG">
): CoreAction | undefined {
  const hasMeasure = measures.length > 0 || (derivedMeasures?.length ?? 0) > 0;
  if (actionKind === "trend" && (dimensions.length < 1 || !hasMeasure)) return undefined;
  if (actionKind === "group_by" && (dimensions.length < 1 || !hasMeasure)) return undefined;
  if (actionKind === "distribution" && dimensions.length < 1) return undefined;
  if (actionKind === "table_preview" && dimensions.length < 1) return undefined;
  return {
    id: `action_${questionId}`,
    questionId,
    label,
    actionKind,
    dimensions,
    measures,
    measureAggregations: defaultMeasureAggregations(actionKind, measures, measureAggregations),
    derivedMeasures,
    executionScope: scope
  };
}

function positiveRateMeasure(outcome: UniversalSignal | undefined): DerivedMeasure[] | undefined {
  if (!outcome) return undefined;
  return [{
    id: "response_rate",
    label: "response_rate",
    type: "positive_rate",
    sourceColumn: outcome.physicalColumn,
    positiveValues: ["yes", "y", "true", "1", "success", "approved", "accepted", "converted", "subscribed"],
    numeratorLabel: "positive_count",
    denominatorLabel: "total_count"
  }];
}

function candidate(args: Omit<QuestionCandidate, "fitScore" | "blockedReasons"> & { blockedReasons?: string[] }): QuestionCandidate {
  const blockedReasons = args.blockedReasons ?? [];
  const fitScore = args.action ? 100 : Math.max(10, 70 - blockedReasons.length * 20);
  return { ...args, fitScore, blockedReasons };
}

export function generateUniversalQuestions(input: UnderstandingCoreInput, signals: UniversalSignal[]): QuestionCandidate[] {
  const scope = executionScope(input);
  const questions: QuestionCandidate[] = [];

  const money = first(signals, signal => signal.family === "money" && signal.role === "measure");
  const revenue = first(signals, byId("money.revenue")) ?? first(signals, byId("money.receivable")) ?? money;
  const cost = first(signals, byId("money.cost"));
  const profit = first(signals, byId("money.profit")) ?? first(signals, byId("money.margin"));
  const receivable = first(signals, byId("money.receivable")) ?? first(signals, byId("money.debt"));
  const payable = first(signals, byId("money.payable"));
  const balance = first(signals, byId("money.closing_balance")) ?? first(signals, byId("money.balance")) ?? first(signals, byId("money.opening_balance"));
  const time = first(signals, signal => signal.family === "time" && signal.role === "time");
  const location = first(signals, signal => signal.family === "location");
  const item = first(signals, signal => signal.family === "item" && signal.role !== "identifier");
  const actor = first(signals, signal =>
    signal.id === "entity.employee" ||
    signal.id === "entity.salesperson" ||
    signal.id === "entity.manager" ||
    signal.id === "entity.doctor" ||
    signal.id === "entity.driver"
  );
  const customer = first(signals, byId("entity.customer")) ?? first(signals, byId("entity.patient"));
  const vendor = first(signals, byId("entity.vendor"));
  const documentType =
    first(signals, signal => signal.family === "document" && signal.role === "dimension") ??
    firstAny(signals, signal => signal.family === "document" && signal.role === "identifier");
  const status = first(signals, signal => signal.family === "status");
  const approvalStatus = first(signals, byId("status.approval"));
  const reconciliationStatus = first(signals, byId("status.reconciliation"));
  const quantity = first(signals, signal => signal.family === "quantity");
  const receivedQty = first(signals, byId("quantity.received"));
  const soldQty = first(signals, byId("quantity.sold"));
  const returnedQty = first(signals, byId("quantity.returned"));
  const orderedQty = first(signals, byId("quantity.ordered"));
  const payments = signals.filter(signal => signal.id.startsWith("money.payment_") && signal.health.nonEmptyCount > 0);
  const quality = signals.filter(signal => signal.family === "quality");
  const engagementOutcome = first(signals, byId("engagement.outcome"));
  const engagementSegment = first(signals, byId("engagement.segment"));
  const contactChannel = first(signals, byId("engagement.contact_channel"));
  const campaignAttempts = first(signals, byId("engagement.campaign_attempts"));
  const previousContacts = first(signals, byId("engagement.previous_contacts"));
  const previousOutcome = first(signals, byId("engagement.previous_outcome"));
  const indicator = first(signals, byId("indicator.metric"));
  const countryOrRegion = first(signals, byId("location.country")) ?? first(signals, byId("location.region"));
  const participant =
    first(signals, byId("entity.person")) ??
    first(signals, byId("entity.employee")) ??
    first(signals, byId("entity.customer"));
  const team = first(signals, byId("entity.team")) ?? first(signals, byId("entity.department"));
  const coach = first(signals, byId("entity.coach")) ?? first(signals, byId("entity.manager"));
  const role = first(signals, byId("entity.role"));
  const activity = first(signals, byId("event.activity"));
  const lineup = first(signals, byId("event.lineup"));

  if (quality.some(signal => signal.id === "quality.formula_error" || signal.id === "quality.technical_column")) {
    const columns = quality.map(signal => signal.physicalColumn);
    questions.push(candidate({
      id: "quality_review_before_analysis",
      label: "Review data quality before analysis",
      prompt: "LightBI found technical or dirty fields. Do you want to review them before running aggregates?",
      lens: "Data quality",
      intent: "quality_review",
      requiredFamilies: ["quality"],
      requiredSignals: quality.map(signal => signal.id),
      optionalSignals: [],
      evidence: quality.flatMap(signal => signal.evidence),
      action: makeAction("quality_review_before_analysis", "Review data quality before analysis", "data_quality_review", columns, [], scope)
    }));
  }

  questions.push(candidate({
    id: "participation_by_group",
    label: "Participation by team or group",
    prompt: "Do you want to compare participation or activity volume by team, group, department, or cohort?",
    lens: "Team and group participation",
    intent: "ranking",
    requiredFamilies: ["entity"],
    requiredSignals: ["entity.team|entity.department"],
    optionalSignals: ["entity.person", "entity.coach", "event.activity", "event.lineup"],
    evidence: [team, participant, coach, activity, lineup].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "participation_by_group",
      "Participation by team or group",
      "group_by",
      team ? [team.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: team ? [] : ["A team/group/department field is required."]
  }));

  questions.push(candidate({
    id: "role_or_lineup_mix",
    label: "Role or participation mix",
    prompt: "Do you want to see the mix of roles, positions, line-up types, or activity categories?",
    lens: "Role and event mix",
    intent: "mix",
    requiredFamilies: ["entity", "event"],
    requiredSignals: ["entity.role|event.lineup|event.activity"],
    optionalSignals: ["entity.team", "entity.person"],
    evidence: [role, lineup, activity, team, participant].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "role_or_lineup_mix",
      "Role or participation mix",
      "distribution",
      role ? [role.physicalColumn] : lineup ? [lineup.physicalColumn] : activity ? [activity.physicalColumn] : [],
      [],
      scope
    ),
    blockedReasons: role || lineup || activity ? [] : ["A role/position/line-up/activity field is required."]
  }));

  questions.push(candidate({
    id: "activity_by_participant",
    label: "Activity by person or participant",
    prompt: "Which person, participant, employee, or actor appears most often in the records?",
    lens: "Person activity",
    intent: "ranking",
    requiredFamilies: ["entity"],
    requiredSignals: ["entity.person|entity.employee|entity.customer"],
    optionalSignals: ["entity.team", "entity.role", "event.activity"],
    evidence: [participant, team, role, activity].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "activity_by_participant",
      "Activity by person or participant",
      "group_by",
      participant ? [participant.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: participant ? [] : ["A person/participant/actor field is required."]
  }));

  questions.push(candidate({
    id: "indicator_over_time",
    label: "Indicator over time",
    prompt: "Do you want to see how a numeric indicator changes over time?",
    lens: "Indicator trend",
    intent: "trend",
    requiredFamilies: ["indicator", "time"],
    requiredSignals: ["indicator.metric", "time.*"],
    optionalSignals: ["location.country", "location.region"],
    evidence: [indicator, time, countryOrRegion].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "indicator_over_time",
      "Indicator over time",
      "trend",
      time ? [time.physicalColumn] : [],
      indicator ? [indicator.physicalColumn] : [],
      scope,
      undefined,
      indicator ? { [indicator.physicalColumn]: "AVG" } : undefined
    ),
    blockedReasons: [
      ...(!indicator ? ["A usable numeric indicator is required."] : []),
      ...(!time ? ["A usable time field is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "indicator_by_country_or_region",
    label: "Indicator by country or region",
    prompt: "Do you want to compare an indicator by country, region, or geography?",
    lens: "Indicator comparison",
    intent: "ranking",
    requiredFamilies: ["indicator", "location"],
    requiredSignals: ["indicator.metric", "location.country|location.region"],
    optionalSignals: ["time.*"],
    evidence: [indicator, countryOrRegion, time].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "indicator_by_country_or_region",
      "Indicator by country or region",
      "group_by",
      countryOrRegion ? [countryOrRegion.physicalColumn] : [],
      indicator ? [indicator.physicalColumn] : [],
      scope,
      undefined,
      indicator ? { [indicator.physicalColumn]: "AVG" } : undefined
    ),
    blockedReasons: [
      ...(!indicator ? ["A usable numeric indicator is required."] : []),
      ...(!countryOrRegion ? ["A country or region dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "engagement_outcome_overview",
    label: "Response or conversion overview",
    prompt: "Do you want to see the main outcome split, such as yes/no response, conversion, approval, churn, or subscription result?",
    lens: "Response outcome",
    intent: "mix",
    requiredFamilies: ["engagement"],
    requiredSignals: ["engagement.outcome"],
    optionalSignals: ["engagement.segment", "engagement.contact_channel", "engagement.campaign_attempts"],
    evidence: engagementOutcome ? engagementOutcome.evidence : [],
    action: makeAction(
      "engagement_outcome_overview",
      "Response or conversion overview",
      "distribution",
      engagementOutcome ? [engagementOutcome.physicalColumn] : [],
      [],
      scope
    ),
    blockedReasons: engagementOutcome ? [] : ["An outcome/response/target field is required."]
  }));

  questions.push(candidate({
    id: "engagement_by_segment",
    label: "Response by audience segment",
    prompt: "Which audience segment, demographic group, or customer profile produces different response volumes?",
    lens: "Audience segment performance",
    intent: "ranking",
    requiredFamilies: ["engagement"],
    requiredSignals: ["engagement.outcome", "engagement.segment"],
    optionalSignals: ["entity.customer", "location.*"],
    evidence: [engagementSegment, engagementOutcome].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "engagement_by_segment",
      "Response by audience segment",
      "group_by",
      engagementSegment && engagementOutcome ? [engagementSegment.physicalColumn] : [],
      [],
      scope,
      positiveRateMeasure(engagementOutcome)
    ),
    blockedReasons: [
      ...(!engagementOutcome ? ["An outcome/response/target field is required."] : []),
      ...(!engagementSegment ? ["A segment/demographic/customer-profile field is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "engagement_by_contact_channel",
    label: "Response by contact channel",
    prompt: "Which contact channel or outreach method produces different response volumes?",
    lens: "Contact channel performance",
    intent: "ranking",
    requiredFamilies: ["engagement"],
    requiredSignals: ["engagement.outcome", "engagement.contact_channel"],
    optionalSignals: ["time.*", "engagement.campaign_attempts"],
    evidence: [contactChannel, engagementOutcome].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "engagement_by_contact_channel",
      "Response by contact channel",
      "group_by",
      contactChannel && engagementOutcome ? [contactChannel.physicalColumn] : [],
      [],
      scope,
      positiveRateMeasure(engagementOutcome)
    ),
    blockedReasons: [
      ...(!engagementOutcome ? ["An outcome/response/target field is required."] : []),
      ...(!contactChannel ? ["A contact channel field is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "campaign_effort_review",
    label: "Campaign effort and prior outcome review",
    prompt: "Do you want to inspect campaign attempts, previous contacts, previous outcome, and response side by side?",
    lens: "Campaign effort",
    intent: "lookup",
    requiredFamilies: ["engagement"],
    requiredSignals: ["engagement.campaign_attempts|engagement.previous_contacts|engagement.previous_outcome"],
    optionalSignals: ["engagement.outcome", "engagement.segment", "engagement.contact_channel"],
    evidence: [campaignAttempts, previousContacts, previousOutcome, engagementOutcome].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "campaign_effort_review",
      "Campaign effort and prior outcome review",
      "table_preview",
      [campaignAttempts, previousContacts, previousOutcome, engagementOutcome, engagementSegment, contactChannel]
        .filter(Boolean)
        .map(signal => signal!.physicalColumn),
      [],
      scope
    ),
    blockedReasons: campaignAttempts || previousContacts || previousOutcome ? [] : ["A campaign effort or previous outcome field is required."]
  }));

  questions.push(candidate({
    id: "money_over_time",
    label: "Money over time",
    prompt: "Do you want to see revenue, receivable, or transaction value over time?",
    lens: "Money trend",
    intent: "trend",
    requiredFamilies: ["money", "time"],
    requiredSignals: ["money.*", "time.*"],
    optionalSignals: ["location.*", "item.*", "entity.*"],
    evidence: [money, time].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction("money_over_time", "Money over time", "trend", time ? [time.physicalColumn] : [], money ? [money.physicalColumn] : [], scope),
    blockedReasons: [
      ...(!money ? ["A usable money measure is required."] : []),
      ...(!time ? ["A usable time field is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "profit_or_margin",
    label: "Profit or margin performance",
    prompt: "Do you want to compare profit, margin, revenue, or cost by time, location, item, or person?",
    lens: "Profitability",
    intent: "ranking",
    requiredFamilies: ["money"],
    requiredSignals: ["money.profit|money.margin|money.revenue+money.cost"],
    optionalSignals: ["time.*", "location.*", "item.*", "entity.*"],
    evidence: [profit, revenue, cost, location, item, actor].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "profit_or_margin",
      "Profit or margin performance",
      "group_by",
      location ? [location.physicalColumn] : item ? [item.physicalColumn] : actor ? [actor.physicalColumn] : [],
      profit ? [profit.physicalColumn] : revenue && cost ? [revenue.physicalColumn] : [],
      scope
    ),
    blockedReasons: [
      ...(!profit && !(revenue && cost) ? ["A profit/margin field or revenue+cost pair is required."] : []),
      ...(!location && !item && !actor ? ["A location, item, or actor dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "receivable_payable_balance",
    label: "Receivable, payable, and balance review",
    prompt: "Do you want to review receivable, payable, debt, or balance by customer, supplier, period, or owner?",
    lens: "Working capital",
    intent: "ranking",
    requiredFamilies: ["money"],
    requiredSignals: ["money.receivable|money.payable|money.debt|money.balance"],
    optionalSignals: ["entity.customer", "entity.vendor", "time.period", "entity.employee"],
    evidence: [receivable, payable, balance, customer, vendor, actor, time].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "receivable_payable_balance",
      "Receivable, payable, and balance review",
      "group_by",
      customer ? [customer.physicalColumn] : vendor ? [vendor.physicalColumn] : actor ? [actor.physicalColumn] : time ? [time.physicalColumn] : [],
      receivable ? [receivable.physicalColumn] : payable ? [payable.physicalColumn] : balance ? [balance.physicalColumn] : [],
      scope
    ),
    blockedReasons: [
      ...(!receivable && !payable && !balance ? ["A receivable/payable/debt/balance measure is required."] : []),
      ...(!customer && !vendor && !actor && !time ? ["A customer, supplier, owner, or period dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "money_by_location",
    label: "Money by store, branch, warehouse, or location",
    prompt: "Which store, branch, warehouse, or location contributes the most value?",
    lens: "Location performance",
    intent: "ranking",
    requiredFamilies: ["money", "location"],
    requiredSignals: ["money.*", "location.*"],
    optionalSignals: ["time.*", "item.*"],
    evidence: [money, location].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction("money_by_location", "Money by location", "group_by", location ? [location.physicalColumn] : [], money ? [money.physicalColumn] : [], scope),
    blockedReasons: [
      ...(!money ? ["A usable money measure is required."] : []),
      ...(!location ? ["A location/store/warehouse dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "stock_movement",
    label: "Stock movement and quantity flow",
    prompt: "Do you want to compare ordered, received, sold, returned, or moved quantities by item, location, document, or period?",
    lens: "Stock movement",
    intent: "ranking",
    requiredFamilies: ["quantity"],
    requiredSignals: ["quantity.ordered|quantity.received|quantity.sold|quantity.returned|quantity.units"],
    optionalSignals: ["item.*", "location.*", "document.*", "time.*"],
    evidence: [orderedQty, receivedQty, soldQty, returnedQty, quantity].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "stock_movement",
      "Stock movement and quantity flow",
      "group_by",
      item ? [item.physicalColumn] : location ? [location.physicalColumn] : documentType ? [documentType.physicalColumn] : time ? [time.physicalColumn] : [],
      receivedQty ? [receivedQty.physicalColumn] : soldQty ? [soldQty.physicalColumn] : returnedQty ? [returnedQty.physicalColumn] : orderedQty ? [orderedQty.physicalColumn] : quantity ? [quantity.physicalColumn] : [],
      scope
    ),
    blockedReasons: [
      ...(!orderedQty && !receivedQty && !soldQty && !returnedQty && !quantity ? ["A quantity movement measure is required."] : []),
      ...(!item && !location && !documentType && !time ? ["An item, location, document, or period dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "payment_mix",
    label: "Payment mix",
    prompt: "How is value split across cash, card, bank, voucher, or other payment types?",
    lens: "Payment behavior",
    intent: "mix",
    requiredFamilies: ["money"],
    requiredSignals: ["money.payment_*"],
    optionalSignals: ["time.*", "location.*"],
    evidence: payments.flatMap(signal => signal.evidence),
    action: makeAction("payment_mix", "Payment mix", "table_preview", payments.map(signal => signal.physicalColumn), [], scope),
    blockedReasons: payments.length > 0 ? [] : ["At least one payment amount field is required."]
  }));

  questions.push(candidate({
    id: "approval_or_reconciliation_flow",
    label: "Approval or reconciliation flow",
    prompt: "Which approval, fulfillment, reconciliation, or lifecycle status needs attention?",
    lens: "Control status",
    intent: "mix",
    requiredFamilies: ["status"],
    requiredSignals: ["status.approval|status.reconciliation|status.fulfillment|status.lifecycle"],
    optionalSignals: ["document.*", "entity.*", "time.*", "money.*"],
    evidence: [approvalStatus, reconciliationStatus, status].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "approval_or_reconciliation_flow",
      "Approval or reconciliation flow",
      "distribution",
      approvalStatus ? [approvalStatus.physicalColumn] : reconciliationStatus ? [reconciliationStatus.physicalColumn] : status ? [status.physicalColumn] : [],
      [],
      scope
    ),
    blockedReasons: approvalStatus || reconciliationStatus || status ? [] : ["An approval/reconciliation/fulfillment/status field is required."]
  }));

  questions.push(candidate({
    id: "item_value",
    label: "Value by product, service, medicine, or item",
    prompt: "Which product, service, medicine, or item contributes the most value?",
    lens: "Item performance",
    intent: "ranking",
    requiredFamilies: ["money", "item"],
    requiredSignals: ["money.*", "item.*"],
    optionalSignals: ["time.*", "location.*"],
    evidence: [money, item].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction("item_value", "Value by item", "group_by", item ? [item.physicalColumn] : [], money ? [money.physicalColumn] : [], scope),
    blockedReasons: [
      ...(!money ? ["A usable money measure is required."] : []),
      ...(!item ? ["A product/service/medicine/item dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "actor_value",
    label: "Value by employee, doctor, driver, or user",
    prompt: "Which person or user handled the most value or activity?",
    lens: "Actor performance",
    intent: "ranking",
    requiredFamilies: ["money", "entity"],
    requiredSignals: ["money.*", "entity.employee|doctor|driver"],
    optionalSignals: ["time.*", "location.*"],
    evidence: [money, actor].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction("actor_value", "Value by actor", "group_by", actor ? [actor.physicalColumn] : [], money ? [money.physicalColumn] : [], scope),
    blockedReasons: [
      ...(!money ? ["A usable money measure is required."] : []),
      ...(!actor ? ["An employee/doctor/driver/user dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "customer_or_patient_value",
    label: "Value by customer or patient",
    prompt: "Which customer or patient contributes the most value, if the field is not dominated by one placeholder?",
    lens: "Customer/person contribution",
    intent: "ranking",
    requiredFamilies: ["money", "entity"],
    requiredSignals: ["money.*", "entity.customer|patient"],
    optionalSignals: ["time.*", "location.*"],
    evidence: [money, customer].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction("customer_or_patient_value", "Value by customer or patient", "group_by", customer ? [customer.physicalColumn] : [], money ? [money.physicalColumn] : [], scope),
    blockedReasons: [
      ...(!money ? ["A usable money measure is required."] : []),
      ...(!customer ? ["A usable customer/patient dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "document_coverage",
    label: "Document and transaction structure",
    prompt: "Do you want to inspect document types, related documents, and transaction coverage?",
    lens: "Document structure",
    intent: "lookup",
    requiredFamilies: ["document"],
    requiredSignals: ["document.*"],
    optionalSignals: ["money.*", "time.*", "status.*"],
    evidence: documentType ? documentType.evidence : [],
    action: makeAction("document_coverage", "Document coverage", "table_preview", documentType ? [documentType.physicalColumn] : [], [], scope),
    blockedReasons: documentType ? [] : ["A document type or related-document field is required."]
  }));

  const inventoryAgeBucket = first(signals, byId("inventory.age_bucket")) ?? first(signals, byId("status.stock"));
  const inventoryLocation = first(signals, byId("location.current")) ?? location;
  const inventoryValueLocation = inventoryLocation ?? firstAny(signals, byId("location.current")) ?? firstAny(signals, byId("location.warehouse"));
  const inventoryMoney = first(signals, byId("money.cod")) ?? money;
  questions.push(candidate({
    id: "inventory_aging_backlog",
    label: "Inventory aging and backlog risk",
    prompt: "Which aging bucket, current location, or status contains the most backlog?",
    lens: "Inventory aging",
    intent: "ranking",
    requiredFamilies: ["inventory"],
    requiredSignals: ["inventory.age_bucket|inventory.age|status.stock"],
    optionalSignals: ["location.current", "money.cod", "quantity.weight"],
    evidence: [inventoryAgeBucket, inventoryLocation].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "inventory_aging_backlog",
      "Inventory aging and backlog risk",
      "group_by",
      inventoryAgeBucket ? [inventoryAgeBucket.physicalColumn] : inventoryLocation ? [inventoryLocation.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: inventoryAgeBucket || inventoryLocation ? [] : ["An inventory age bucket/status/current-location field is required."]
  }));

  questions.push(candidate({
    id: "inventory_value_exposure",
    label: "Inventory value exposure",
    prompt: "Which current location, warehouse, service, or item holds the largest COD, receivable, declared value, or fee exposure?",
    lens: "Inventory value exposure",
    intent: "ranking",
    requiredFamilies: ["money", "inventory"],
    requiredSignals: ["money.cod|money.receivable|money.revenue", "location.current|location.warehouse|item.*"],
    optionalSignals: ["inventory.age_bucket", "quantity.weight", "status.stock"],
    evidence: [inventoryMoney, inventoryValueLocation, item].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "inventory_value_exposure",
      "Inventory value exposure",
      "group_by",
      inventoryValueLocation ? [inventoryValueLocation.physicalColumn] : item ? [item.physicalColumn] : [],
      inventoryMoney ? [inventoryMoney.physicalColumn] : [],
      scope
    ),
    blockedReasons: [
      ...(!inventoryMoney ? ["A COD/receivable/revenue measure is required."] : []),
      ...(!inventoryValueLocation && !item ? ["A current location, warehouse, service, or item dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "status_flow",
    label: "Status or lifecycle breakdown",
    prompt: "Which status or lifecycle step needs attention?",
    lens: "Status flow",
    intent: "mix",
    requiredFamilies: ["status"],
    requiredSignals: ["status.*"],
    optionalSignals: ["time.duration", "location.*"],
    evidence: status ? status.evidence : [],
    action: makeAction("status_flow", "Status breakdown", "distribution", status ? [status.physicalColumn] : [], [], scope),
    blockedReasons: status ? [] : ["A usable status field is required."]
  }));

  return questions
    .filter(question => question.action || question.evidence.length > 0)
    .sort((a, b) => {
    const qualityFirst = Number(b.intent === "quality_review") - Number(a.intent === "quality_review");
    if (qualityFirst !== 0) return qualityFirst;
    return b.fitScore - a.fitScore;
  });
}

export function createUnderstandingCoreResult(input: UnderstandingCoreInput): UnderstandingCoreResult {
  const signals = detectUniversalSignals(input);
  const overlays = inferOverlays(signals);
  const questions = generateUniversalQuestions(input, signals);
  const actions = questions.flatMap(question => question.action ? [question.action] : []);
  const blockedReasons = questions
    .filter(question => !question.action)
    .flatMap(question => question.blockedReasons);

  return {
    source: {
      kind: input.sourceKind ?? "unknown",
      label: input.sourceLabel ?? input.fileNames?.[0] ?? input.sheetNames?.[0] ?? "dataset",
      fileNames: input.fileNames ?? [],
      sheetNames: input.sheetNames ?? [],
      sourceRowCount: input.sourceRowCount ?? input.rows.length,
      sampleRowCount: input.rows.length,
      columnCount: input.columns.length
    },
    overlays,
    signals,
    questions,
    actions,
    blockedReasons
  };
}
