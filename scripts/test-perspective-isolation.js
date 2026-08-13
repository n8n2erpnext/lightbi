const fs = require('fs');

// Mock Home.tsx logic for filtering questions
const PerspectiveBusinessViewMap = {
  "operations": [
    { id: "logistics_journey", title: "Logistics Journey", evidence: ["Route", "Driver", "Delivery Status", "Delivery Date"] }
  ],
  "revenue": [
    { id: "revenue_trend", title: "Revenue Trend", evidence: ["Revenue", "Date", "Region"] }
  ],
  "inventory": [
    { id: "inventory_aging", title: "Inventory Aging", evidence: ["SKU", "Warehouse", "Days in Stock"] }
  ],
  "customer": [
    { id: "customer_retention", title: "Customer Retention", evidence: ["Customer", "Order History", "Churn Risk"] }
  ],
  "performance": [
    { id: "operational_performance", title: "Operational Performance", evidence: ["Branch", "KPIs", "Targets"] }
  ]
};

const datasets = {
  "Dataset A (Operations)": [
    { question: "What is the Delayed rate by Delivery Route?" },
    { question: "Which Driver has the highest Delayed rate?" },
    { question: "How does delivery performance change over time?" }
  ],
  "Dataset B (Revenue)": [
    { question: "Which Customers generate the most Revenue?" },
    { question: "What are the top selling Products by Revenue?" },
    { question: "How has Revenue changed over time?" }
  ],
  "Dataset C (Inventory)": [
    { question: "What is the Stock Qty distribution across Warehouses?" },
    { question: "How does Stock Qty change over time?" }
  ],
  "Dataset D (Customer)": [
    { question: "What is the breakdown of Order Count by Segment?" },
    { question: "How does Order Count change over time?" }
  ],
  "Dataset E (Performance)": [
    { question: "What is the breakdown of Achievement Rate by Department?" },
    { question: "How does Achievement Rate change over time?" }
  ]
};

let report = `# Perspective Isolation Validation Report\n\n`;

for (const [datasetName, semanticSuggestions] of Object.entries(datasets)) {
  report += `## ${datasetName}\n\n`;
  report += `| Perspective | Business View | Generated Questions | Pass/Fail |\n`;
  report += `|---|---|---|---|\n`;

  for (const perspective of ["operations", "revenue", "inventory", "customer", "performance"]) {
    const view = PerspectiveBusinessViewMap[perspective][0];
    
    // Simulate Home.tsx logic
    const relevantKeywords = [...view.title.toLowerCase().split(" "), ...view.evidence.map(e => e.toLowerCase())];
    
    let activeQuestions = semanticSuggestions.filter(curr => {
      const text = curr.question.toLowerCase();
      return relevantKeywords.some(kw => text.includes(kw));
    });

    if (activeQuestions.length === 0) {
      activeQuestions = semanticSuggestions; // The fatal fallback!
    }

    const questionText = activeQuestions.map(q => `- ${q.question}`).join("<br>");
    
    let isFail = false;
    let reason = "";
    
    // Check if the questions returned are identical to the native questions of this dataset 
    // even though a different perspective was selected.
    
    let datasetNativePerspective = "";
    if (datasetName.includes("Operations")) datasetNativePerspective = "operations";
    if (datasetName.includes("Revenue")) datasetNativePerspective = "revenue";
    if (datasetName.includes("Inventory")) datasetNativePerspective = "inventory";
    if (datasetName.includes("Customer")) datasetNativePerspective = "customer";
    if (datasetName.includes("Performance")) datasetNativePerspective = "performance";

    if (perspective !== datasetNativePerspective && activeQuestions.length === semanticSuggestions.length) {
       // If the active questions equals the semantic suggestions (i.e. fallback occurred), 
       // it means questions from the native domain leaked into the wrong perspective.
       isFail = true;
    }

    const passFailStr = isFail ? "**FAIL** (Cross-domain Contamination)" : "**PASS**";

    report += `| ${perspective} | ${view.title} | ${questionText} | ${passFailStr} |\n`;
  }
  report += `\n`;
}

fs.writeFileSync('validation_report.md', report);
console.log("Validation complete. Report written to validation_report.md.");
