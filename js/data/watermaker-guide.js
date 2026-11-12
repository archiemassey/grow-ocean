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
    `<p>For the Schenker ZEN 30 with a simple pressure-switch/relay controller and water
      collected in an unpressurised container. Check your unit's voltage, controls and pipes
      before use. The 12 V and 24 V models need different power supplies.</p>
    <ul>
      <li><a href="#/wiki/watermaker-run">Daily use and stopping</a></li>
      <li><a href="#/wiki/watermaker-faults">Not making water? Fault checks</a></li>
      <li><a href="#/wiki/watermaker-care">Filters, spares and after the finish</a></li>
      <li><a href="#/wiki/watermaker-sources">Equipment, help and manuals</a></li>
    </ul>
    <p><strong>Keep oil, fuel, bleach and chlorinated water out of the membrane circuit.</strong>
      Do not run in visibly polluted water or a suspected algae bloom. Keep the electric pump and controls dry.</p>
    <p>Use the controls and procedures you practised with your installer.
      If you cannot identify a valve or control, ask Mactra before using it.</p>
    <p>The guide works offline. You need internet to open the manuals and training links.</p>`),

  article('watermaker-run', 'Water maker - daily use',
    'Check the intake and power, watch the pressure, and stop on a clunk.',
    `<h3>Before starting</h3>
    <ol>
      <li>Make water while solar charging is good. Allow for forecast cloud and your
        drinking-water reserve. For a 12 V unit, have <strong>at least 12 volts</strong>
        before starting. Stop if the supply falls below 12 volts.
        This limit does not apply to a 24 V unit.</li>
      <li>Check the sea at the intake for oil, fuel, unusual discolouration or a suspected algae
        bloom. Do not draw that water into the machine.</li>
      <li>Check that the intake is open and underwater. Make sure discharge can flow freely,
        hoses are secure and filters are fitted. Remove weed from the strainer.</li>
      <li>Keep the pump, wiring and controls dry. Set the valves and start the machine
        as you practised during training.</li>
    </ol>
    <h3>While making water</h3>
    <p>Normal pressure is about <strong>6-8 bar</strong>. Listen for a regular clunk every
      <strong>6-7 seconds</strong>. The gauge needle moves slightly as the unit changes direction.</p>
    <p>Stop if the machine repeatedly cuts out, stops cycling, or the pressure quickly rises
      towards 9.5-10 bar. A safety cut-out is a warning, not normal operation.</p>
    <p>Check for leaks when you start and throughout the run. Check the freshwater outlet hose:
      a loose hose can fill the compartment instead of your container. Stop if you find a leak
      or the pressure stays outside its normal range.</p>
    <p>Rated output is 30 litres an hour at 25 C in seawater containing 35,000 parts per million
      of salt. Actual output varies. Cold water and supply problems can reduce it, so do not
      rely on this rate when planning your drinking-water reserve.</p>
    <p>Run the first output to waste for a minute or two because it may be salty.
      This does not prove that the water is safe to drink.
      <strong>Only collect drinking water once it passes the water-quality checks agreed for
      your boat.</strong> Clear water or a normal taste alone does not prove it is safe.
      Do not dilute salty startup water into a drinking-water container.
      If the water is still suspect, keep it out of your drinking supply.</p>
    ${source(12, 'section 3.6')}
    <h3>Stopping</h3>
    <p><strong>Stop on a clunk</strong>. With both rowers available,
      have one listen while the other switches the machine off. Do not deliberately stop
      midway between cycles.</p>
    <h3>First start or after opening a filter</h3>
    <p>Use the air-clearing procedure you practised. Open the pressure-release
      (depressurization) control, start the machine and clear the air from the filter.
      Then close that control. Check that normal pressure and cycling return.
      Keep clean water flowing to the intake. Only use controls you can positively identify.</p>`),

  article('watermaker-faults', 'Water maker - fault checks',
    'Check power, intake and filters. Know when to stop and ask for help.',
    `<h3>Stop first</h3>
    <p>Stop for a leak, repeated cut-outs or abnormal pressure. Isolate electrical power and
      release pressure using the pressure-release (depressurization) control before opening
      a filter, disconnecting a hose or working on the unit.
      Do not loosen a fitting while it is under pressure.</p>
    <h3>The pump is silent</h3>
    <p>Check the power supply, the water-maker fuse and accessible connections.
      Follow the electrical checks you practised. Other boat equipment may still work
      when this fuse has failed. Replacing the pump will not fix a failed power supply.</p>
    <p>Only test live circuits with a multimeter or open the electrical enclosure
      if you have the training to do so safely.</p>
    <h3>Pump runs, but no normal cycling or production</h3>
    <p>Trapped air or a stalled hydraulic valve can cause burbling at low pressure.
      Pressure may also rise quickly towards 9.5-10 bar before the machine cuts out.
      These signs do not identify the cause on their own.</p>
    <p>Check that the intake stays underwater, especially in rough seas.
      Look for air entering the intake, a blocked strainer or a dirty filter.</p>
    <p>You may need to reset the unit and clear trapped air. Only use the reset procedure
      you practised. Identify the reset valve, positioner and pressure-release control
      before you start. Section 5.4 of the manual shows these parts.</p>
    <p><strong>The reset valve and pressure-release control are different controls.</strong>
      If you are unsure which is which, stop. Ask Mactra to identify them and confirm the
      reset sequence for your unit. Do not guess a valve sequence, force a stiff positioner
      or keep restarting when pressure makes the machine cut out.</p>
    <p>Do not fully remove the plastic-threaded pressure-release knob.
      You could lose its seal or damage its thread. Open it only as far as the procedure requires.</p>
    ${source(33, 'section 5.4; illustrations continue on PDF pages 34-35')}
    <h3>Pump chatters or cuts out at working pressure</h3>
    <p>The pressure switch or relay card may have failed, but chattering alone does not prove this.
      Do not adjust the pressure switch to keep the pump running or bypass the safety circuit.</p>
    <p>Tell Mactra or shore support the pressure, sounds and cycling pattern.
      Send photos and supply readings if you can take them safely.
      If you fit the complete emergency pump set, check that it matches your unit.
      Follow the changeover method you practised, with power isolated and pressure released.</p>
    <h3>If water production remains unavailable</h3>
    <p>Protect your reserve and contact the race Safety Officer with the failure and your
      water plan. Use the separate hand-operated maker's own instructions.
      If that device takes seawater from a bucket, keep its brine discharge outside the
      feed bucket; returning brine to it makes the feed progressively saltier.</p>`),

  article('watermaker-care', 'Water maker - care, spares and finish',
    'Check filters, protect seals, prepare spares and treat the unit before storage.',
    `<h3>Strainer and 5-micron filter</h3>
    <p>The mesh strainer protects the pump from weed; the 5-micron cartridge protects the
      membrane. They are different parts. Check and clean the strainer every five days.
      Replace the cartridge after about 80-100 running hours, or sooner if water conditions require it.</p>
    <ol>
      <li>Isolate power and release pressure. Isolate the intake as needed before opening the housing.</li>
      <li>Work over a bucket to catch the loose O-ring seal. Keep it clean.
        Do not throw it away with the old cartridge.</li>
      <li>Clean the mesh gently. Replace the cartridge with the correct part. Do not use bleach.</li>
      <li>Seat the seal and refit the housing. Restore the intake, clear air using the
        first-start procedure and check for leaks.</li>
    </ol>
    <p>Keep the seal and filter in place. Do not bypass them as a routine repair.</p>
    ${source(36, 'section 6.1')}
    <h3>Rowing spares and preparation</h3>
    <p>Prepare these spares with Mactra and check the current race requirements:</p>
    <ul>
      <li>A complete emergency pump set, including relay card and pressure switch.</li>
      <li>SC1 cleaner/preservative.</li>
      <li>One 5-micron, 5-inch filter cartridge.</li>
    </ul>
    <p>Before departure, check the spare unit's voltage, fittings, power connections and mounting position.
      Practise changing over with the installer. Locate the hydraulic unit and the electric
      pump/motor assembly on your boat.</p>
    <p>Carry the correct filter wrench, seals and tools for your fittings.
      Include a multimeter for trained checks and a spanner that fits the installed 22 mm fittings.</p>
    <h3>After the finish - before shipping or storage</h3>
    <p>Arrange treatment with preservative ("pickling") at the finish.
      Decide who will do it before packing the boat away.
      Do not leave seawater in the unit during hot shipping or storage.</p>
    <ol>
      <li>Use suitable, unchlorinated bottled water to rinse the system.</li>
      <li>Prepare preservative using the current product label and Mactra's instructions.
        For the exact treatment and pack size used in training, the quantities were about
        7-8 litres with half the treatment, or 15 litres with the full measure.
        Confirm the dose before mixing. Do not apply a "half bottle" dose to a different product or pack.</li>
      <li>Feed the solution through <strong>once</strong>. Keep the pressure-release
        (depressurization) control slightly open so the solution does not pass through the
        membrane at normal water-making pressure. Do not recirculate it.</li>
      <li>Leave the unit treated for transport or storage. Keep preservative out of drinking-water storage.</li>
    </ol>
    <p>Follow all chemical handling and safety instructions. Use the feed connections you practised for your boat.</p>
    <p>Before using the unit again, follow the first-start procedure to remove chemicals and air.
      Only then collect water that passes your boat's drinking-water checks.
      For storage below 5 C, follow the manufacturer's winter storage procedure.
      Do not mix your own antifreeze solution.</p>
    ${source(41, 'section 6.6 - storage below 5 C')}`),

  article('watermaker-sources', 'Water maker - equipment and help',
    'Check your equipment, contact Mactra and find manuals or training.',
    `<h3>Check your equipment</h3>
    <p>Use this guide for the simple rowing controller with a pressure switch and relay card.
      Collect freshwater in an unpressurised container. Check that your equipment matches
      before using these instructions.</p>
    <p>A yacht controller has different controls and an automatic freshwater-flush routine.
      If your controls differ, ask Mactra for the right instructions.
      A pressurised flushing supply is separate from the freshwater outlet.</p>
    <h3>Get help</h3>
    <p>Contact Mactra on <a href="tel:+441934517288">+44 1934 517288</a>
      for equipment or reset questions. At sea, tell the race Safety Officer if you cannot make water.</p>
    <h3>Manuals and training - internet needed</h3>
    <p><a href="${MANUAL}" target="_blank" rel="noopener">ZEN 30 manual
      30Z12/24.B.2021 - online PDF</a>. The printed page number is one lower than the PDF page number.
      You need internet to open the full manual and diagrams.</p>
    <p><a href="${MACTRA}" target="_blank" rel="noopener">Mactra Ocean Rowers Access
      Page - online, access required</a>. Open this for rowing training and spares information.</p>`)
];
