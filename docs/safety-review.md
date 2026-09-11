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
| Navigation lights | Check recognition and collision-response wording against navigation training and regulations. A pair has no spare dedicated lookout. |
| Hatches / stowage | Supply actual hatch contents, load/trim plan and access for one capable rower. Prior example bow/day/aft contents and emptying order are withdrawn rather than represented as verified boat details. |
| Essential kit locations | Supply exact reachable locations for pump, tools, medical kit, repair kit, spare oars/gates, grab bag and beacons. The app's general access sentence is not a completed location map. |
| Checklists / grab bag | Match contents to the actual equipment/medical requirements and accessibility plan. Existing lists are not a complete mandatory inventory. |
| Event reminders | Manual prompts only; no boat sensors are connected. Do not infer automatic incident detection from the UI. |

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
