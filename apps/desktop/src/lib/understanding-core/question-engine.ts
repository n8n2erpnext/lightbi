import type {
  CoreAction,
  DerivedMeasure,
  QuestionCandidate,
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

function looksLikeEntityCodeColumn(column: string): boolean {
  const normalized = column.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
  return /(^|[\s_.-])(id|code|no|number)([\s_.-]|$)|\bma\b|msnv|employee[\s_.-]*id|manager[\s_.-]*id/.test(normalized);
}

function byId(id: string) {
  return (signal: UniversalSignal) => signal.id === id;
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

function contextualQuestionPriority(question: QuestionCandidate, signals: UniversalSignal[]): number {
  const overlays = new Set(inferOverlays(signals));
  const priorities: Record<string, number> = {};

  if (overlays.has("inventory")) {
    priorities.inventory_aging_backlog = 120;
    priorities.inventory_value_exposure = 115;
    priorities.stock_movement = 110;
    priorities.status_flow = 100;
  } else if (overlays.has("logistics")) {
    priorities.shipment_backlog_by_status = 120;
    priorities.shipment_backlog_by_location = 115;
    priorities.shipment_value_exposure = 110;
    priorities.delivery_completion_mix = 105;
    priorities.carrier_cost_impact = 100;
    priorities.status_flow = 95;
  }

  if (overlays.has("campaign")) {
    priorities.engagement_outcome_overview = 120;
    priorities.engagement_by_segment = 115;
    priorities.engagement_by_contact_channel = 110;
    priorities.campaign_effort_review = 105;
  }

  return priorities[question.id] ?? 0;
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
  // Prefer a concrete item/name dimension over the broad item family. A
  // localized category header can legitimately emit both item.product and
  // item.category evidence; selecting the first family match made catalog
  // questions reuse the category column for product, category, and unit.
  const itemIdentifierColumns = new Set(
    // Exclude explicit SKU/code bindings, but do not discard a high-cardinality
    // product-name field merely because profiling classified it as identifier-
    // like. Ranking products by name is a valid descriptive catalog analysis.
    signals.filter(signal => signal.id === "item.sku")
      .map(signal => signal.physicalColumn)
  );
  const item = firstAny(signals, signal =>
    ["item.product", "item.material", "item.service", "item.medicine"].includes(signal.id)
      && signal.role !== "identifier"
      && !itemIdentifierColumns.has(signal.physicalColumn)
  ) ?? firstAny(signals, signal => signal.family === "item" && !itemIdentifierColumns.has(signal.physicalColumn) && signal.id !== "item.category");
  const itemCategory = first(signals, byId("item.category"));
  const itemBrand = first(signals, byId("item.brand"));
  const itemUnit = first(signals, byId("item.unit"));
  const isActorSignal = (signal: UniversalSignal) =>
    signal.id === "entity.employee" ||
    signal.id === "entity.salesperson" ||
    signal.id === "entity.manager" ||
    signal.id === "entity.doctor" ||
    signal.id === "entity.driver";
  // Names are legitimate bounded ranking dimensions even when profiling marks
  // them identifier-like. Prefer the human-readable field, while keeping an
  // employee/manager code as a fallback only when no name exists.
  const actor = firstAny(signals, signal => isActorSignal(signal) && !looksLikeEntityCodeColumn(signal.physicalColumn))
    ?? first(signals, isActorSignal)
    ?? firstAny(signals, isActorSignal);
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
  const hasExplicitQuantityMovement = Boolean(receivedQty || soldQty || returnedQty || orderedQty);
  const hasInventoryContext = inferOverlays(signals).includes("inventory");
  const stockMovementQuantity = hasExplicitQuantityMovement || hasInventoryContext ? quantity : undefined;
  const paymentMethod = first(signals, byId("money.payment_method"));
  const payments = signals.filter(signal =>
    signal.id.startsWith("money.payment_") &&
    signal.id !== "money.payment_method" &&
    signal.health.nonEmptyCount > 0
  );
  const carrier = first(signals, byId("entity.carrier"));
  const driver = first(signals, byId("entity.driver"));
  const vehicle = first(signals, byId("entity.vehicle"));
  const route = first(signals, byId("location.route"));
  const shipment = firstAny(signals, byId("document.shipment"));
  const currentLocation = first(signals, byId("location.current")) ?? first(signals, byId("location.warehouse"));
  const serviceGroup = first(signals, byId("item.service"));
  const deliveryStatus = first(signals, byId("status.delivery")) ?? first(signals, byId("status.fulfillment"));
  const deliveryFee = first(signals, byId("money.fee"));
  const quality = signals.filter(signal => signal.family === "quality");
  const engagementOutcome = first(signals, byId("engagement.outcome"));
  const engagementSegment = first(signals, byId("engagement.segment"));
  const contactChannel = first(signals, byId("engagement.contact_channel"));
  const campaignAttempts = first(signals, byId("engagement.campaign_attempts"));
  const previousContacts = first(signals, byId("engagement.previous_contacts"));
  const previousOutcome = first(signals, byId("engagement.previous_outcome"));
  const indicator = first(signals, byId("indicator.metric"));
  const secondaryIndicator = signals.find(signal => signal.family === "indicator" && signal.role === "measure" && signal.physicalColumn !== indicator?.physicalColumn);
  const economicIndicator = first(signals, byId("indicator.economic"));
  const infrastructureIndicator = first(signals, byId("indicator.infrastructure"));
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
  const indicatorDimension = actor ?? team ?? countryOrRegion ?? location ?? item ?? status;

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
    lens: "Operational workload by team or group",
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
    id: "operational_workload_by_actor",
    label: "Operational workload by owner or manager",
    prompt: "Which owner, manager, employee, driver, or responsible person handles the most records or activities?",
    lens: "Operational workload",
    intent: "ranking",
    requiredFamilies: ["entity"],
    requiredSignals: ["entity.manager|entity.employee|entity.driver|entity.salesperson"],
    optionalSignals: ["time.*", "location.*", "status.*", "indicator.*"],
    evidence: [actor, time, location, status].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "operational_workload_by_actor",
      "Operational workload by owner or manager",
      "group_by",
      actor ? [actor.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: actor ? [] : ["An owner, manager, employee, driver, or responsible-person field is required."]
  }));

  questions.push(candidate({
    id: "operational_volume_by_location",
    label: "Operational volume by location",
    prompt: "Which branch, area, warehouse, route, or operating location handles the most records?",
    lens: "Operational workload",
    intent: "ranking",
    requiredFamilies: ["location"],
    requiredSignals: ["location.*"],
    optionalSignals: ["document.*", "entity.*", "time.*", "status.*"],
    evidence: [location, documentType, actor, time, status].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "operational_volume_by_location",
      "Operational volume by location",
      "group_by",
      location ? [location.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: location ? [] : ["A branch, area, warehouse, route, or location field is required."]
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
    id: "performance_indicator_by_owner_or_team",
    label: "Performance indicators by owner or team",
    prompt: "Which owner, manager, employee, team, or department has the strongest KPI, score, target, or actual result?",
    lens: "Performance by owner or team",
    intent: "ranking",
    requiredFamilies: ["indicator", "entity"],
    requiredSignals: ["indicator.*", "entity.manager|entity.employee|entity.team|entity.department"],
    optionalSignals: ["time.*", "location.*"],
    evidence: [indicator, actor, team, time].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "performance_indicator_by_owner_or_team",
      "Performance indicators by owner or team",
      "group_by",
      actor ? [actor.physicalColumn] : team ? [team.physicalColumn] : [],
      indicator ? [indicator.physicalColumn] : [],
      scope,
      undefined,
      indicator ? { [indicator.physicalColumn]: "AVG" } : undefined
    ),
    blockedReasons: [
      ...(!indicator ? ["A KPI, score, target, actual, or other performance indicator is required."] : []),
      ...(!actor && !team ? ["An owner, manager, employee, team, or department is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "performance_indicator_by_business_dimension",
    label: "Performance indicator by business group",
    prompt: "Which business group, location, item, status, owner, or team has the strongest average indicator?",
    lens: "Performance comparison",
    intent: "ranking",
    requiredFamilies: ["indicator"],
    requiredSignals: ["indicator.*"],
    optionalSignals: ["entity.*", "location.*", "item.*", "status.*"],
    evidence: [indicator, indicatorDimension].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "performance_indicator_by_business_dimension",
      "Performance indicator by business group",
      "group_by",
      indicator && indicatorDimension ? [indicatorDimension.physicalColumn] : [],
      indicator ? [indicator.physicalColumn] : [],
      scope,
      undefined,
      indicator ? { [indicator.physicalColumn]: "AVG" } : undefined
    ),
    blockedReasons: [
      ...(!indicator ? ["A usable KPI, score, target, actual, or numeric indicator is required."] : []),
      ...(!indicatorDimension ? ["A usable business grouping dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "secondary_indicator_by_owner_or_team",
    label: "Compare a second performance indicator",
    prompt: "Does a second KPI or score tell the same story across owners, teams, or business groups?",
    lens: "Performance comparison",
    intent: "ranking",
    requiredFamilies: ["indicator"],
    requiredSignals: ["indicator.*"],
    optionalSignals: ["entity.*", "location.*", "item.*", "status.*"],
    evidence: [secondaryIndicator, indicatorDimension].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "secondary_indicator_by_owner_or_team",
      "Compare a second performance indicator",
      "group_by",
      secondaryIndicator && indicatorDimension ? [indicatorDimension.physicalColumn] : [],
      secondaryIndicator ? [secondaryIndicator.physicalColumn] : [],
      scope,
      undefined,
      secondaryIndicator ? { [secondaryIndicator.physicalColumn]: "AVG" } : undefined
    ),
    blockedReasons: [
      ...(!secondaryIndicator ? ["A second usable numeric indicator is required."] : []),
      ...(!indicatorDimension ? ["A usable owner, team, location, item, or status dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "economic_indicator_by_country_or_period",
    label: "Economic and finance indicators",
    prompt: "How do economic or finance indicators compare across countries, regions, or reporting periods?",
    lens: "Finance indicator performance",
    intent: time ? "trend" : "ranking",
    requiredFamilies: ["indicator"],
    requiredSignals: ["indicator.economic"],
    optionalSignals: ["location.country", "location.region", "time.*"],
    evidence: [economicIndicator, countryOrRegion, time].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "economic_indicator_by_country_or_period",
      "Economic and finance indicators",
      time ? "trend" : "group_by",
      time ? [time.physicalColumn] : countryOrRegion ? [countryOrRegion.physicalColumn] : [],
      economicIndicator ? [economicIndicator.physicalColumn] : [],
      scope,
      undefined,
      economicIndicator ? { [economicIndicator.physicalColumn]: "AVG" } : undefined
    ),
    blockedReasons: [
      ...(!economicIndicator ? ["An economic or finance indicator is required."] : []),
      ...(!time && !countryOrRegion ? ["A reporting period, country, or region is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "infrastructure_indicator_by_country_or_period",
    label: "Infrastructure and service indicators",
    prompt: "How do transport, connectivity, or service indicators compare by country, region, or period?",
    lens: "Operational indicator performance",
    intent: time ? "trend" : "ranking",
    requiredFamilies: ["indicator"],
    requiredSignals: ["indicator.infrastructure"],
    optionalSignals: ["location.country", "location.region", "time.*"],
    evidence: [infrastructureIndicator, countryOrRegion, time].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "infrastructure_indicator_by_country_or_period",
      "Infrastructure and service indicators",
      time ? "trend" : "group_by",
      time ? [time.physicalColumn] : countryOrRegion ? [countryOrRegion.physicalColumn] : [],
      infrastructureIndicator ? [infrastructureIndicator.physicalColumn] : [],
      scope,
      undefined,
      infrastructureIndicator ? { [infrastructureIndicator.physicalColumn]: "AVG" } : undefined
    ),
    blockedReasons: [
      ...(!infrastructureIndicator ? ["A transport, connectivity, or service indicator is required."] : []),
      ...(!time && !countryOrRegion ? ["A reporting period, country, or region is required."] : [])
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
      time ? [time.physicalColumn] : location ? [location.physicalColumn] : item ? [item.physicalColumn] : actor ? [actor.physicalColumn] : [],
      profit ? [profit.physicalColumn] : revenue && cost ? [revenue.physicalColumn] : [],
      scope
    ),
    blockedReasons: [
      ...(!profit && !(revenue && cost) ? ["A profit/margin field or revenue+cost pair is required."] : []),
      ...(!time && !location && !item && !actor ? ["A time, location, item, or actor dimension is required."] : [])
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
    evidence: [orderedQty, receivedQty, soldQty, returnedQty, stockMovementQuantity].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "stock_movement",
      "Stock movement and quantity flow",
      "group_by",
      item ? [item.physicalColumn] : location ? [location.physicalColumn] : documentType ? [documentType.physicalColumn] : time ? [time.physicalColumn] : [],
      receivedQty ? [receivedQty.physicalColumn] : soldQty ? [soldQty.physicalColumn] : returnedQty ? [returnedQty.physicalColumn] : orderedQty ? [orderedQty.physicalColumn] : stockMovementQuantity ? [stockMovementQuantity.physicalColumn] : [],
      scope
    ),
    blockedReasons: [
      ...(!stockMovementQuantity ? ["An ordered, received, sold, returned, or inventory-scoped quantity measure is required."] : []),
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
    requiredSignals: ["money.payment_method|money.payment_*"],
    optionalSignals: ["money.revenue|money.receivable", "time.*", "location.*"],
    evidence: [paymentMethod, ...payments].filter(Boolean).flatMap(signal => signal!.evidence),
    action: paymentMethod && money
      ? makeAction("payment_mix", "Payment mix", "group_by", [paymentMethod.physicalColumn], [money.physicalColumn], scope)
      : makeAction("payment_mix", "Payment mix", "table_preview", payments.map(signal => signal.physicalColumn), [], scope),
    blockedReasons: paymentMethod && !money
      ? ["A revenue or receivable measure is required to calculate payment mix value."]
      : paymentMethod || payments.length > 0
        ? []
        : ["A payment method column or payment amount fields are required."]
  }));

  const paymentProfitMeasures = [
    revenue,
    profit,
    receivable,
    first(signals, byId("money.margin"))
  ].filter((signal, index, list): signal is UniversalSignal =>
    Boolean(signal) && list.findIndex(item => item?.physicalColumn === signal?.physicalColumn) === index
  );
  questions.push(candidate({
    id: "payment_profitability_receivable_mix",
    label: "Payment profitability and receivable mix",
    prompt: "Do payment methods differ by revenue, profit, margin, invoice total, or receivable exposure?",
    lens: "Payment behavior",
    intent: "ranking",
    requiredFamilies: ["money"],
    requiredSignals: ["money.payment_method", "money.revenue|money.profit|money.receivable|money.margin"],
    optionalSignals: ["time.*", "location.*", "item.*"],
    evidence: [paymentMethod, ...paymentProfitMeasures].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "payment_profitability_receivable_mix",
      "Payment profitability and receivable mix",
      "group_by",
      paymentMethod ? [paymentMethod.physicalColumn] : [],
      paymentProfitMeasures.map(signal => signal.physicalColumn),
      scope,
      undefined,
      Object.fromEntries(paymentProfitMeasures.map(signal => [
        signal.physicalColumn,
        signal.id === "money.margin" ? "AVG" : "SUM"
      ]))
    ),
    blockedReasons: [
      ...(!paymentMethod ? ["A payment method column is required."] : []),
      ...(paymentProfitMeasures.length === 0 ? ["A revenue, profit, margin, or receivable measure is required."] : [])
    ]
  }));

  const carrierMeasures = [
    deliveryFee,
    quantity,
    cost
  ].filter((signal, index, list): signal is UniversalSignal =>
    Boolean(signal) && list.findIndex(item => item?.physicalColumn === signal?.physicalColumn) === index
  );

  questions.push(candidate({
    id: "shipment_backlog_by_status",
    label: "Shipment backlog and status",
    prompt: "How many shipments are waiting in each lifecycle status, and which status needs attention first?",
    lens: "Delivery and logistics",
    intent: "ranking",
    requiredFamilies: ["document", "status"],
    requiredSignals: ["document.shipment", "status.*"],
    optionalSignals: ["location.current", "item.service", "time.*", "money.cod"],
    evidence: [shipment, status, currentLocation, serviceGroup].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "shipment_backlog_by_status",
      "Shipment backlog and status",
      "group_by",
      shipment && status ? [status.physicalColumn] : [],
      ["record_count"],
      scope,
      undefined,
      { record_count: "COUNT" }
    ),
    blockedReasons: [
      ...(!shipment ? ["A shipment or tracking identity is required."] : []),
      ...(!status ? ["A lifecycle or delivery status is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "shipment_backlog_by_location",
    label: "Shipment backlog by current location",
    prompt: "Which current branch, hub, warehouse, or office holds the most shipments?",
    lens: "Delivery and logistics",
    intent: "ranking",
    requiredFamilies: ["document", "location"],
    requiredSignals: ["document.shipment", "location.current|location.warehouse"],
    optionalSignals: ["status.*", "item.service", "money.cod", "quantity.weight"],
    evidence: [shipment, currentLocation, status, serviceGroup].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "shipment_backlog_by_location",
      "Shipment backlog by current location",
      "group_by",
      shipment && currentLocation ? [currentLocation.physicalColumn] : [],
      ["record_count"],
      scope,
      undefined,
      { record_count: "COUNT" }
    ),
    blockedReasons: [
      ...(!shipment ? ["A shipment or tracking identity is required."] : []),
      ...(!currentLocation ? ["A current branch, hub, warehouse, or office is required."] : [])
    ]
  }));

  const codExposure = first(signals, byId("money.cod"));
  questions.push(candidate({
    id: "shipment_value_exposure",
    label: "Shipment COD and fee exposure",
    prompt: "Which current location or service holds the largest COD or freight exposure?",
    lens: "Delivery and logistics",
    intent: "ranking",
    requiredFamilies: ["document", "money"],
    requiredSignals: ["document.shipment", "money.cod|money.fee"],
    optionalSignals: ["location.current", "item.service", "status.*"],
    evidence: [shipment, codExposure, deliveryFee, currentLocation, serviceGroup].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "shipment_value_exposure",
      "Shipment COD and fee exposure",
      "group_by",
      currentLocation ? [currentLocation.physicalColumn] : serviceGroup ? [serviceGroup.physicalColumn] : [],
      codExposure ? [codExposure.physicalColumn] : deliveryFee ? [deliveryFee.physicalColumn] : [],
      scope
    ),
    blockedReasons: [
      ...(!shipment ? ["A shipment or tracking identity is required."] : []),
      ...(!codExposure && !deliveryFee ? ["A COD or freight/fee measure is required."] : []),
      ...(!currentLocation && !serviceGroup ? ["A current location or service dimension is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "carrier_cost_impact",
    label: "Carrier cost impact",
    prompt: "How do carriers compare by delivery fee, fulfilled volume, and operational cost exposure?",
    lens: "Delivery and logistics",
    intent: "ranking",
    requiredFamilies: ["entity", "money"],
    requiredSignals: ["entity.carrier", "money.fee|quantity.*|money.cost"],
    optionalSignals: ["status.delivery", "time.*", "location.*", "item.*"],
    evidence: [carrier, deliveryStatus, ...carrierMeasures].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "carrier_cost_impact",
      "Carrier cost impact",
      "group_by",
      carrier ? [carrier.physicalColumn] : [],
      carrierMeasures.map(signal => signal.physicalColumn),
      scope
    ),
    blockedReasons: [
      ...(!carrier ? ["A carrier/logistics provider field is required."] : []),
      ...(carrierMeasures.length === 0 ? ["A delivery fee, quantity, or cost measure is required."] : [])
    ]
  }));

  questions.push(candidate({
    id: "delivery_completion_mix",
    label: "Delivery completion mix",
    prompt: "What share of deliveries are completed, retried, failed, or still in progress?",
    lens: "Delivery and logistics",
    intent: "ranking",
    requiredFamilies: ["status"],
    requiredSignals: ["status.delivery|status.fulfillment"],
    optionalSignals: ["entity.carrier", "money.fee", "quantity.*"],
    evidence: [deliveryStatus, carrier, deliveryFee, quantity].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "delivery_completion_mix",
      "Delivery completion mix",
      "group_by",
      deliveryStatus ? [deliveryStatus.physicalColumn] : [],
      ["record_count"],
      scope,
      deliveryStatus ? [{
        id: "delivery_completion_rate",
        label: "delivery_completion_rate",
        type: "positive_rate",
        sourceColumn: deliveryStatus.physicalColumn,
        positiveValues: ["Đã giao", "Da giao", "Hoàn tất", "Hoan tat", "Delivered", "Completed", "Complete", "Fulfilled", "Đúng hẹn", "Dung hen", "On time", "Ontime", "Timely"],
        numeratorLabel: "completed_deliveries",
        denominatorLabel: "total_deliveries"
      }] : undefined,
      { record_count: "COUNT" }
    ),
    blockedReasons: deliveryStatus ? [] : ["A delivery or fulfillment status field is required."]
  }));

  const deliveryPerformanceDimension = route ?? driver ?? vehicle ?? carrier ?? currentLocation;
  questions.push(candidate({
    id: "delivery_volume_by_route_or_resource",
    label: "Delivery workload by route or resource",
    prompt: "Which route, driver, vehicle, carrier, or hub handles the most delivery records?",
    lens: "Delivery and logistics",
    intent: "ranking",
    requiredFamilies: ["location", "entity"],
    requiredSignals: ["location.route|entity.driver|entity.vehicle|entity.carrier|location.current"],
    optionalSignals: ["status.delivery", "status.fulfillment", "time.*"],
    evidence: [deliveryPerformanceDimension, deliveryStatus, time].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "delivery_volume_by_route_or_resource",
      "Delivery workload by route or resource",
      "group_by",
      deliveryPerformanceDimension ? [deliveryPerformanceDimension.physicalColumn] : [],
      ["record_count"],
      scope,
      undefined,
      { record_count: "COUNT" }
    ),
    blockedReasons: deliveryPerformanceDimension ? [] : ["A route, driver, vehicle, carrier, or current location is required."]
  }));

  questions.push(candidate({
    id: "delivery_on_time_by_route_or_resource",
    label: "On-time delivery by route or resource",
    prompt: "Which route, driver, vehicle, carrier, or hub has the strongest on-time or completion rate, and which needs attention?",
    lens: "Service performance",
    intent: "ranking",
    requiredFamilies: ["status"],
    requiredSignals: ["status.delivery|status.fulfillment"],
    optionalSignals: ["location.route", "entity.driver", "entity.vehicle", "entity.carrier", "location.current"],
    evidence: [deliveryStatus, deliveryPerformanceDimension].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "delivery_on_time_by_route_or_resource",
      "On-time delivery by route or resource",
      "group_by",
      deliveryStatus && deliveryPerformanceDimension ? [deliveryPerformanceDimension.physicalColumn] : [],
      [],
      scope,
      deliveryStatus ? [{
        id: "delivery_on_time_rate",
        label: "delivery_on_time_rate",
        type: "positive_rate",
        sourceColumn: deliveryStatus.physicalColumn,
        positiveValues: ["Đã giao", "Da giao", "Hoàn tất", "Hoan tat", "Delivered", "Completed", "Complete", "Fulfilled", "Đúng hẹn", "Dung hen", "On time", "Ontime", "Timely"],
        numeratorLabel: "on_time_or_completed",
        denominatorLabel: "total_deliveries"
      }] : undefined
    ),
    blockedReasons: [
      ...(!deliveryStatus ? ["A delivery, fulfillment, or on-time status is required."] : []),
      ...(!deliveryPerformanceDimension ? ["A route, driver, vehicle, carrier, or current location is required."] : [])
    ]
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
    id: "catalog_composition_by_category",
    label: "Catalog composition by category",
    prompt: "How is the product, material, service, or SKU catalog distributed across categories or item groups?",
    lens: "Inventory catalog structure",
    intent: "mix",
    requiredFamilies: ["item"],
    requiredSignals: ["item.category|item.product|item.service|item.medicine"],
    optionalSignals: ["item.sku", "entity.vendor", "location.*"],
    evidence: [itemCategory, item].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "catalog_composition_by_category",
      "Catalog composition by category",
      "group_by",
      itemCategory ? [itemCategory.physicalColumn] : item ? [item.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: itemCategory || item ? [] : ["A category, item group, product, service, or medicine field is required."]
  }));

  questions.push(candidate({
    id: "catalog_composition_by_brand_or_supplier",
    label: "Catalog composition by brand or supplier",
    prompt: "Which brand, supplier, or manufacturer contributes the most catalog records?",
    lens: "Inventory catalog structure",
    intent: "ranking",
    requiredFamilies: ["item", "entity"],
    requiredSignals: ["item.brand|entity.vendor"],
    optionalSignals: ["item.category", "item.product", "item.sku"],
    evidence: [itemBrand, vendor].filter(Boolean).flatMap(signal => signal!.evidence),
    action: makeAction(
      "catalog_composition_by_brand_or_supplier",
      "Catalog composition by brand or supplier",
      "group_by",
      itemBrand ? [itemBrand.physicalColumn] : vendor ? [vendor.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: itemBrand || vendor ? [] : ["A brand, supplier, or manufacturer field is required."]
  }));

  questions.push(candidate({
    id: "catalog_records_by_item",
    label: "Catalog records by product or item",
    prompt: "Which products, materials, services, or medicines occur most often in the catalog or source records?",
    lens: "Inventory catalog structure",
    intent: "ranking",
    requiredFamilies: ["item"],
    requiredSignals: ["item.product|item.service|item.medicine"],
    optionalSignals: ["item.category", "item.brand", "item.sku", "entity.vendor"],
    evidence: item ? item.evidence : [],
    action: makeAction(
      "catalog_records_by_item",
      "Catalog records by product or item",
      "group_by",
      item ? [item.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: item ? [] : ["A product, material, service, or medicine field is required."]
  }));

  questions.push(candidate({
    id: "catalog_composition_by_unit",
    label: "Catalog composition by unit of measure",
    prompt: "How are products or materials distributed by unit of measure?",
    lens: "Inventory catalog structure",
    intent: "mix",
    requiredFamilies: ["item"],
    requiredSignals: ["item.unit"],
    optionalSignals: ["item.category", "item.product", "item.sku"],
    evidence: itemUnit ? itemUnit.evidence : [],
    action: makeAction(
      "catalog_composition_by_unit",
      "Catalog composition by unit of measure",
      "group_by",
      itemUnit ? [itemUnit.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: itemUnit ? [] : ["A unit-of-measure field is required."]
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
    id: "item_activity_volume",
    label: "Activity volume by product, service, medicine, or item",
    prompt: "Which products, services, medicines, or items appear most often in the governed source records?",
    lens: "Revenue activity volume by item",
    intent: "ranking",
    requiredFamilies: ["item"],
    requiredSignals: ["item.*"],
    optionalSignals: ["money.*", "document.*", "time.*", "location.*"],
    evidence: item ? item.evidence : [],
    action: makeAction(
      "item_activity_volume",
      "Activity volume by item",
      "group_by",
      item ? [item.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: item ? [] : ["A product/service/medicine/item dimension is required."]
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
      inventoryAgeBucket ? [inventoryAgeBucket.physicalColumn] : [],
      ["record_count"],
      scope
    ),
    blockedReasons: inventoryAgeBucket ? [] : ["An inventory age bucket or stock-status field is required."]
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
    const executableFirst = Number(Boolean(b.action)) - Number(Boolean(a.action));
    if (executableFirst !== 0) return executableFirst;
    const contextual = contextualQuestionPriority(b, signals) - contextualQuestionPriority(a, signals);
    if (contextual !== 0) return contextual;
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
