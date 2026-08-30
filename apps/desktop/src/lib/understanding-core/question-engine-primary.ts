import type { QuestionCandidate, UniversalSignal } from './contracts';
import { candidate, makeAction, positiveRateMeasure, first, byId, type UniversalQuestionContext } from './question-engine-shared';

export function appendUniversalQuestionsPrimary(questions: QuestionCandidate[], context: UniversalQuestionContext): void {
  const { signals, scope, money, revenue, cost, profit, receivable, payable, balance, time, location, item, actor, customer, customerContext, customerGeography, customerProfileDimension, vendor, documentType, status, receivedQty, issuedQty, soldQty, returnedQty, orderedQty, stockMovementQuantity, paymentMethod, payments, quality, engagementOutcome, engagementSegment, contactChannel, campaignAttempts, previousContacts, previousOutcome, indicator, secondaryIndicator, economicIndicator, infrastructureIndicator, countryOrRegion, participant, team, coach, role, activity, lineup, indicatorDimension } = context;

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
      id: "customer_activity_volume",
      label: "Activity volume by customer",
      prompt: "Which customer or patient appears most often in the source records?",
      lens: "Customer activity",
      intent: "ranking",
      requiredFamilies: ["entity"],
      requiredSignals: ["entity.customer|entity.patient"],
      optionalSignals: ["document.*", "time.*", "location.*", "entity.employee"],
      evidence: [customer, documentType, time, location, actor].filter(Boolean).flatMap(signal => signal!.evidence),
      action: makeAction(
        "customer_activity_volume",
        "Activity volume by customer",
        "group_by",
        customer ? [customer.physicalColumn] : [],
        ["record_count"],
        scope
      ),
      blockedReasons: customer ? [] : ["A usable customer or patient dimension is required."]
    }));

  questions.push(candidate({
      id: "customer_geographic_distribution",
      label: "Customer distribution by geography",
      prompt: "How are customers distributed across cities, states, regions, or countries?",
      lens: "Customer geography",
      intent: "ranking",
      requiredFamilies: ["entity", "location"],
      requiredSignals: ["entity.customer|entity.patient", "location.city|location.state_province|location.region|location.country|location.postal_code"],
      optionalSignals: ["entity.gender", "entity.person_age", "engagement.segment"],
      evidence: [customerContext, customerGeography].filter(Boolean).flatMap(signal => signal!.evidence),
      action: makeAction(
        "customer_geographic_distribution",
        "Customer distribution by geography",
        "group_by",
        customerContext && customerGeography ? [customerGeography.physicalColumn] : [],
        ["record_count"],
        scope
      ),
      blockedReasons: [
        ...(!customerContext ? ["Customer or patient context is required."] : []),
        ...(!customerGeography ? ["A usable city, state, region, country, or postal dimension is required."] : [])
      ]
    }));

  questions.push(candidate({
      id: "customer_profile_distribution",
      label: "Customer profile distribution",
      prompt: "How does the customer base break down by demographic or business segment?",
      lens: "Customer profile",
      intent: "mix",
      requiredFamilies: ["entity"],
      requiredSignals: ["entity.customer|entity.patient", "entity.gender|entity.person_age|engagement.segment"],
      optionalSignals: ["location.city", "location.state_province", "location.country"],
      evidence: [customerContext, customerProfileDimension].filter(Boolean).flatMap(signal => signal!.evidence),
      action: makeAction(
        "customer_profile_distribution",
        "Customer profile distribution",
        "distribution",
        customerContext && customerProfileDimension ? [customerProfileDimension.physicalColumn] : [],
        [],
        scope
      ),
      blockedReasons: [
        ...(!customerContext ? ["Customer or patient context is required."] : []),
        ...(!customerProfileDimension ? ["A usable gender, age, or customer-segment dimension is required."] : [])
      ]
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
      evidence: [orderedQty, receivedQty, issuedQty, soldQty, returnedQty, stockMovementQuantity].filter(Boolean).flatMap(signal => signal!.evidence),
      action: makeAction(
        "stock_movement",
        "Stock movement and quantity flow",
        "group_by",
        item ? [item.physicalColumn] : location ? [location.physicalColumn] : documentType ? [documentType.physicalColumn] : time ? [time.physicalColumn] : [],
        receivedQty ? [receivedQty.physicalColumn] : issuedQty ? [issuedQty.physicalColumn] : soldQty ? [soldQty.physicalColumn] : returnedQty ? [returnedQty.physicalColumn] : orderedQty ? [orderedQty.physicalColumn] : stockMovementQuantity ? [stockMovementQuantity.physicalColumn] : [],
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
}
