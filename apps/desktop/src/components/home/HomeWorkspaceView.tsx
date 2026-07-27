import React from 'react';
import { Search, Loader2, ChevronRight, Database, Plus, FileSpreadsheet, Link, Server, Code, Sparkles, Layers, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataIntakeDrawer } from '../data-intake/DataIntakeDrawer';
import { DataQualityCard } from '../data-intake/DataQualityCard';
import { DatasetUnderstandingCard } from '../analysis/DatasetUnderstandingCard';
import { UnderstandingNextCard } from '../analysis/UnderstandingNextCard';
import { CanonicalEvidenceReview } from '../analysis/CanonicalEvidenceReview';
import { CanonicalMultiSourceReview } from '../analysis/CanonicalMultiSourceReview';
import { DecisionTrustReportCard } from '../analysis/DecisionTrustReportCard';
import { BusinessViewSummaryCard } from '../analysis/BusinessViewSummaryCard';
import { BusinessFusionOpportunityCard } from '../analysis/BusinessFusionOpportunityCard';
import { homeGuidance } from '../../content/home-guidance';
import { getActiveAnalysisContextLabel } from '../../lib/workspace-understanding-state';
import { parseCanonicalUserOverlay } from '../../lib/understanding-core/canonical-user-overlay';
import { formatValue } from '../../lib/display-formatter';
import { HomeSessionHistoryPanel } from './HomeSessionHistoryPanel';
import { HomeResultView } from './HomeResultView';
import { HomeDataPreviewDialog } from './HomeDataPreviewDialog';
import { HomePlanningDialogs } from './HomePlanningDialogs';

