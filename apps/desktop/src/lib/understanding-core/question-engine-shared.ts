import type { CoreAction, DerivedMeasure, QuestionCandidate, UnderstandingCoreInput, UniversalSignal } from './contracts';
import { inferOverlays } from './signal-engine';

export function first(signals: UniversalSignal[], predicate: (signal: UniversalSignal) => boolean): UniversalSignal | undefined {
  return signals.find(signal => signal.usableForDefaultQuestion && predicate(signal));
}

export function firstAny(signals: UniversalSignal[], predicate: (signal: UniversalSignal) => boolean): UniversalSignal | undefined {
  return signals.find(predicate);
}

export function looksLikeEntityCodeColumn(column: string): boolean {
  const normalized = column.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
  return /(^|[\s_.-])(id|code|no|number)([\s_.-]|$)|\bma\b|msnv|employee[\s_.-]*id|manager[\s_.-]*id/.test(normalized);
}

export function byId(id: string) {
  return (signal: UniversalSignal) => signal.id === id;
}

export function executionScope(input: UnderstandingCoreInput): CoreAction["executionScope"] {
  const sourceRows = input.sourceRowCount ?? input.rows.length;
  return sourceRows > input.rows.length ? "sample_preview" : "full_local_file";
}

export const VIRTUAL_COUNT_MEASURES = new Set(["record_count", "row_count"]);

export function defaultMeasureAggregations(
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

export function makeAction(
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

export function positiveRateMeasure(outcome: UniversalSignal | undefined): DerivedMeasure[] | undefined {
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

export function candidate(args: Omit<QuestionCandidate, "fitScore" | "blockedReasons"> & { blockedReasons?: string[] }): QuestionCandidate {
  const blockedReasons = args.blockedReasons ?? [];
  const fitScore = args.action ? 100 : Math.max(10, 70 - blockedReasons.length * 20);
  return { ...args, fitScore, blockedReasons };
}

export function resolveUniversalQuestionContext(input: UnderstandingCoreInput, signals: UniversalSignal[]) {
  const scope = executionScope(input);

  const money = first(signals, signal => signal.family === "money" && signal.role === "measure");

  const revenue = first(signals, byId("money.revenue")) ?? first(signals, byId("money.receivable")) ?? money;

  const cost = first(signals, byId("money.cost"));

  const profit = first(signals, byId("money.profit")) ?? first(signals, byId("money.margin"));

  const receivable = first(signals, byId("money.receivable")) ?? first(signals, byId("money.debt"));

  const payable = first(signals, byId("money.payable"));

  const balance = first(signals, byId("money.closing_balance")) ?? first(signals, byId("money.balance")) ?? first(signals, byId("money.opening_balance"));

  const time = first(signals, signal => signal.family === "time" && signal.role === "time");

  const location = first(signals, signal => signal.family === "location");

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

  const actor = firstAny(signals, signal => isActorSignal(signal) && !looksLikeEntityCodeColumn(signal.physicalColumn))
      ?? first(signals, isActorSignal)
      ?? firstAny(signals, isActorSignal);

  const customer = first(signals, byId("entity.customer")) ?? first(signals, byId("entity.patient"));

  const customerContext = firstAny(signals, byId("entity.customer")) ?? firstAny(signals, byId("entity.patient"));

  const customerGeography =
      first(signals, byId("location.city")) ??
      first(signals, byId("location.state_province")) ??
      first(signals, byId("location.region")) ??
      first(signals, byId("location.country")) ??
      first(signals, byId("location.postal_code"));

  const customerProfileDimension =
      first(signals, byId("entity.gender")) ??
      first(signals, byId("entity.person_age")) ??
      first(signals, byId("engagement.segment"));

  const vendor = first(signals, byId("entity.vendor"));

  const documentType =
      first(signals, signal => signal.family === "document" && signal.role === "dimension") ??
      firstAny(signals, signal => signal.family === "document" && signal.role === "identifier");

  const status = first(signals, signal => signal.family === "status");

  const approvalStatus = first(signals, byId("status.approval"));

  const reconciliationStatus = first(signals, byId("status.reconciliation"));

  const quantity = first(signals, signal => signal.family === "quantity");

  const receivedQty = first(signals, byId("quantity.received"));

  const issuedQty = first(signals, byId("quantity.issued"));

  const soldQty = first(signals, byId("quantity.sold"));

  const returnedQty = first(signals, byId("quantity.returned"));

  const orderedQty = first(signals, byId("quantity.ordered"));

  const hasExplicitQuantityMovement = Boolean(receivedQty || issuedQty || soldQty || returnedQty || orderedQty);

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

  return { signals, scope, money, revenue, cost, profit, receivable, payable, balance, time, location, itemIdentifierColumns, item, itemCategory, itemBrand, itemUnit, isActorSignal, actor, customer, customerContext, customerGeography, customerProfileDimension, vendor, documentType, status, approvalStatus, reconciliationStatus, quantity, receivedQty, issuedQty, soldQty, returnedQty, orderedQty, hasExplicitQuantityMovement, hasInventoryContext, stockMovementQuantity, paymentMethod, payments, carrier, driver, vehicle, route, shipment, currentLocation, serviceGroup, deliveryStatus, deliveryFee, quality, engagementOutcome, engagementSegment, contactChannel, campaignAttempts, previousContacts, previousOutcome, indicator, secondaryIndicator, economicIndicator, infrastructureIndicator, countryOrRegion, participant, team, coach, role, activity, lineup, indicatorDimension };
}

export type UniversalQuestionContext = ReturnType<typeof resolveUniversalQuestionContext>;
