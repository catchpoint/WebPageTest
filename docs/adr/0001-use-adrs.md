# Use ADRs
📆 **Updated**: June 15, 2022

🙋🏽‍♀️ **Status** Accepted

## ℹ️ Context
There are some specific goals that we have for WebPageTest to ensure that key decisions are made with care, and communicated transparently:

- We want to make sure that we've thought carefully about architectural decisions, considered alternatives, and arrived at a decision the team agrees is best for the product and community.
- We want to be as transparent as possible in our decision-making process.
- We want contributors, both external and internal, to be able to have a strong understanding of why certain architectural decisions were made.
- We want to leave a trail of docoumentation for ourselves so that we can revisit our decisions to see why they were made and if they still make sense.

## 🤔 Decision
We will document our architecure decisions for WebPageTest with an [Architecture Decision Record](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)—structured, relatively lightweight records of architectural decisions.

Our workflow for ADRs will be:

1. A developer creates an ADR document outlining an approach for a particular question/problem, with an initial status of "proposed".
2. The core team reviews the ADR, discussing any concerns/alternatives. We'll update the ADR accordingly to reflect the additional context.
3. Once the core team has reached consensus, we either mark the ADR as "accepted" or "rejected".
4. Should we revisit an ADR at some point and reach a different conclusion, a new ADR should be created with the new context and rationale for the change, referencing the old ADR. Once the new ADR is accepted, the old ADR should have it's status updated to point to the new ADR. The old ADR shouldn't be removed or otherwise modified, however, so we can have our historical record on why decisions were made.

## 🎬 Consequences
- Developers should write an ADR and submit it for review before selecting an approach to an architectural decision.
- We'll have a concrete artifact for us to focus our discussion before finalizing decisions.
- Decisions will be made deliberately, as a group.
- We will have a useful set of documentation by default, providing a persisitent record of why decisions were made.

## 📝 Changelog
- 06/15/2022 Proposed
- 06/15/2022 Added Changelog
- 06/15/2022 Accepted