export const HomeWorkspaceView: React.FC<{ model: any }> = ({ model }) => {
  const { activeConnection, setActiveConnection, handleOnlineSourceInspected, result, isAsking, selectedTopic, currentDataset, pendingLocalBatch, setPendingLocalBatch, isPlusMenuOpen, setIsPlusMenuOpen, isReplaceMenuOpen, setIsReplaceMenuOpen, greeting, navigate, questionInputRef, inputValue, setInputValue, setIsInputFocused, askQuestion, activeAnalysisIntent, questionPlaceholder, renderSourcePickerMenu, activeChips, setAnalysisIntent, openLocalFilePicker, openOnlineDataDrawer, openDatabaseDrawer, workspaceSessions, sessionStatus, preferences, handleOpenWorkspaceSession, handleDeleteWorkspaceSession, fileInputRef, handleFileChange, uploadError, isUploading, workspaceState, datasetTrustClass, datasetTrustScore, datasetTrustLabel, isSavingSession, handleSaveWorkspaceSession, isDataPreviewOpen, setIsDataPreviewOpen, decisionTrustReport, datasetHealthResult, datasetUnderstandingNext, canonicalArtifact, canonicalPresentation, handleCanonicalOverlayChange, handleCanonicalRemediation, canonicalOverlayRebuildState, canonicalReviewTarget, multiSourceBuildResult, multiSourceReviewSources, multiSourceDrafts, setMultiSourceDrafts, multiSourceBuilding, handleBuildCanonicalMultiSource, handleCancelInspection, handleUseLocalDataset, guidedInvestigationResult, datasetUnderstanding, activeBusinessViews, selectedPerspective, setSelectedPerspective, analysisMode, setAnalysisMode, selectedBusinessView, setSelectedBusinessView, visibleQuestionSuggestions, selectedViewData, previewActionId, setPreviewActionId, handleSelectAnalysisAction, handleLegacyQuestionSuggestion, lastInspectedFamilies, getEChartsOption, planningWorkflow, canonicalRows } = model;
  return (
    <div className="flex-1 overflow-y-auto bg-[#fbfbfa] text-[#202123] font-sans" onClick={() => isPlusMenuOpen && setIsPlusMenuOpen(false)}>

      {/* Global Data Intake Drawer */}
      <DataIntakeDrawer
        request={activeConnection}
        onClose={() => setActiveConnection(null)}
        onSourceInspected={handleOnlineSourceInspected}
      />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-5 py-8 md:px-8 lg:px-10" onClick={e => e.stopPropagation()}>
        {!result && !isAsking && !selectedTopic && (
          <>
            {currentDataset?.status !== 'ready' && (
              <div className={`flex w-full flex-col items-center justify-center text-center ${pendingLocalBatch ? 'min-h-0 pb-8 pt-10' : 'min-h-[calc(100vh-130px)] pb-12'}`}>
                <div className="mb-4 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[13px] text-black/45 shadow-sm">{greeting}</div>
                <div className="relative mb-8 flex w-full max-w-4xl justify-center">
                  <h1 className="text-[34px] font-medium tracking-normal text-[#202123] md:text-[44px]">
                    What should LightBI understand?
                  </h1>
                </div>

                <div className="relative flex w-full max-w-[820px] flex-col items-center">
                  <div className="relative flex w-full items-center rounded-[24px] border border-black/10 bg-white shadow-[0_22px_65px_rgba(15,23,42,0.10)] transition-shadow duration-300 focus-within:shadow-[0_28px_75px_rgba(15,23,42,0.14)]">
                    <button
                      onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                      className="source-picker-toggle absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl text-black/55 transition-colors hover:bg-black/[0.04] hover:text-[#202123]"
                      title="Add data source"
                    >
                      <Plus className="h-5 w-5" />
                    </button>

                    {renderSourcePickerMenu(isPlusMenuOpen, "top-16 left-0")}

                    <input
                      ref={questionInputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && inputValue.trim()) {
                              askQuestion(activeAnalysisIntent || inputValue.trim());
                              setInputValue("");
                          }
                      }}
                      placeholder={questionPlaceholder === "Ask a question about your data..." ? "Paste a sheet link, import a file, or ask what to analyze" : questionPlaceholder}
                      className="h-[78px] w-full rounded-[24px] border-0 bg-transparent pl-16 pr-6 text-[16px] text-[#202123] outline-none placeholder:text-black/30"
                    />
                  </div>

                  <div className="mt-4 flex min-h-[42px] flex-wrap content-start justify-center gap-2">
                    {activeChips.map((chip: any, idx: number) => {
                      const style = homeGuidance.heroChipCategoryStyles[chip.category] || homeGuidance.heroChipCategoryStyles.general;
                      return (
                        <div key={`slot-${idx}`} className="relative flex items-center justify-center">
                          <AnimatePresence mode="wait">
                            <motion.button
                              key={chip.text}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              onClick={() => {
                                setInputValue(chip.text);
                                setAnalysisIntent(chip.text);
                                askQuestion(chip.text);
                              }}
                              className={`group flex items-center gap-2 whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] text-black/55 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black/15 hover:bg-black/[0.025] hover:text-[#202123] hover:shadow-md ${style.hover}`}
                            >
                              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${style.dot}`} />
                              <span>{chip.text}</span>
                            </motion.button>
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-9 grid w-full grid-cols-1 gap-3 md:grid-cols-3">
                    <button
                      onClick={openLocalFilePicker}
                      className="group rounded-[16px] border border-black/10 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                    >
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[12px] bg-emerald-50 text-emerald-600 shadow-sm transition-transform duration-200 group-hover:scale-105"><FileSpreadsheet className="h-5 w-5" strokeWidth={1.7} /></div>
                      <div className="text-[15px] font-medium text-[#202123]">Import local files</div>
                      <div className="mt-1 text-[13px] leading-5 text-black/45">Excel, CSV, JSON, TSV with matrix sampling and quality score.</div>
                    </button>
                    <button
                      onClick={openOnlineDataDrawer}
                      className="group rounded-[16px] border border-black/10 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                    >
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[12px] bg-blue-50 text-blue-600 shadow-sm transition-transform duration-200 group-hover:scale-105"><Link className="h-5 w-5" strokeWidth={1.7} /></div>
                      <div className="text-[15px] font-medium text-[#202123]">Connect online sheet</div>
                      <div className="mt-1 text-[13px] leading-5 text-black/45">Short or full links stay online-first, then LightBI builds a BA brief.</div>
                    </button>
                    <button
                      onClick={openDatabaseDrawer}
                      className="group rounded-[16px] border border-black/10 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                    >
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet-50 text-violet-600 shadow-sm transition-transform duration-200 group-hover:scale-105"><Server className="h-5 w-5" strokeWidth={1.7} /></div>
                      <div className="text-[15px] font-medium text-[#202123]">Connect database system</div>
                      <div className="mt-1 text-[13px] leading-5 text-black/45">Postgres, MySQL, MariaDB, MongoDB, SQLite, then LightBI builds a BA brief.</div>
                    </button>
                  </div>

                  <HomeSessionHistoryPanel
                    className="mt-5 w-full text-left"
                    sessions={workspaceSessions}
                    activeSessionId={currentDataset?.restoredFromSessionId}
                    status={sessionStatus}
                    formatRowCount={value => formatValue(value, 'number', preferences, { compact: true })}
                    formatColumnCount={value => formatValue(value, 'number', preferences, { compact: true })}
                    onOpen={session => void handleOpenWorkspaceSession(session)}
                    onDelete={sessionId => void handleDeleteWorkspaceSession(sessionId)}
                  />
                </div>
              </div>
            )}
          </>
        )}

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".csv,.xlsx,.xls,.txt,.tsv,.json"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && <div className="mb-4 text-[13px] text-red-500 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">{uploadError}</div>}
        {isUploading && <div className="mb-4 flex items-center text-sm text-gray-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading and analyzing data...</div>}

        {!result && !isAsking && !selectedTopic && (
          <div className={`w-full grid grid-cols-1 lg:grid-cols-3 ${pendingLocalBatch && currentDataset?.status !== 'ready' ? 'gap-5' : 'gap-8'} items-start pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            {/* Main Column */}
            <div className={`flex flex-col gap-8 ${pendingLocalBatch && currentDataset?.status !== 'ready' ? 'mx-auto w-full max-w-3xl lg:col-span-3' : 'lg:col-span-2'}`}>

              {/* Data Status Card – only rendered when currentDataset.status === "ready" */}
              {currentDataset?.status === 'ready' && (
                <div className="w-full rounded-[18px] border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-black/[0.04] shadow-sm">
                        <Database className="h-5 w-5 text-black/65" strokeWidth={1.7} />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="truncate text-[17px] font-semibold text-[#202123]">
                            {workspaceState ? getActiveAnalysisContextLabel(workspaceState, currentDataset.file_name) : currentDataset.file_name}
                          </p>
                          {(['virtual_business_view', 'business_fusion_view'].includes(currentDataset.sourceType) || workspaceState?.activeContext.type === "business_view") && (
                            <span className="rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">Business View</span>
                          )}
                          <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${datasetTrustClass}`}>
                            {datasetTrustScore === null ? datasetTrustLabel : `${datasetTrustLabel}: ${formatValue(datasetTrustScore, 'number', preferences)} / 100`}
                          </span>
                        </div>
                        {(['virtual_business_view', 'business_fusion_view'].includes(currentDataset.sourceType) || workspaceState?.activeContext.type === "business_view") ? (
                          <p className="text-[13px] text-black/50">Business view · {formatValue(currentDataset.businessFusionOverview?.sources?.length || currentDataset.selectedBusinessView?.datasets?.length || 0, 'number', preferences, { compact: true })} datasets · {formatValue(Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0, 'number', preferences, { compact: true })} columns</p>
                        ) : (
                          <>
                            <p className="text-[13px] text-black/50">{formatValue(currentDataset.rows_count, 'number', preferences, { compact: true })} rows · {formatValue(Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0, 'number', preferences, { compact: true })} columns</p>
                            {currentDataset.semanticSample?.strategy === 'matrix_sample' && (
                              <p className="mt-1 text-[12px] text-blue-700">
                                Understanding: {formatValue(currentDataset.semanticSample.sampleRowCount, 'number', preferences)} representative rows · Runtime: {currentDataset.runtimeDatasetSource ? 'full local file' : 'representative sample'}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      onClick={handleSaveWorkspaceSession}
                      disabled={isSavingSession}
                      className="flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035] disabled:cursor-not-allowed disabled:opacity-60"
                      title="Save current session"
                    >
                      {isSavingSession ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save session
                    </button>
                    <button onClick={() => setIsDataPreviewOpen(true)} className="rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]">View Data</button>
                    {currentDataset.sourceType !== 'virtual_business_view' && currentDataset.file_reference && (
                      <button onClick={() => navigate('/advanced')} className="flex items-center gap-1.5 rounded-[10px] bg-[#202123] px-3 py-2 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-black"><Code className="h-3.5 w-3.5" /> Open Advanced</button>
                    )}
                    {lastInspectedFamilies && lastInspectedFamilies.length > 1 && (
                      <button
                        onClick={() => {
                          setPendingLocalBatch({
                            files: [],
                            status: "ready",
                            results: [],
                            families: lastInspectedFamilies,
                            selectedFamilyId: null,
                            isRestored: true,
                            step: "family_selection"
                          });
                        }}
                        className="rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]"
                      >
                        Change Group
                      </button>
                    )}
                    <div className="relative">
                      <button onClick={() => setIsReplaceMenuOpen(!isReplaceMenuOpen)} className="source-picker-toggle rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]">Replace Data</button>
                      {renderSourcePickerMenu(isReplaceMenuOpen, "top-10 right-0")}
                    </div>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/5 pt-4 md:grid-cols-4">
                    <div className="rounded-[14px] bg-[#f7f7f6] px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-black/40">Rows</div>
                      <div className="mt-1 text-[20px] font-semibold text-[#202123]">{formatValue(currentDataset.rows_count, 'number', preferences, { compact: true })}</div>
                    </div>
                    <div className="rounded-[14px] bg-[#f7f7f6] px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-black/40">Columns</div>
                      <div className="mt-1 text-[20px] font-semibold text-[#202123]">{formatValue(Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0, 'number', preferences, { compact: true })}</div>
                    </div>
                    <div className="rounded-[14px] bg-[#f7f7f6] px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-black/40">Data trust</div>
                      <div className="mt-1 text-[20px] font-semibold text-[#202123]">{datasetTrustScore === null ? 'Review' : `${formatValue(datasetTrustScore, 'number', preferences)} / 100`}</div>
                    </div>
                    <div className="rounded-[14px] bg-[#f7f7f6] px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-black/40">Runtime</div>
                      <div className="mt-1 text-[20px] font-semibold text-[#202123]">{currentDataset.runtimeDatasetSource ? 'Full file' : 'Sample'}</div>
                    </div>
                  </div>
                </div>
              )}

              {datasetHealthResult && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
                  <DataQualityCard health={datasetHealthResult} />
                  {decisionTrustReport && <DecisionTrustReportCard report={decisionTrustReport} />}

                  {/* Dataset Understanding Layer */}
                  {datasetUnderstandingNext ? (
                    <>
                      <UnderstandingNextCard
                        understanding={datasetUnderstandingNext}
                        onSelectAction={handleSelectAnalysisAction}
                        canonicalPresentation={canonicalPresentation ?? undefined}
                        onRemediate={handleCanonicalRemediation}
                      />
                      {canonicalArtifact && (
                        <CanonicalEvidenceReview
                          artifact={canonicalArtifact}
                          overlay={parseCanonicalUserOverlay(currentDataset.canonicalUserOverlay)}
                          rebuildState={canonicalOverlayRebuildState}
                          onChange={handleCanonicalOverlayChange}
                          target={canonicalReviewTarget}
                        />
                      )}
                      {currentDataset?.canonicalMultiSourceDataset && (
                        <section data-testid="active-canonical-multisource" className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div><h3 className="text-[14px] font-semibold text-[#202123]">Governed multi-source relationship</h3><p className="mt-1 text-[12px] text-black/55">{currentDataset.canonicalMultiSourceDataset.orderedSourceMemberships.length} independently profiled sources participate.</p></div>
                            <span className="rounded-md border border-black/10 bg-gray-50 px-2 py-1 text-[11px] font-semibold">{currentDataset.canonicalMultiSourceDataset.relationship.validationState}</span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {currentDataset.canonicalMultiSourceDataset.orderedSourceMemberships.map((member: any) => <div key={member.sourceId} className="rounded-lg border border-black/5 bg-[#fbfbfa] p-2"><p className="truncate text-[12px] font-semibold">{member.boundary.datasetId}</p><p className="mt-1 text-[11px] text-black/50">{member.sourceRole} · {member.boundary.sourceRowCount.toLocaleString()} rows</p></div>)}
                          </div>
                          {currentDataset.canonicalMultiSourceDataset.relationship.refusalReasons.length > 0 && <p className="mt-3 break-words text-[12px] text-amber-700">{currentDataset.canonicalMultiSourceDataset.relationship.refusalReasons.join(', ')}</p>}
                        </section>
                      )}
                    </>
                  ) : datasetUnderstanding ? (
                    <DatasetUnderstandingCard
                      understanding={datasetUnderstanding}
                      onSelectAction={handleSelectAnalysisAction}
                    />
                  ) : null}

                  {/* Global Perspective Selector */}
                  {!datasetUnderstandingNext && (
                  <>
                  <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500 mt-2">
                    <div>
                      <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Optional: Choose a deeper business perspective</h3>
                      <p className="text-[13px] text-gray-500">LightBI already understands the dataset. Choose a perspective only if you want advanced guided analysis.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {!guidedInvestigationResult?.perspectives || guidedInvestigationResult.perspectives.length === 0 ? (
                        <div className="col-span-2 md:col-span-3 p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                          <p className="text-sm text-gray-500">No reliable business perspectives found for this data yet.</p>
                        </div>
                      ) : (
                        guidedInvestigationResult.perspectives.map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedPerspective(p.id);
                              setSelectedBusinessView(null);
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex flex-col ${
                              selectedPerspective === p.id
                                ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500'
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`font-semibold text-[14px] mb-1 ${selectedPerspective === p.id ? 'text-blue-900' : 'text-gray-800'}`}>
                              {p.label}
                            </div>
                            <div className={`text-[11px] leading-snug mb-2 ${selectedPerspective === p.id ? 'text-blue-700/80' : 'text-gray-500'}`}>
                              {p.description}
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium border-t border-gray-100 pt-1.5 mt-auto w-full">
                              Detected from: {p.supportingSignals.join(", ")}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Business View Selector (Dynamic based on Perspective) */}
                  {selectedPerspective && activeBusinessViews.length > 0 && (
                    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500 mt-2">
                      <div>
                        <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Business Views</h3>
                        <p className="text-[13px] text-gray-500">How should LightBI interpret this business process?</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {!activeBusinessViews || activeBusinessViews.length === 0 ? (
                          <div className="col-span-1 md:col-span-2 p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                            <p className="text-sm text-gray-500">No reliable business views found for this perspective.</p>
                          </div>
                        ) : (
                          activeBusinessViews.map((v: any) => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedBusinessView(v.id)}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                selectedBusinessView === v.id
                                  ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                                  : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`font-semibold text-[14px] mb-1 ${selectedBusinessView === v.id ? 'text-indigo-900' : 'text-gray-800'}`}>
                                {v.label}
                              </div>
                              <div className={`text-[11px] leading-snug mb-2 ${selectedBusinessView === v.id ? 'text-indigo-700/80' : 'text-gray-500'}`}>
                                {v.description}
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium border-t border-gray-100 pt-1.5 mt-auto">
                                Confidence: {v.confidenceScore}% | Reqs met: {v.matchedRequiredSignals.length}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  </>
                  )}

                </div>
              )}

              {/* Inline Pending Local Batch Inspection Card */}
              {pendingLocalBatch && (
                <div className="w-full rounded-xl border border-black/10 bg-white p-4 shadow-sm animate-in fade-in zoom-in-95 flex flex-col gap-4 relative overflow-hidden">
                  {pendingLocalBatch.status === "reading" && (
                    <div className="absolute top-0 left-0 h-1 bg-blue-500 w-full animate-pulse" />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                        {pendingLocalBatch.status === "reading" ? (
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        ) : pendingLocalBatch.status === "error" ? (
                          <div className="w-5 h-5 text-red-500 flex items-center justify-center font-bold">!</div>
                        ) : (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold text-[#202123]">
                          {pendingLocalBatch.isRestored ? "Choose dataset group" :
                           pendingLocalBatch.status === "reading" ? `Inspecting ${pendingLocalBatch.files.length} files...` :
                           pendingLocalBatch.status === "error" ? "Inspection failed" : `${pendingLocalBatch.results.filter((item: any) => item?.status === "accessible").length} file${pendingLocalBatch.results.filter((item: any) => item?.status === "accessible").length === 1 ? '' : 's'} ready`}
                        </h3>
                        {!pendingLocalBatch.isRestored && pendingLocalBatch.files.length > 0 && (
                          <p className="truncate text-[12px] text-black/45">
                            {pendingLocalBatch.files.length === 1 ? pendingLocalBatch.files[0].name : `${pendingLocalBatch.files[0].name} and ${pendingLocalBatch.files.length - 1} more`}
                          </p>
                        )}
                      </div>
                    </div>
                    {pendingLocalBatch.status === "reading" && (
                      <button onClick={handleCancelInspection} className="text-[12px] text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 border border-gray-200 rounded-md transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>

                  {pendingLocalBatch.status === "reading" && (
                    <div className="text-[13px] text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p>Large files may take a moment. You can cancel and keep your current dataset.</p>
                    </div>
                  )}

                  {pendingLocalBatch.status === "error" && (
                    <div className="text-[13px] text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-center gap-4">
                      <div>
                        <p className="font-medium">Failed to read the selected files.</p>
                        {pendingLocalBatch.results.filter((item: any) => item && item.status !== "accessible").map((item: any, index: number) => (
                          <p key={`${item.label ?? "file"}-${index}`} className="mt-1 break-words">
                            {item.label ?? pendingLocalBatch.files[index]?.name ?? "File"}: {item.message}
                          </p>
                        ))}
                      </div>
                      <button onClick={handleCancelInspection} className="px-3 py-1.5 bg-white text-red-700 border border-red-200 rounded-md shadow-sm font-medium hover:bg-red-50 transition-colors">Dismiss</button>
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && pendingLocalBatch.results.some((item: any) => item?.status !== "accessible") && (
                    <div className="text-[13px] text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <p className="font-medium">Some files were skipped; valid files remain available.</p>
                      {pendingLocalBatch.results.map((item: any, index: number) => item?.status === "accessible" ? null : (
                        <p key={`${item?.label ?? pendingLocalBatch.files[index]?.name ?? "file"}-${index}`} className="mt-1 break-words">
                          {item?.label ?? pendingLocalBatch.files[index]?.name ?? "File"}: {item?.message ?? "Could not inspect this file."}
                        </p>
                      ))}
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && pendingLocalBatch.businessOverview && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 mb-4">
                      <BusinessFusionOpportunityCard
                        overview={pendingLocalBatch.businessOverview}
                      />
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && multiSourceReviewSources.length > 1 && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 mb-4">
                      <CanonicalMultiSourceReview
                        sources={multiSourceReviewSources}
                        drafts={multiSourceDrafts}
                        onChange={(key, value) => setMultiSourceDrafts((current: any) => ({ ...current, [key]: value }))}
                        onBuild={() => { void handleBuildCanonicalMultiSource(); }}
                        building={multiSourceBuilding}
                        relationshipState={multiSourceBuildResult.relationshipState}
                        blockers={multiSourceBuildResult.blockers}
                      />
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && pendingLocalBatch.step === "family_selection" && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-3 border-t border-gray-100 pt-3">

                      <div className="flex flex-col gap-2">
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-black/40">
                          {pendingLocalBatch.families.length} dataset group{pendingLocalBatch.families.length === 1 ? '' : 's'} found
                        </label>

                        {pendingLocalBatch.families.length > 1 && !pendingLocalBatch.isRestored && (
                          <div className="text-[13px] text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-2">
                            Files use different schemas and will be analyzed separately. Please select a dataset group to use.
                          </div>
                        )}
                        {pendingLocalBatch.isRestored && (
                          <div className="text-[13px] text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200 mb-2">
                            These groups come from your last inspected files. No files will be re-read.
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          {pendingLocalBatch.families.map((fam: any) => (
                            <div
                              key={fam.id}
                              onClick={() => setPendingLocalBatch({ ...pendingLocalBatch, selectedFamilyId: fam.id })}
                              className={`cursor-pointer rounded-lg border p-3 transition-colors ${pendingLocalBatch.selectedFamilyId === fam.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${pendingLocalBatch.selectedFamilyId === fam.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}`}>
                                  {pendingLocalBatch.selectedFamilyId === fam.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center justify-between gap-3">
                                    <h4 className="truncate text-[13px] font-semibold text-[#202123]">{fam.name}</h4>
                                    <span className="shrink-0 text-[11px] text-black/45">{fam.files.length} file{fam.files.length === 1 ? '' : 's'}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-black/50">
                                    <span>{formatValue(fam.totalRows, 'number', preferences, { compact: true })} rows</span>
                                    <span>{formatValue(fam.columns.length, 'number', preferences, { compact: true })} columns</span>
                                    {fam.files.length > 1 && <span className="text-emerald-600 flex items-center gap-1"><span className="text-emerald-500">✓</span> Compatible for append</span>}
                                  </div>
                                  <div className="mt-1 truncate text-[11px] text-black/35">
                                    {fam.files.map((f: any) => f.file.name).join(', ')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end border-t border-gray-100 pt-3">
                        <button
                          onClick={handleUseLocalDataset}
                          disabled={!pendingLocalBatch.selectedFamilyId && pendingLocalBatch.families.length > 1}
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pendingLocalBatch.families.length === 1 ? 'Use this dataset' : 'Use selected dataset'} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}


              {/* Detected Opportunities – only when currentDataset.status === 'ready' and domains exist */}
              {!datasetUnderstandingNext && currentDataset?.status === 'ready' && currentDataset.columns && currentDataset.columns.length > 0 ? (
                <>
                  <div className="flex flex-col gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                      <button
                        onClick={() => setAnalysisMode("explore")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "explore" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Explore
                      </button>
                      <button
                        onClick={() => setAnalysisMode("investigate")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "investigate" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Investigate
                      </button>
                      <button
                        onClick={() => setAnalysisMode("ask")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "ask" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Ask
                      </button>
                    </div>
                    {guidedInvestigationResult && (
                      <div className="text-[11px] text-gray-400 font-mono mt-1 mb-2 border border-gray-100 p-2 rounded-md bg-gray-50 flex gap-4">
                        <span>Understanding Debug:</span>
                        <span>Signals: {guidedInvestigationResult.signals.signals.length}</span>
                        <span>Perspectives: {guidedInvestigationResult.perspectives.length}</span>
                        <span>Advanced Views: {guidedInvestigationResult.businessViews.length}</span>
                        <span>Optional Questions: {guidedInvestigationResult.questionSuggestions.length}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mb-2">
                      {analysisMode === "explore" && "Dataset First - What is inside this data?"}
                      {analysisMode === "investigate" && "Business View First - What business process is happening?"}
                      {analysisMode === "ask" && "Question First - What do you want to know?"}
                    </div>
                  </div>

                  {analysisMode === "explore" && (
                    (!selectedPerspective && currentDataset?.sourceType !== "virtual_business_view") ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Questions Hidden</h3>
                          <p className="text-xs text-gray-500 max-w-[250px]">Select a perspective to continue.</p>
                        </div>
                      </div>
                    ) : !selectedViewData ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4 animate-in fade-in zoom-in-95">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <Layers className="w-6 h-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Advanced guided views unavailable</h3>
                          <p className="text-xs text-gray-500 max-w-sm mt-1">LightBI understands this dataset and can suggest basic analysis, but no advanced Business View is available yet because required signals are missing.</p>
                          {datasetUnderstanding && datasetUnderstanding.unavailableAnalysis.length > 0 && (
                            <div className="mt-4 text-left w-full bg-red-50/50 p-3 rounded-md border border-red-100/60">
                              <p className="text-[11px] font-semibold text-red-800 mb-1.5 uppercase tracking-wider">Missing required signals</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(Array.from(new Set(datasetUnderstanding.unavailableAnalysis.flatMap((ua: any) => ua.missingSignals))) as string[]).map(sig => (
                                  <span key={sig} className="text-[11px] font-medium bg-white border border-red-200 shadow-sm text-red-600 px-2 py-0.5 rounded-md">{sig}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : visibleQuestionSuggestions.length > 0 ? (
                      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
                          {selectedViewData && (
                            <BusinessViewSummaryCard
                              title={selectedViewData.label || selectedViewData.title}
                              purpose={selectedViewData.description}
                              evidence={selectedViewData.evidence.map((e: any) => e.label || e.message)}
                              relationships={[]} // Auto-relationships not extracted from views yet
                              coverage={{ datasets: 1, businessKeys: selectedViewData.matchedRequiredSignals?.length || 0, views: 1 }}
                              belief={`LightBI believes this data supports the ${selectedViewData.label || selectedViewData.title} business view with ${selectedViewData.confidenceScore || 90}% confidence, matching ${selectedViewData.matchedRequiredSignals?.length || 0} required signals.`}
                            />
                          )}

                          <div className="w-full p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm flex flex-col gap-5">
                            <div>
                              <h3 className="text-[15px] font-semibold text-blue-900 mb-1 flex items-center">
                                <Code className="w-4 h-4 mr-2 text-blue-600" />
                                What can I learn from this data?
                              </h3>
                              <p className="text-[13px] text-blue-700/80 mb-4">
                                LightBI generated these questions based on the {selectedViewData?.label || selectedViewData?.title || selectedPerspective} context.
                              </p>
                            </div>

                          <div className="flex flex-col gap-3">
                            <h4 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">{selectedViewData?.label || selectedViewData?.title || selectedPerspective} Questions</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {visibleQuestionSuggestions.map((suggestion: any, idx: number) => (
                                <div key={idx} className="bg-white border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors flex flex-col justify-between shadow-sm">
                                  {currentDataset?.sourceType === "virtual_business_view" ? (
                                    <div className="mb-3 w-full text-left">
                                      <span className="text-[14px] text-blue-900 font-medium leading-snug">{suggestion.text}</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleLegacyQuestionSuggestion(suggestion)}
                                      className="w-full text-left flex items-start justify-between group mb-3"
                                    >
                                      <span className="text-[14px] text-blue-900 font-medium leading-snug pr-4">{suggestion.text}</span>
                                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 mt-0.5 shrink-0" />
                                    </button>
                                  )}

                                  <div className="flex flex-col gap-2 mt-auto">
                                    <div className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1">
                                      <span>Detected from:</span>
                                      {suggestion.evidenceSignals.join(", ")}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                        suggestion.confidenceScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                        suggestion.confidenceScore >= 50 ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        Question Match: {suggestion.confidenceScore >= 80 ? 'Strong Signal' : suggestion.confidenceScore >= 50 ? 'Moderate Signal' : 'Weak Signal'}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold border border-indigo-100">
                                        Source: Domain Catalog
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mt-4">
                        <p className="text-sm text-gray-500">No reliable questions found for this Business View.</p>
                      </div>
                    )
                  )}

                  {analysisMode === "investigate" && (
                    !selectedViewData ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <Layers className="w-6 h-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Workspace Locked</h3>
                          <p className="text-xs text-gray-500 max-w-[250px]">Select a Perspective and Business View above to inspect relationships.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <Layers className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <h3 className="text-[16px] font-semibold text-gray-900">Business View Inspector</h3>
                            <p className="text-[13px] text-gray-500">Inspecting: {selectedViewData.label || selectedViewData.title}</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                          <div>
                            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Purpose</h4>
                            <p className="text-[14px] text-slate-800">{selectedViewData.description}</p>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Evidence</h4>
                              <ul className="space-y-1">
                                {selectedViewData.evidence.map((ev: any, i: number) => (
                                  <li key={i} className="text-[13px] text-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    {ev.label || ev.message}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {analysisMode === "ask" && (
                    <div className="w-full p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
                      {selectedPerspective && (
                        <div className="flex gap-2 mb-2">
                          <span className="text-[10px] px-2 py-1 bg-purple-100 text-purple-800 font-semibold uppercase tracking-wider rounded">Detected Perspective: {selectedPerspective}</span>
                          {selectedViewData && (
                            <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-800 font-semibold uppercase tracking-wider rounded">Detected View: {selectedViewData.label || selectedViewData.title}</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Ask anything about this dataset</h3>
                          <p className="text-xs text-gray-500">AI will generate an analysis plan based on the chosen perspective.</p>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm min-h-[100px] resize-none"
                          placeholder="e.g. Can you show me the delivery status trend over time grouped by route?"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
                          Clear
                        </button>
                        <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Generate plan
                        </button>
                      </div>
                    </div>
                  )}

                </>
              ) : (
                currentDataset?.status === 'ready' && !datasetUnderstandingNext && (
                  <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                    <p className="text-sm text-amber-800 flex items-center">
                      <Search className="w-4 h-4 mr-2" />
                      No columns detected. Cannot suggest analysis capabilities.
                    </p>
                  </div>
                )
              )}


              {currentDataset?.status !== 'ready' && (
                <div className="hidden">
                  {/* Legacy suggested actions kept dormant until wired to real saved work. */}
                    <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-4">{homeGuidance.sections.suggestedActions}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {homeGuidance.homeStates.noData.actions.map(a => ({ id: "", label: a })).map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (action.id && homeGuidance.actionPreviews[action.id as keyof typeof homeGuidance.actionPreviews]) {
                              setPreviewActionId(previewActionId === action.id ? null : action.id);
                            } else {
                              askQuestion(action.label);
                            }
                          }}
                          className={`p-4 bg-white border rounded-xl text-left transition-all group flex items-center justify-between shadow-sm ${previewActionId === action.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
                        >
                          <span className="text-[14px] font-medium text-gray-800 group-hover:text-emerald-600 transition-colors">{action.label}</span>
                          <ChevronRight className={`w-4 h-4 text-gray-300 transition-all ${previewActionId === action.id ? 'text-emerald-500 translate-x-0 opacity-100' : 'opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`} />
                        </button>
                      ))}
                    </div>

                    {/* Action Preview Panel */}
                    <AnimatePresence>
                      {previewActionId && homeGuidance.actionPreviews[previewActionId as keyof typeof homeGuidance.actionPreviews] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-4">
                            {(() => {
                              const preview = homeGuidance.actionPreviews[previewActionId as keyof typeof homeGuidance.actionPreviews];
                              const actionLabel = "Ask Question";
                              return (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Question</div>
                                      <div className="text-[13px] text-gray-900 font-medium leading-snug">{preview.question}</div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Using</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {preview.using.map((field, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded text-[11px]">{field}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Expected Output</div>
                                      <div className="text-[13px] text-gray-600 leading-snug">{preview.expectedOutput}</div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-200">
                                    <button
                                      onClick={() => setPreviewActionId(null)}
                                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        setPreviewActionId(null);
                                        askQuestion(actionLabel);
                                      }}
                                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors flex items-center shadow-sm"
                                    >
                                      {preview.primaryAction} <ChevronRight className="w-4 h-4 ml-1" />
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
              )}
            </div>

            {/* Sidebar */}
            {currentDataset?.status === 'ready' && (
            <div className="lg:col-span-1 flex flex-col gap-6">
              {currentDataset?.status === 'ready' && (
              <div className="bg-white border border-transparent rounded-xl p-6 shadow-sm flex flex-col h-full">
                <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-5 flex items-center">
                  <Search className="w-4 h-4 mr-2 text-gray-400" /> {homeGuidance.recentInsights.title}
                </h3>
                {homeGuidance.recentInsights.items.length > 0 ? (
                  <>
                    <div className="flex flex-col gap-4">
                      {homeGuidance.recentInsights.items.map((insight) => (
                        <div key={insight.id} className="flex flex-col gap-1 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <span className="text-[13px] font-semibold text-gray-900">{insight.title}</span>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap ml-2">{insight.timestamp}</span>
                          </div>
                          <p className="text-[13px] text-gray-500 leading-relaxed">{insight.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-gray-100 text-center">
                      <button className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                        {homeGuidance.recentInsights.viewHistoryAction}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center h-full opacity-60">
                    <p className="text-[13px] font-medium text-gray-900 mb-2">
                      {currentDataset ? homeGuidance.homeStates.dataLoaded.recentInsightsEmpty.title : homeGuidance.homeStates.noData.recentInsightsEmpty.title}
                    </p>
                    <p className="text-[12px] text-gray-500 max-w-[200px] leading-relaxed">
                      {currentDataset ? homeGuidance.homeStates.dataLoaded.recentInsightsEmpty.message : homeGuidance.homeStates.noData.recentInsightsEmpty.message}
                    </p>
                  </div>
                )}
              </div>
              )}
            </div>
            )}

          </div>
        )}

        {isAsking && (
          <div className="mt-16 flex flex-col items-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm">Analyzing data and generating insights...</p>
          </div>
        )}

        {result && !isAsking && (
          <HomeResultView
            result={result}
            chartOption={getEChartsOption(result.chart)}
            onFollowUp={suggestion => {
              if (suggestion.startsWith('Compare') || suggestion.startsWith('Explain')) askQuestion(suggestion);
            }}
          />
        )}
      </div>


      <HomePlanningDialogs workflow={planningWorkflow} />

      {isDataPreviewOpen && currentDataset?.status === 'ready' && (
        <HomeDataPreviewDialog dataset={currentDataset} rows={canonicalRows} onClose={() => setIsDataPreviewOpen(false)} />
      )}

    </div>
  );
};
