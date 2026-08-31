import type { MultiSourceDraftV1 } from '../components/analysis/CanonicalMultiSourceReview';
import { buildCanonicalMultiSourceDataset, buildCanonicalMultiSourceMemberArtifact, prepareCanonicalMultiSourceInvestigationHandoff, type CanonicalMultiSourceDatasetV1 } from './understanding-core/canonical-multisource-boundary';
import { buildCanonicalPeriodPartitionWorkspace, executeCanonicalPeriodPartitionWorkspace } from './understanding-core/canonical-period-partition-boundary';
import { executeCanonicalMultiSourceMetric } from './understanding-core/governed-multisource-duckdb-boundary';
import { GOVERNED_FULL_SCOPE_TOTAL_COLUMN } from './understanding-core/governed-metric-query-planner';
import { advancedSourceId } from '../stores/advanced-source-store';
import { createLocalCanonicalSourceBoundary } from './home-source-boundary';
import { appendCanonicalEvidenceDeclaration, createCanonicalUserOverlay } from './understanding-core/canonical-user-overlay';
import { createDomainComparisonBrief, type BAComparisonPeriodInput } from './ba-comparison-engine';
import { generateCanonicalAIBriefing } from './canonical-ai-briefing';
import type { PendingLocalFileBatch } from './home-multisource-candidate-review';
import type { CanonicalBusinessPerspectiveCandidateV1 } from './canonical-source-candidate-projection';

export interface HomeCanonicalMultiSourceBuildContext {
  pendingLocalBatch: PendingLocalFileBatch | null;
  multiSourceDrafts: Record<string, MultiSourceDraftV1>;
  registerAdvancedSource: (source: any) => void;
  setCurrentDataset: (dataset: any) => void;
  setDecisionTrustReport: (report: any) => void;
  setMultiSourceBuildResult: (result: { relationshipState: CanonicalMultiSourceDatasetV1["relationship"]["validationState"] | null; blockers: string[] }) => void;
  setMultiSourceBuilding: (building: boolean) => void;
  setPendingLocalBatch: (batch: PendingLocalFileBatch | null) => void;
}

