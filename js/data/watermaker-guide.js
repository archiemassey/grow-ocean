const MANUAL = 'https://cruiserservices.com/wp-content/uploads/2025/01/MANUAL-ZEN30-12_24V-TRASD-ENG.pdf';
const MACTRA = 'https://www.mactramarine.co.uk/ocean-rowers-access-page';

function source(page, sections) {
  return `<p class="ref">Manufacturer: ${sections}, printed page ${page - 1}
    (<a href="${MANUAL}#page=${page}" target="_blank" rel="noopener">PDF page ${page} - online</a>).</p>`;
}

function article(id, title, summary, body) {
  return { id, title, summary, body, category: 'Water maker', priority: 2, voice: true, ref: MACTRA };
}

export const WATERMAKER_ARTICLES = [
  article('watermaker', 'Water maker - Schenker ZEN 30',
    'Ocean-rowing guide: daily use, faults, filters, spares and after the finish.',
    `<p>For the Schenker ZEN 30. Check the installed unit's voltage, controls and plumbing:
      the manufacturer's 12 V and 24 V versions are separate variants, not interchangeable supplies.</p>
    <ul>
      <li><a href="#/wiki/watermaker-run">Daily use and stopping</a></li>
      <li><a href="#/wiki/watermaker-faults">Not making water? Fault checks</a></li>
      <li><a href="#/wiki/watermaker-care">Filters, spares and after the finish</a></li>
      <li><a href="#/wiki/watermaker-sources">Sources and equipment differences</a></li>
    </ul>
    <p><strong>Keep oil, fuel, bleach and chlorinated water out of the membrane circuit.</strong>
      Do not run in visibly polluted water or a suspected algae bloom. Keep the electric pump and controls dry.</p>
    <p><strong>Rowing setup:</strong> this guide follows the supplied Call Summary for the
      simpler pressure-switch/relay controller and collection into an unpressurised container.
      The yacht controller's automatic-flush buttons and flashing fault codes are not part
      of these rowing instructions.</p>
    <p>The <strong>Call Summary is the primary rowing guidance</strong>; manual
      30Z12/24.B.2021 fills gaps only where compatible with this installation.
      An apparent valve-label error in the summary's reset table is not used as an operating
      sequence. The guide text works offline; external manuals and training links need internet.</p>`),

  article('watermaker-run', 'Water maker - daily use',
    'Clean intake, enough power, monitor production, and use the correct shutdown.',
    `<h3>Before starting</h3>
    <ol>
      <li>Plan water production while solar charging is good; consider forecast cloud and your
        drinking-water reserve. For the call's 12 V setup, have <strong>at least 12 volts</strong>
        available before starting; stop if it falls below 12 volts. This is not a
        24 V machine's supply limit.</li>
      <li>Check the sea at the intake for oil, fuel, unusual discolouration or a suspected algae
        bloom. Do not draw that water into the machine.</li>
      <li>Check the intake path is open and submerged, discharge is clear, hoses are secure,
        and filters are fitted. Check the strainer for weed. Do not assume the boat has a
        floodable chamber: the call does not settle this boat's arrangement.</li>
      <li>Keep the pump, wiring and controls dry. Use the valve configuration and starting
        control identified during training for your installed equipment.</li>
    </ol>
    <h3>While making water</h3>
    <p>The Call Summary describes normal working pressure as approximately <strong>6-8 bar</strong>,
      a regular clunk about every <strong>6-7 seconds</strong>, and a small needle movement as
      the hydraulic unit changes direction. Stop if it repeatedly cuts out, does not cycle,
      or rapidly heads towards 9.5-10 bar; do not treat a safety trip as normal operation.</p>
    <p>Inspect for leaks at startup and during the run, including the product-water hose:
      a disconnected outlet can fill the compartment instead of your container.
      Stop for a leak, repeated cut-outs, lost cycling or persistent abnormal pressure.</p>
    <p>Nominal output is 30 litres/hour, within the manual's stated tolerance, at 25 C and
      35,000 ppm seawater salinity. Cold water, supply problems and other conditions change
      output; do not treat that rating as your guaranteed drinking-water supply.</p>
    <p>Run the first output to waste for a minute or two as described in the Call Summary:
      startup water may be salty. This is an initial discard, not a water-quality test.
      <strong>Do not collect initial or suspect product as drinking water until it meets the
      water-quality checks agreed for your boat.</strong> Clear appearance or taste alone
      does not establish safety. Do not dilute salty startup water into a drinking-water
      container to make it seem acceptable. Neither source establishes a numerical acceptance
      threshold or a universal discard time.</p>
    ${source(12, 'section 3.6')}
    <h3>Stopping - rowing procedure</h3>
    <p><strong>Stop on a clunk</strong>, following the Call Summary. With both rowers available,
      have one listen while the other switches the machine off. Do not deliberately stop
      midway between cycles.</p>
    <p>This is the simple-controller rowing procedure, not the yacht manual's automatic
      freshwater-flush shutdown. Do not look for yacht-only ON/OFF or FLUSHING buttons,
      or add an automatic flushing cycle to this routine.</p>
    <h3>Commissioning or after opening the filter circuit</h3>
    <p>Use the practised initial-start/air-purge method: start with the identified
      depressurization control open, clear the air from the filter, then close that
      control and check that normal pressure and cycling return. Keep the intake supplied
      with clean water. Do not guess which control to open from the transcript's gestures.</p>
    <p class="ref">Primary source: Call Summary, On-Water Routine; call references
      05:56 (stop), 15:03 (purge), 18:47 (initial output) and 01:13:11 (battery).
      These are supplied call timestamps, not independently verified video timestamps.</p>`),

  article('watermaker-faults', 'Water maker - fault checks',
    'Separate loss of power, air or a hydraulic stall from electrical-control faults.',
    `<h3>Stop first</h3>
    <p>Stop for a leak, repeated cut-outs or abnormal pressure. Isolate electrical power and
      release pressure using the identified depressurization control before opening a filter,
      disconnecting a hose or working on the unit. Do not loosen a pressurized fitting.</p>
    <h3>The pump is silent</h3>
    <p>A spare pump cannot solve loss of power upstream. Check the water-maker supply,
      dedicated fuse and accessible connections using your trained electrical-check procedure.
      Other boat equipment can still work when the water-maker fuse has failed.
      Live multimeter work and opening the electrical enclosure require the relevant training;
      the call's example battery reading is not a universal pass/fail voltage.</p>
    <h3>Pump runs, but no normal cycling or production</h3>
    <p>The call describes a hydraulic stall or airlock as low-pressure burbling, or a fast rise
      towards 9.5-10 bar followed by a safety stop. These symptoms do not prove a single cause.
      Air at a near-surface intake in rough seas can trigger the same symptoms as a stalled
      hydraulic valve.</p>
    <p>Check intake submersion, air entry, strainer and filter condition.
      A manual reset and air purge may be needed. Use the trained reset with positively
      identified reset valve, positioner and depressurization control; manual section 5.4
      illustrates them. Do not map the transcript's "this" and "that" onto unidentified knobs,
      force a stiff positioner, or repeatedly restart into an overpressure stop.</p>
    <p><strong>The accompanying summary appears to swap the reset and depressurization
      controls during restart.</strong> Do not follow that table as a valve sequence.
      The manual closes the reset valve before restart; the call describes an additional
      air purge with the depressurization control open. Have Mactra identify the controls
      and confirm that sequence for your installation.</p>
    <p>The call cautions against fully removing the plastic-threaded depressurization knob:
      it can lose its seal or cross-thread. Open only as needed for the identified procedure.</p>
    ${source(33, 'section 5.4; illustrations continue on PDF pages 34-35')}
    <h3>Pump chatters or cuts out at working pressure</h3>
    <p>The call identifies a possible pressure-switch or relay-card fault, but the symptoms
      alone are not a diagnosis. Do not adjust the pressure switch to keep the pump running
      or bypass the safety circuit. Record pressure, sounds, cycling, supply readings if safely
      available, and photos for Mactra/shore support. Use the compatible complete emergency
      pump set only by its practised changeover method, with power isolated and pressure released.</p>
    <h3>If water production remains unavailable</h3>
    <p>Protect your reserve and contact the race Safety Officer with the failure and your
      water plan. Use the separate hand-operated maker's own instructions.
      If that device takes seawater from a bucket, keep its brine discharge outside the
      feed bucket; returning brine to it makes the feed progressively saltier.</p>`),

  article('watermaker-care', 'Water maker - care, spares and finish',
    'Protect filter seals, carry the compatible emergency set, and arrange preservation.',
    `<h3>Strainer and 5-micron filter</h3>
    <p>The mesh strainer protects the pump from weed; the 5-micron cartridge protects the
      membrane. They are different parts. The manual says check/clean the strainer every
      five days and replace the cartridge typically at 80-100 running hours, sooner if
      water conditions require it. The call's observation that replacement is uncommon
      during a crossing does not cancel those checks.</p>
    <p>With power isolated, pressure released and the intake isolated as required for opening
      that housing, work over a bucket to catch the loose O-ring. Keep it clean and seated;
      do not discard it with the old cartridge. Clean the mesh gently and replace the cartridge
      with the correct part. Do not use bleach. After reassembly, restore the intake, use the
      specified air-purge/first-start procedure and check for leaks. Do not bypass a missing
      seal or filter as a routine repair.</p>
    ${source(36, 'section 6.1')}
    <h3>Rowing spares and preparation</h3>
    <p>Mactra's written race-spares list names a complete emergency pump set including relay
      card and pressure switch, SC1 cleaner/preservative and one 5-micron, 5-inch filter.
      This is Mactra's list, not a statement of current race rules or a replacement for the
      manufacturer's longer cruising-spares list.</p>
    <p>Before departure, check spare voltage and compatibility, the actual inlet/outlet
      changeover fittings, power connections and a secure mounting position. Practise
      changeover with the installer. The call's demonstration cannot establish the layout
      of your boat. Locate the hydraulic unit and electric pump/motor assembly; do not
      confuse separating these units with separating the motor from its pump.
      Carry the correct filter wrench, seals and tools for the fitted parts, including
      a multimeter for trained checks and a spanner that fits the installed 22 mm fittings.</p>
    <h3>After the finish - before shipping or storage</h3>
    <p>The training call recommends arranging preservation ("pickling") at the finish rather
      than leaving seawater in a hot shipping container. Plan who will do it before the boat
      is packed away. Keep chlorine out: use suitable unchlorinated water, with bottled water
      recommended in the call.</p>
    <p>Follow the Call Summary's rowing preservation method: first pass suitable fresh
      bottled water through the system, then feed the preservation solution through
      <strong>once</strong>, with the depressurization control slightly open so the solution
      is not forced through the membrane under production pressure. Leave the system
      preserved for transport or storage; do not add the yacht manual's recirculation cycle.</p>
    <p>The summary describes roughly 7-8 litres with half the supplied treatment, or 15 litres
      with the full measure. Use that only for the exact treatment and pack size demonstrated,
      with its dose confirmed against the current product label/Mactra instructions.
      "Half" is not a universal SC1 dose. Keep preservative out of drinking-water storage.
      Use the feed arrangement shown for your boat, not an assumed floodable compartment.</p>
    <p>Use the complete chemical safety and handling instructions.
      On return to use, follow the first-start procedure to remove chemicals and air before
      collecting drinking water. Cold storage below 5 C needs the separate manufacturer
      winterizing procedure; do not improvise an antifreeze mixture.</p>
    <p class="ref">Primary source: Call Summary, After Returning; call reference 01:18:41.
      Manual section 6.6 (PDF page 41) supplies the separate cold-storage guidance.</p>`),

  article('watermaker-sources', 'Water maker - sources and equipment',
    'Call Summary first; compatible manufacturer detail fills the gaps.',
    `<h3>Source order for this rowing guide</h3>
    <p><strong>The crew has selected the supplied Call Summary as the definitive rowing
      guidance.</strong> The manual fills compatible gaps; it does not replace the summary's
      daily shutdown or finish-line preservation method. The full call helps explain context,
      but ambiguous gestures and apparent summary errors are not turned into new instructions.</p>
    <h3>Manufacturer reference</h3>
    <p><a href="${MANUAL}" target="_blank" rel="noopener">ZEN 30 manual
      30Z12/24.B.2021 - online PDF</a>. Source citations use physical PDF pages;
      the printed page number is one lower. The full manual and its diagrams are not bundled.</p>
    <h3>Ocean-rowing material</h3>
    <p><a href="${MACTRA}" target="_blank" rel="noopener">Mactra Ocean Rowers Access
      Page - online, access required</a>. Its written ZEN/Smart 30 race-spares guidance was
      checked on 11 November 2026. Operating adaptations here come from the crew-supplied
      training-call transcript and speaker's summary received that day, not independently
      transcribed video audio. The summary describes the same call; it is not independent
      confirmation, and its apparent reset-valve mix-up is not used as a sequence.</p>
    <p>The call adds clean-intake checks, solar-aware planning, air-ingestion symptoms,
      protecting loose filter seals, emergency-set preparation, keeping brine out of a
      bucket feed and arranging preservation at the finish.</p>
    <h3>Match this to the installed equipment</h3>
    <p>This guide is scoped to the simpler rowing controller, with pressure switch and relay
      card, and unpressurised product-water collection. The manual's yacht controller,
      flashing alarms and automatic freshwater-flush sequence are excluded. Its pressurised
      freshwater flushing supply is distinct from the product-water outlet.</p>
    <p>For traceability, the manual says stop about one second after the beat and describes
      recirculating preservative. This rowing guide instead follows the Call Summary:
      stop on a clunk and use the finish-line once-through preservation method.
      The differing accumulator charge values are not used as adjustment instructions.
      No pressure-switch adjustment is supplied here.
      The call's filter/accumulator bypasses, direct electrical feeds and experimental
      heat/plastic repairs are not operating instructions in this guide.</p>
    <p>For an unresolved equipment question, Mactra lists
      <a href="tel:+441934517288">+44 1934 517288</a>.
      At sea, keep the race Safety Officer informed of any loss of water-making capability.</p>`)
];
