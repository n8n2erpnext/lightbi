# Question Context Model

The Question Context is the formal boundary between the user's messy, natural language intent and the highly rigid, mechanical Recipe Engine.

## The Context Boundary

When a user asks:
> "What are my total sales?"

The raw string is dangerous to parse directly. Instead, the `ContextResolver` builds a `QuestionContext` payload:

```json
{
  "question_text": "What are my total sales?",
  "business_intent": "Summation Analysis",
  "perspective": {
    "id": "persp_regional_mgr",
    "name": "Regional Manager",
    "dataset_links": ["ds_sales_us_west"],
    "semantic_links": ["sem_revenue_usd"]
  }
}
```

## Consequences
- The Recipe Engine and Planner never need to know who the user is or what their permissions are. They simply receive a locked-down `QuestionContext` containing pre-filtered arrays of allowed datasets and semantic dimensions.
- This creates perfectly deterministic sandboxes for AI pipelines, drastically reducing hallucinations.
