# Safety content review — contributor record

**Status: beta; unresolved review work remains. Updated 11 September 2026.**

This document records safety review commentary removed from the app at the crew's
request. It is for contributors and the crew's preparation process: **do not import
it into app screens, read-aloud text, the service-worker precache or the native build**.
Removing commentary is not approval, certification or evidence that a procedure
has been validated for the boat. Do not describe the app's instructions that way.

## What changed in v9

- Removed repeated approval/beta disclaimers and the **Reference / preparation notes**
  disclosures from Home, Wiki, Checklists and Reminders. Source links and voice settings
  remain available without review commentary.
- Retained facts that directly change an action: one casualty leaves **ONE rescuer**,
  the casualty may be unable to help, distress calls must state actual numbers aboard/in
  the water, and radio/beacon controls depend on the equipment model.
- MOB now gives short orientation and distress-communications prompts, including an
  offline Mayday link. The withdrawn generic recovery sequence has **not** been reinstated.
  No boat-handling, lifting, hauling or equipment-activation sequence was invented.
- Removed placeholder equipment locations and assumed hatch contents/emptying order.
  `hatch` now presents the documented cabin-hatch closure rule and the instruction to
  use the boat's stowage plan. `tools` now contains general kit-access housekeeping,
  not purported locations. Stable IDs are retained.
- Existing crew edits, including older MOB text and locally filled equipment locations,
  are preserved. Neither updates nor rendering silently scrub, replace or certify them.
- Audited the shared Wiki Read aloud handler after a live-v8 Stargazing report: v8
  prepended the global safety notice even to morale pages. Pending v9 speaks only the
  title, action-critical conditions when applicable, and body. Exact-output regressions
  cover every built-in/official Wiki article, including `stars`, plus saved crew prose
  containing review/approval words. This is not a keyword-stripping workaround.
- Official PDF bytes and the 11 extracted page bodies remain unchanged. Only the app's
  surrounding editorial introduction/summary was shortened.

## Approval and preparation record moved out of the UI

The former app notice described the content as an unapproved prototype aide-memoire,
not an emergency procedure. Its substantive preparation requirements remain here:

1. Crew and safety/medical advisers must review the actual boat, equipment and training
   before relying on the content at sea.
2. Two crew do not create three operational roles. If one person is a casualty, there is
   one rescuer/caregiver to handle boat safety, communications and recovery.
3. Do not assume the casualty can activate equipment, follow instructions or help with
   recovery. Include both responsive and incapacitated casualties in rehearsal.
4. Record the boat-specific method, equipment locations, training source, reviewer and
   review date. These are outstanding preparation records, not emergency instructions.
5. Race requirements are not a recovery manual. An app update, checklist tick, crew note
   or beta label is not safety approval.

### Topic review checklist

All rows below remain **open** unless the crew supplies and records a completed review.
Public reference checks alone do not close them.

| Topic | Required preparation / unresolved information |
|---|---|
| MOB | Document and practise actual single-rescuer recovery with the real boat and equipment. Resolve how one person prioritises casualty location, boat handling, distress communications and recovery. Review responsive/unconscious casualty cases and the safety of any reach/lift. Audit old crew overrides for the withdrawn generic sequence. |
| EPIRB / PLB | Confirm model manuals, bracket/grab-bag locations, activation, antenna deployment, indicators, flotation and mounting requirements. Verify reach/access for a single capable rower. Different beacons do not share a universal button sequence or in-water operating method. |
| VHF / DSC | Verify radio model controls, hold times, valid position input and MMSI/call sign. Rehearse actual crew/casualty reporting. The app no longer claims one universal five-second press or guaranteed automatic position transmission. |
| Anchor / para-anchor / drogue | Validate actual equipment, designated attachment points, deployment conditions and method. Separate tasks possible with both crew capable from tasks possible with one. The legacy technical sequence has not been independently validated here. |
| Life raft | Review manufacturer instructions and abandonment plan, including painter handling, safe boarding and an incapacitated second rower. No third person is available for kit handling. |
| Hull repair / epoxy | Verify resin system, mixing ratios/times, temperature/cure requirements, repair limits and safe access. Resolve watchkeeping/communications with one person occupied. Legacy repair details remain unvalidated for the actual boat. |
| First aid | Medical adviser review required for treatment/escalation wording, including bleeding, hypothermia, heat illness and seasickness. One patient leaves one caregiver with boat responsibilities. This change did not medically validate the legacy treatment lines. |
| Blisters / wounds | Medical adviser must review treatment and infection escalation, especially the legacy blister-puncture wording. |
| Breathwork | Review suitability after incidents, dizziness and attention/watchkeeping. Read-aloud does not pace breathing intervals. Exercises belong to safe rest, not active incident handling or watchkeeping. |
| Knot guide | Have the crew and a qualified instructor check all fourteen supplied animations, instructions, intended uses and limitations against the actual ropes, fittings and training. Confirm the boat-specific methods for mooring, towing, sea anchors and personal-safety connections; the generic illustrations are not approval for those uses. |
| Navigation lights | Check recognition and collision-response wording against navigation training and regulations. A pair has no spare dedicated lookout. |
| Hatches / stowage | Supply actual hatch contents, load/trim plan and access for one capable rower. Prior example bow/day/aft contents and emptying order are withdrawn rather than represented as verified boat details. |
| Essential kit locations | Supply exact reachable locations for pump, tools, medical kit, repair kit, spare oars/gates, grab bag and beacons. The app's general access sentence is not a completed location map. |
| Checklists / grab bag | Match contents to the actual equipment/medical requirements and accessibility plan. Existing lists are not a complete mandatory inventory. |
| Event reminders | Manual prompts only; no boat sensors are connected. Do not infer automatic incident detection from the UI. |
| Water maker (v29) | Crew selected the Call Summary as primary rowing guidance, with compatible manual gap-filling. Confirm installed voltage, positively identified reset controls, emergency-set compatibility, exact preservative product/dose and drinking-water acceptance protocol. Source selection is not equipment-specific review or technical approval. |

