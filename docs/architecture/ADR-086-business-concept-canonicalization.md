# ADR 086: Business Concept Canonicalization

## Status
Accepted

## Context
Dataset columns contain labels that are highly variable, language-dependent, and culturally localized. For example, the concept of a "Driver" might appear in datasets as:
- Driver
- Shipper
- Delivery Agent
- Courier
- Nhân viên giao hàng
- Tài xế

If the Question Engine attempts to generate logic based on these raw labels, it results in an explosion of edge cases and brittle template matching. The Question Engine needs a standardized vocabulary.

## Decision
We enforce **Business Concept Canonicalization**.

1. **Column Labels are Aliases:** Raw dataset column names are treated strictly as aliases. They are evidence used by detectors, but they are not the concept itself.
2. **Canonical Mapping:** All aliases MUST map to a single, canonical, English-based identifier within the `BusinessSignal`.
   - `Driver`, `Shipper`, `Nhân viên giao hàng` -> `driver`
   - `Route`, `Zone`, `Khu vực phát` -> `route`
3. **No Labels in Engine Logic:** The Question Engine must operate entirely on canonical concepts (`driver`, `route`). It must never evaluate conditional logic based on display labels.
4. **Display Consistency:** When interpolating questions for the user, the engine will use the canonical identity (or its localized canonical translation) rather than the raw dataset column name to maintain a professional, standardized UI.

## Consequences
- **Positive:** Simplifies all downstream logic (Perspectives, Business Views, Questions) since they only need to account for canonical IDs.
- **Positive:** Enables multilingual support out-of-the-box, as localized column names all collapse into the same canonical signal.
- **Negative:** Requires a robust alias dictionary or NLP detection mechanism during the Business Signal Detection phase to accurately map diverse labels to their canonical forms.