export async function executeHomeCanonicalMultiSourceBuild(
  context: HomeCanonicalMultiSourceBuildContext,
  draftsOverride?: Record<string, MultiSourceDraftV1>,
  perspectiveId?: CanonicalBusinessPerspectiveCandidateV1["perspectiveId"],
) {
  const {
    pendingLocalBatch, multiSourceDrafts, registerAdvancedSource, setCurrentDataset,
    setDecisionTrustReport, setMultiSourceBuildResult, setMultiSourceBuilding, setPendingLocalBatch,
  } = context;
    if (!pendingLocalBatch || pendingLocalBatch.status !== 'ready') return;
    setMultiSourceBuilding(true);
    setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
    try {
      const activeDrafts = draftsOverride ?? multiSourceDrafts;
      const selected = pendingLocalBatch.files.flatMap((file, index) => {
        const key = `${index}:${file.name}`;
        const draft = activeDrafts[key];
        const result = pendingLocalBatch.results[index];
        return draft?.selected && result?.status === 'accessible' ? [{ key, file, draft, result }] : [];
      });
      if (selected.length < 2) throw new Error('Select at least two accessible sources.');
      const members = selected.map(({ file, draft, result }) => {
        const metadata = result.metadata;
        const source = metadata.is_workbook && metadata.default_sheet && metadata.sheets
          ? metadata.sheets[metadata.default_sheet]
          : metadata;
        const boundary = createLocalCanonicalSourceBoundary({
          datasetId: file.name,
          columns: source.columns ?? [],
          semanticRows: source.semantic_rows ?? [],
          semanticSample: source.semantic_sample,
          profile: source.canonical_full_file_profile,
          file,
          sheetName: metadata.is_workbook ? metadata.default_sheet : undefined,
        });
        if (!boundary) throw new Error(`Full-source canonical boundary unavailable for ${file.name}.`);
        let overlay = createCanonicalUserOverlay(boundary);
        if (draft.role) overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'source_role', value: { kind: 'source_role', role: draft.role }, scope: { level: 'source_file' } });
        if (draft.documentColumn) overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'document_identity', value: { kind: 'document_identity', physicalColumn: draft.documentColumn }, scope: { level: 'physical_column', physicalColumn: draft.documentColumn } });
        if (draft.periodStart && draft.periodEnd) overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'reporting_period', value: { kind: 'reporting_period', start: draft.periodStart, end: draft.periodEnd }, scope: { level: 'source_file' } });
        const monetaryColumns = draft.monetaryColumns.split(',').map((value) => value.trim()).filter(Boolean);
        if (draft.currency && monetaryColumns.length) overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: 'reporting_currency', value: { kind: 'reporting_currency', currency: draft.currency, monetaryColumns }, scope: { level: 'source_file' } });
        const built = buildCanonicalMultiSourceMemberArtifact({
          datasetId: boundary.datasetId,
          sourceKind: 'local_file',
          sourceLabel: file.name,
          columns: boundary.semanticSample.columns,
          rows: boundary.semanticSample.rows,
          sourceRowCount: boundary.sourceRowCount,
          sheet: metadata.is_workbook ? metadata.default_sheet : undefined,
          sourceBoundary: boundary,
          userOverlay: overlay,
        });
        if (built.status !== 'valid') throw new Error(`${file.name}: ${built.blockers.join(', ')}`);
        return { file, metadata, source, boundary, overlay, artifact: built, draft };
      });

      if (perspectiveId && perspectiveId !== "data_trust") {
        const periodExecutions: Array<{
          workspace: NonNullable<ReturnType<typeof buildCanonicalPeriodPartitionWorkspace>["workspace"]>;
          result: Awaited<ReturnType<typeof executeCanonicalPeriodPartitionWorkspace>>;
        }> = [];
        const multiSourceExecutions: Array<{
          period: string;
          dataset: CanonicalMultiSourceDatasetV1;
          result: Awaited<ReturnType<typeof executeCanonicalMultiSourceMetric>>;
        }> = [];
        const requestedCapabilities = {
          sales: ["executive_overview", "sales_performance", "period_comparison"].includes(perspectiveId),
          logistics: ["executive_overview", "fulfillment_operations", "period_comparison"].includes(perspectiveId),
          profitability: ["executive_overview", "profitability", "finance_accounting"].includes(perspectiveId),
        };

        const executeRolePeriods = async (role: "sales" | "logistics", metricId: "sales_revenue" | "delivery_count") => {
          const roleMembers = members.filter((item) => item.draft.role === role);
          if (roleMembers.length === 0) return;
          const built = buildCanonicalPeriodPartitionWorkspace({
            workspaceId: `perspective:${perspectiveId}:${role}:${roleMembers.map((item) => item.boundary.sourceId).sort().join('|')}`,
            metricId,
            members: roleMembers.map((item) => ({ artifact: item.artifact, overlay: item.overlay })),
          });
          if (built.status !== "valid") throw new Error(built.blockers.join(", "));
          const result = await executeCanonicalPeriodPartitionWorkspace(built.workspace);
          if (result.status !== "executed") throw new Error(result.blockers.join(", "));
          periodExecutions.push({ workspace: built.workspace, result });
        };

        if (requestedCapabilities.sales) await executeRolePeriods("sales", "sales_revenue");
        if (requestedCapabilities.logistics) await executeRolePeriods("logistics", "delivery_count");

        if (requestedCapabilities.profitability) {
          const periods = [...new Set(members.flatMap((item) =>
            item.draft.periodStart ? [item.draft.periodStart.slice(0, 7)] : []))].sort();
          for (const period of periods) {
            const pair = members.filter((item) =>
              item.draft.periodStart?.slice(0, 7) === period
              && (item.draft.role === "sales" || item.draft.role === "accounting"));
            if (pair.length !== 2 || !pair.some((item) => item.draft.role === "sales") || !pair.some((item) => item.draft.role === "accounting")) continue;
            const built = await buildCanonicalMultiSourceDataset({
              multiSourceDatasetId: `perspective:${perspectiveId}:gross-profit:${period}`,
              members: pair.map((item) => ({ artifact: item.artifact, overlay: item.overlay, required: true })),
            });
            if (built.status !== "valid") throw new Error(built.blockers.join(", "));
            const analysis = built.dataset.analyses.find((item) => item.metricId === "gross_profit" && item.state === "ready");
            if (!analysis) throw new Error(built.dataset.analyses.flatMap((item) => item.blockers).join(", ") || "Gross profit is not ready.");
            const handoff = prepareCanonicalMultiSourceInvestigationHandoff(built.dataset, analysis.analysisId);
            if (!handoff || handoff.queryPlanning.state !== "planned" || !handoff.sourceBoundary) throw new Error("Gross-profit execution plan is unavailable.");
            const result = await executeCanonicalMultiSourceMetric({
              dataset: built.dataset,
              handoff,
              request: {
                schemaVersion: "lightbi.governed-metric-execution-request.v1",
                requestId: `easy-perspective:${perspectiveId}:${period}`,
                plan: handoff.queryPlanning.plan,
                rows: [],
                runtimeSource: handoff.sourceBoundary.runtimeSource,
                expectedRuntimeBinding: handoff.sourceBoundary.runtimeSource.binding,
                artifactIdentity: handoff.artifactIdentity,
                expectedSourceRowCount: handoff.sourceBoundary.sourceRowCount,
                groundTruth: {
                  state: "unavailable",
                  value: null,
                  tolerance: null,
                  provenance: "easy_mode_no_external_ground_truth",
                },
              },
            });
            if (result.status !== "executed") throw new Error(result.blockers.join(", "));
            multiSourceExecutions.push({ period, dataset: built.dataset, result });
          }
        }

        if (periodExecutions.length === 0 && multiSourceExecutions.length === 0) {
          throw new Error("This perspective needs evidence that is not executable yet.");
        }
        const primary = members[0];
        const combinedRows = new Map<string, Record<string, string | number>>();
        periodExecutions.forEach(({ workspace, result }) => result.rows.forEach((row) => {
          const period = String(row.reporting_period);
          combinedRows.set(period, { ...(combinedRows.get(period) ?? { reporting_period: period }), [workspace.metricId]: Number(row[workspace.metricId]) });
        }));
        multiSourceExecutions.forEach(({ period, result }) => {
          const governedActual = result.metricResult.groundTruthComparison.actual;
          const fullScopeTotals = result.metricResult.rows
            .map((row) => Number(row[GOVERNED_FULL_SCOPE_TOTAL_COLUMN]))
            .filter(Number.isFinite);
          const values = result.metricResult.rows.map((row) => Number(row.gross_profit)).filter(Number.isFinite);
          const total = governedActual !== null && Number.isFinite(Number(governedActual))
            ? Number(governedActual)
            : fullScopeTotals.length
              ? fullScopeTotals[0]
              : values.reduce((sum, value) => sum + value, 0);
          combinedRows.set(period, { ...(combinedRows.get(period) ?? { reporting_period: period }), gross_profit: total });
        });
        const analysisRows = [...combinedRows.values()].sort((left, right) =>
          String(left.reporting_period).localeCompare(String(right.reporting_period)));
        const deepDiveRole = ["profitability", "finance_accounting", "executive_overview"].includes(perspectiveId)
          ? "accounting"
          : perspectiveId === "fulfillment_operations"
            ? "logistics"
            : "sales";
        const deepDivePeriods: BAComparisonPeriodInput[] = members
          .filter((item) => item.draft.role === deepDiveRole)
          .map((item) => ({
            id: item.boundary.sourceId,
            label: item.draft.periodStart.slice(0, 7),
            sourceName: item.file.name,
            rows: (item.source.analysis_rows ?? item.boundary.semanticSample.rows) as Record<string, unknown>[],
            labelConfidence: "high" as const,
            labelReason: "Observed in the source and selected in this governed analysis.",
            sortableKey: item.draft.periodStart.slice(0, 7),
          }))
          .filter((item) => item.rows.length > 0);
        const canonicalPerspectiveBrief = deepDivePeriods.length >= 2
          ? createDomainComparisonBrief({
            datasetName: `${perspectiveId.replaceAll("_", " ")} analysis`,
            periods: deepDivePeriods,
            preferredDomain: deepDiveRole === "accounting"
              ? "finance"
              : deepDiveRole === "logistics"
                ? "operations"
                : "revenue",
          })
          : null;
        const canonicalPerspectiveEvidenceSources = members.map((item) => ({
          period: item.draft.periodStart?.slice(0, 7) ?? 'unavailable',
          role: item.draft.role ?? 'source',
          sourceId: item.boundary.sourceId,
          sourceName: item.file.name,
          sourceRowCount: item.boundary.sourceRowCount,
          rows: (item.source.analysis_rows ?? item.boundary.semanticSample.rows) as Record<string, unknown>[],
          semanticFields: generateCanonicalAIBriefing(item.artifact).semanticFields,
        }));
        const collectionAdvancedSourceId = advancedSourceId("canonical_perspective_collection", perspectiveId);
        const readyDataset = {
          status: 'ready',
          file_name: `${perspectiveId.replaceAll("_", " ")} analysis`,
          rows_count: members.reduce((sum, item) => sum + item.boundary.sourceRowCount, 0),
          columns: ["reporting_period", ...new Set(analysisRows.flatMap((row) => Object.keys(row).filter((key) => key !== "reporting_period")))],
          profiles: primary.source.profiles ?? {},
          sourceType: 'canonical_perspective_collection',
          advancedSourceId: collectionAdvancedSourceId,
          sourceFiles: members.map((item) => ({
            name: item.file.name,
            rows: item.boundary.sourceRowCount,
            columns: item.boundary.semanticSample.columns.length,
            sourceId: item.boundary.sourceId,
            role: item.draft.role,
            reportingPeriod: item.draft.periodStart && item.draft.periodEnd ? `${item.draft.periodStart}/${item.draft.periodEnd}` : null,
            persistedFile: item.metadata.persisted_file,
            sheetNames: item.metadata.is_workbook && item.metadata.default_sheet ? [item.metadata.default_sheet] : [],
          })),
          selected_sheet: null,
          file_reference: primary.file,
          runtimeFileReferences: members.map(item => item.file),
          runtimeDatasetSource: primary.boundary.runtimeSource,
          semanticSample: {
            strategy: primary.boundary.semanticSample.strategy,
            sourceRowCount: primary.boundary.semanticSample.sourceRowCount,
            sampleRowCount: primary.boundary.semanticSample.rows.length,
          },
          canonicalSourceBoundary: primary.boundary,
          canonicalUserOverlay: primary.overlay,
          canonicalPerspectiveId: perspectiveId,
          canonicalPerspectiveBrief,
          canonicalPerspectiveEvidenceSources,
          canonicalPerspectiveExecutions: periodExecutions,
          canonicalPerspectiveMultiSourceExecutions: multiSourceExecutions,
          analysisRowScope: 'full_file_governed_collection',
          semanticRows: primary.boundary.semanticSample.rows,
          analysisRows,
          previewRows: analysisRows,
        };
        registerAdvancedSource({
          id: collectionAdvancedSourceId,
          name: `${perspectiveId.replaceAll("_", " ")} · ${members.length} governed sources`,
          sourceType: "canonical_perspective_collection",
          sourceKind: "local_file",
          tables: members.map((item, index) => ({
            id: `${index}:${item.draft.role}:${item.draft.periodStart.slice(0, 7)}`,
            name: `${item.draft.role || "source"}_${item.draft.periodStart.slice(0, 7) || index + 1}`,
            rowCount: item.boundary.sourceRowCount,
            columns: item.boundary.semanticSample.columns,
            profiles: item.source.profiles ?? {},
            file: item.file,
            sheetName: item.metadata.is_workbook ? item.metadata.default_sheet : undefined,
          })),
          semanticSample: {
            strategy: "governed_collection",
            sourceRowCount: members.reduce((sum, item) => sum + item.boundary.sourceRowCount, 0),
            sampleRowCount: members.reduce((sum, item) => sum + item.boundary.semanticSample.rows.length, 0),
          },
          easyReturnDataset: readyDataset,
          registeredAt: new Date().toISOString(),
        });
        setCurrentDataset(readyDataset);
        setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
        setDecisionTrustReport(null);
        setPendingLocalBatch(null);
        return;
      }

      const selectedRoles = [...new Set(members.map((item) => item.draft.role).filter(Boolean))];
      const periodPartitionMetric = selectedRoles.length === 1 && selectedRoles[0] === 'sales'
        ? 'sales_revenue'
        : selectedRoles.length === 1 && selectedRoles[0] === 'logistics'
          ? 'delivery_count'
          : null;
      if (periodPartitionMetric && members.length >= 2) {
        const periodWorkspace = buildCanonicalPeriodPartitionWorkspace({
          workspaceId: `period-partition:${members.map((item) => item.boundary.sourceId).sort().join('|')}`,
          metricId: periodPartitionMetric,
          members: members.map((item) => ({ artifact: item.artifact, overlay: item.overlay })),
        });
        if (periodWorkspace.status !== 'valid') throw new Error(periodWorkspace.blockers.join(', '));
        const periodExecution = await executeCanonicalPeriodPartitionWorkspace(periodWorkspace.workspace);
        if (periodExecution.status !== 'executed') throw new Error(periodExecution.blockers.join(', '));
        const primary = members[0];
        const sourceFiles = members.map((item) => ({
          name: item.file.name,
          rows: item.boundary.sourceRowCount,
          columns: item.boundary.semanticSample.columns.length,
          sourceId: item.boundary.sourceId,
          role: item.draft.role,
          reportingPeriod: item.draft.periodStart && item.draft.periodEnd
            ? `${item.draft.periodStart}/${item.draft.periodEnd}`
            : null,
          persistedFile: item.metadata.persisted_file,
          sheetNames: item.metadata.is_workbook && item.metadata.default_sheet ? [item.metadata.default_sheet] : [],
        }));
        setCurrentDataset({
          status: 'ready',
          file_name: `Governed ${selectedRoles[0]} period comparison`,
          rows_count: members.reduce((sum, item) => sum + item.boundary.sourceRowCount, 0),
          columns: primary.boundary.semanticSample.columns,
          profiles: primary.source.profiles ?? {},
          sourceType: 'canonical_period_partition',
          sourceFiles,
          selected_sheet: primary.metadata.is_workbook ? primary.metadata.default_sheet : null,
          file_reference: primary.file,
          runtimeFileReferences: members.map(item => item.file),
          runtimeDatasetSource: primary.boundary.runtimeSource,
          semanticSample: {
            strategy: primary.boundary.semanticSample.strategy,
            sourceRowCount: primary.boundary.semanticSample.sourceRowCount,
            sampleRowCount: primary.boundary.semanticSample.rows.length,
          },
          canonicalSourceBoundary: primary.boundary,
          canonicalUserOverlay: primary.overlay,
          canonicalPeriodPartitionWorkspace: periodWorkspace.workspace,
          canonicalPeriodPartitionExecution: periodExecution,
          analysisRowScope: 'full_file_period_partitions',
          semanticRows: primary.boundary.semanticSample.rows,
          analysisRows: periodExecution.rows,
          previewRows: periodExecution.rows,
        });
        setMultiSourceBuildResult({ relationshipState: null, blockers: [] });
        setDecisionTrustReport(null);
        setPendingLocalBatch(null);
        return;
      }
      const built = await buildCanonicalMultiSourceDataset({
        multiSourceDatasetId: `multisource:${members.map((item) => item.boundary.sourceId).sort().join('|')}`,
        members: members.map((item) => ({ artifact: item.artifact, overlay: item.overlay, required: item.draft.role === 'sales' || item.draft.role === 'accounting' })),
      });
      if (built.status !== 'valid') throw new Error(built.blockers.join(', '));
      const analysis = built.dataset.analyses[0];
      const relationshipBlockers = [...new Set([...built.dataset.relationship.refusalReasons, ...analysis.blockers])];
      setMultiSourceBuildResult({ relationshipState: built.dataset.relationship.validationState, blockers: relationshipBlockers });
      if (analysis.state !== 'ready' || relationshipBlockers.length > 0) return;
      const metricMember = built.dataset.orderedSourceMemberships.find((item) => item.sourceRole === 'accounting') ?? built.dataset.orderedSourceMemberships[0];
      const sourceRecord = members.find((item) => item.boundary.sourceId === metricMember.sourceId)!;
      const sourceFiles = members.map((item) => ({
        name: item.file.name,
        rows: item.boundary.sourceRowCount,
        columns: item.boundary.semanticSample.columns.length,
        sourceId: item.boundary.sourceId,
        role: built.dataset.orderedSourceMemberships.find((member) => member.sourceId === item.boundary.sourceId)?.sourceRole,
        persistedFile: item.metadata.persisted_file,
        sheetNames: item.metadata.is_workbook && item.metadata.default_sheet ? [item.metadata.default_sheet] : [],
      }));
      setCurrentDataset({
        status: 'ready',
        file_name: `Governed multi-source dataset (${members.length} sources)`,
        rows_count: built.dataset.orderedSourceMemberships.reduce((sum, item) => sum + item.boundary.sourceRowCount, 0),
        columns: metricMember.boundary.semanticSample.columns,
        profiles: sourceRecord.source.profiles ?? {},
        sourceType: 'canonical_multisource',
        sourceFiles,
        selected_sheet: sourceRecord.metadata.is_workbook ? sourceRecord.metadata.default_sheet : null,
        file_reference: sourceRecord.file,
        runtimeFileReferences: members.map(item => item.file),
        runtimeDatasetSource: metricMember.runtimeSource,
        semanticSample: {
          strategy: metricMember.semanticSampleScope.strategy,
          sourceRowCount: metricMember.semanticSampleScope.sourceRowCount,
          sampleRowCount: metricMember.semanticSampleScope.rows.length,
        },
        canonicalSourceBoundary: metricMember.boundary,
        canonicalUserOverlay: metricMember.overlay,
        canonicalMultiSourceDataset: built.dataset,
        analysisRowScope: 'not_retained',
        semanticRows: metricMember.semanticSampleScope.rows,
        analysisRows: [],
        previewRows: metricMember.semanticSampleScope.rows.slice(0, 100),
      });
      setDecisionTrustReport(null);
      setPendingLocalBatch(null);
    } catch (error) {
      setMultiSourceBuildResult({ relationshipState: null, blockers: [error instanceof Error ? error.message : String(error)] });
    } finally {
      setMultiSourceBuilding(false);
    }
  }
