import type { QuestionCandidate, UniversalSignal } from './contracts';
import { candidate, makeAction, first, firstAny, byId, type UniversalQuestionContext } from './question-engine-shared';

export function appendUniversalQuestionsSecondary(questions: QuestionCandidate[], context: UniversalQuestionContext): void {
  const { signals, scope, money, cost, time, location, item, itemCategory, itemBrand, itemUnit, actor, customer, vendor, documentType, status, approvalStatus, reconciliationStatus, quantity, carrier, driver, vehicle, route, shipment, currentLocation, serviceGroup, deliveryStatus, deliveryFee } = context;

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
}