## Water maker source record - 11 November 2026

The five v29 Wiki pages in `js/data/watermaker-guide.js` are original factual summaries,
not copied manual chapters or a reproduction of private training material:

- Manufacturer [ZEN 30 manual, 30Z12/24.B.2021](https://cruiserservices.com/wp-content/uploads/2025/01/MANUAL-ZEN30-12_24V-TRASD-ENG.pdf):
  44 physical PDF pages. Printed page numbers are one lower than PDF page numbers.
  Supply/model/output: PDF pp.11-12; controller/first start/daily operation: pp.30-33;
  reset: pp.33-35; filters: pp.36-37; preservation/winterizing: pp.37-41;
  fault table: p.43; cruising spares: p.44.
- [Mactra Ocean Rowers Access Page](https://www.mactramarine.co.uk/ocean-rowers-access-page):
  its written race-spares section specifies the emergency pump set with relay card and
  pressure switch, SC1 and a 5-micron, 5-inch cartridge for ZEN/Smart 30. The page was
  accessed with crew-supplied authorization; no access secret is stored in this repository.
  The two ZEN videos have not been independently transcribed or verified.
- The crew supplied an imperfect 514-line training-call transcript on 11 November 2026.
  It includes demonstrations of multiple installations, ambiguous "this/that" gestures,
  unrelated personal conversation and apparent transcription errors. Only concise
  equipment-related summaries are used. The raw call and personal anecdotes are not bundled.
- The crew subsequently supplied the speaker's 76-line summary of the same call.
  Its listed call timestamps help locate the subjects but are not independently checked
  video timestamps. It is secondary evidence, not independent technical confirmation.

The call supports rowing-specific advice on charging/weather-aware planning, avoiding
pollution, near-surface air ingestion, loose filter seals, complete emergency-set
preparation, a hand-maker's brine discharge being separate from a bucket feed, and planning
preservation at the finish. It does not settle this boat's final plumbing layout.

**User-directed source order:** on 11 November the crew asked, "Can you use the Call Summary
as the definitive guidance and just use the manual to fill in any blanks?" The guide now
uses that precedence for the simpler rowing controller and unpressurised collection
arrangement described by the crew. This is a publishing/content decision, not a claim that
the summary has been independently certified. Compatible manufacturer details fill gaps;
yacht-only button controls, LED fault codes and automatic-flushing routines are excluded.

**Differences and remaining limits:**

- Shutdown: the call repeatedly says "on the clunk"; manual section 5.3.1 (PDF p.32)
  explicitly says avoid the beat and wait about one second. Per the crew's direction,
  the daily rowing instructions select the summary's stop-on-clunk method; the difference
  remains recorded on the sources page rather than as a competing daily routine.
- Flushing: the manual's recommended automatic flush assumes a freshwater pressure supply,
  carbon filter and flushing circuit. No "never flush during the crossing" rule is established
  by the supplied call. The app does not infer a universal no-flushing rule; it omits the
  yacht automatic cycle from the simple-controller routine. A pressurised flushing inlet
  is distinct from product-water collection.
- Preservation: the call recommends doing it at the finish and describes reduced-volume,
  once-through treatment. Manual section 6.5 describes roughly 15 litres and 20 minutes'
  recirculation. The rowing guide selects the summary's once-through method, with the
  depressurization control slightly open. It reports the summary's quantities only with
  the condition that the exact demonstrated product/pack and current label dosage match.
  There is no universal half-bottle SC1 recipe. Keep chemical solution out of drinking storage.
- The call describes about 3 bar accumulator charge; the manual describes about 4 bar.
  Neither is used as an app adjustment instruction. The daily guide now uses the summary's
  approximate 6-8 bar working range, with explicit stop conditions for abnormal behaviour.
- The call's 12 V minimum and voltage examples cannot be transferred to 24 V equipment.
  Its pressure-switch/relay arrangement may not implement the manual's transducer alarms.
- The summary's reset table says close depressurization, leave reset open and then close
  reset gradually. This appears to reverse the controls described in the call's restart/
  air-purge demonstration. Manual section 5.4 closes reset before restart (PDF p.35).
  No summary-derived valve sequence is adopted; the app highlights the discrepancy.
- The summary's "pump and motor in separate compartments" is not adopted: the call
  distinguishes the hydraulic water-maker unit from the electric pump/motor assembly.
  Likewise the 5-micron cartridge protects the membrane; the intake mesh protects the pump.
- Neither source establishes a numerical product-water acceptance threshold or universal
  discard time. The call's suggestion of diluting initial salty water is not adopted.

Safety-control bypasses, pressure-switch adjustment, filter/accumulator bypasses,
live wiring demonstrations, open-flame hose work and experimental plastic repairs are
not converted into self-service checklists. Reset is a referral to the illustrated,
trained method, not an invented mapping of gesture-dependent transcript instructions.
Filter opening retains isolation/depressurization, seal care and subsequent air purge.
The rowing preservation overview follows the summary with chemical-label safeguards;
cold storage remains a referral to the full manufacturer procedure.

The public manual explicitly restricts copying/reuse. The app links to it online rather
than redistributing its bytes or diagrams; protected videos and passwords are not shipped.
Crew edits remain editable and survive upgrades; reset/export/import retain existing behavior.
This source record does not close the water-maker review.

## Sources and verification limits

Checked on **11 September 2026**:

- [RYA — Man overboard](https://www.rya.org.uk/water-safety/cold-water-shock-safety/man-overboard/):
  general reference on casualty capability, recovery difficulty and preparation. Its
  technical recovery material is not adopted as a boat-specific single-rescuer sequence.
- [Andy du Port — VHF Mayday / Pan-Pan](https://www.yachtingmonthly.com/sailing-skills/how-to-make-a-vhf-radio-mayday-call-pan-pan-call-81832):
  distress/urgency criteria and voice-call structure. It does not establish this boat's
  radio controls, equipment configuration or range.
- The crew-provided **Atlantic 2025 v1.0 race rules**, PDF page 2, contain the cabin-hatch
  closure rule and jackstay/harness requirements. These are attributed race requirements,
  not a bespoke recovery sequence.

The crew-supplied **ocean-rowing-knots.html** now replaces the previous six-knot
photographic guide; its pictures and credits have been removed. The fourteen supplied
animations and tying instructions retain their original geometry. Usage text and tips
have been qualified, and every knot has an explicit caution: the illustrations do not
approve rescue loops, towing/sea-anchor attachments, jackstay clip-in points or personal
support. The locked cleat-hitch finish is explicitly excluded where rapid release is
needed. Friction-hitch grip and extra turns are not presented as guarantees.
No independent instructor or crew approval of this replacement is established.
The earlier photograph comparisons do not validate these animations or close the review.

Other legacy reference links are topic sources, not evidence that every instruction was
checked or approved. If technical source verification is unavailable, leave the unresolved
work here; do not fill it with imagined manoeuvres, activation details or stowage locations.

### Race-reference metadata and caveats formerly displayed in-app

- The crew must confirm **Atlantic 2025 v1.0** is the appropriate edition for the crossing;
  it has not been verified as current.
- The unchanged PDF is authoritative over convenience extracts. Text extraction can lose
  formatting, including tables.
- Page links use one-based PDF page numbers. Some viewers ignore `#page=` and require
  manual page selection.
- Referenced appendices, including mandatory equipment and medical-kit lists, are not
  bundled separately. Obtain the applicable supporting documents and Crisis Ops material
  from the organiser.
- Preserve Atlantic Campaigns' copyright. Verify distribution rights before sharing the
  crew reference beyond its intended audience.

## Before accepting a future safety-content change

- [ ] Record the actual boat/equipment and a traceable source.
- [ ] Review one-capable-rower and incapacitated-casualty cases.
- [ ] Remove assumptions requiring extra crew or simultaneous impossible tasks.
- [ ] Have the appropriate crew/safety/medical reviewer assess the technical content.
- [ ] Preserve saved user-authored notes unless the user explicitly edits/resets them.
- [ ] Keep review/status/source-verification prose in this document, not operational UI.
- [ ] Retain action-critical conditions in both visible instructions and read-aloud.
- [ ] Keep original race PDF/extracts immutable unless separately authorised.
- [ ] Test phone layouts, offline use and the corresponding regression suite.

This repository record replaces the removed commentary; it does not resolve the open
items or change their approval status.
