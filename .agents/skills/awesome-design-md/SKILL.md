---
name: awesome-design-md
description: Use the VoltAgent Awesome DESIGN.md reference collection for AURA interface, landing-page, component and motion-design work. Activate when asked to use awesome-design-md, a DESIGN.md reference, Oura or Framer styling, or to change AURA's visual design. Read the project's DESIGN.md first and adapt reference principles to AURA's existing brand.
---

# Awesome DESIGN.md for AURA

This is a project-local skill wrapping the design-document collection at
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md).
The upstream repository provides DESIGN.md analyses rather than an installable
SKILL.md. This wrapper makes selected references available to the AURA agent.

## Workflow

1. Read the project-root [DESIGN.md](../../../DESIGN.md) for the current AURA
   brief, palette, typography, product language, layout and motion rules.
2. For warm product presentation, editorial hierarchy, whitespace and imagery,
   read the relevant sections of [Oura](references/oura-DESIGN.md).
3. For expressive display type, component hierarchy and responsive composition,
   read the relevant sections of [Framer](references/framer-DESIGN.md).
4. Use the selected guide's layout and component principles while keeping
   AURA's own tokens. AURA's DESIGN.md and the user's current request take
   precedence over brand-specific prescriptions in upstream references.
5. Implement only the requested change. Match the existing page and interactions
   unless a redesign is requested. The references are authoring material, not
   client-side dependencies or instructions to add unrelated application flows.
6. For runtime changes, run the repository's appropriate checks and follow its
   supported preview/publishing workflow. For documentation-only changes,
   verify links and source provenance without rebuilding the site.

## Adaptation rules

- **Oura:** borrow the warm paper canvas, calm editorial rhythm, product-led
  storytelling and restrained use of emphasis. AURA keeps its plum/lime palette,
  SVG lamp identity, Manrope and Playfair typography.
- **Framer:** borrow deliberate display scale, clear component variants and
  responsive composition. AURA keeps its cream theme and existing outlines;
  Framer's dark-only palette is not a requirement for this project.
- These upstream files describe visual design. They do not install Framer,
  provide an animation runtime or supply executable motion presets. Use the
  existing AURA motion rules in DESIGN.md for animation work.
- Preserve AURA's Russian copy with the consistent form of address «вы», the
  English decorative captions and the sourced motivational philosophy quotes.
- Distinguish the selectable **body finish** from the **light color**. Preserve
  the product's main idea: light that adapts to the visitor and creates comfort.
- Use original AURA artwork and properly licensed local fonts. Treat third-party
  brand analyses as references, not official endorsements or branding to copy.

## Other references

The [catalog](references/catalog.md) links to all 84 guides at the pinned
upstream commit. If a different direction is requested, select a relevant entry
and read its DESIGN.md before applying it. Avoid loading the entire collection.

The original [README](references/upstream-README.md), [MIT license](references/LICENSE)
and [source manifest](references/SOURCES.json) are included. Source documents are
vendored verbatim. Refresh them only when asked to update the collection; keep
the license and provenance manifest alongside replacements.
