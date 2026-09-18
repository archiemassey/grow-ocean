#!/usr/bin/env python3
"""Generate js/data/procedures-data.js from the crew-provided official PDFs.

Source of truth: references/official-procedures-source.json (a faithful,
page-by-page transcription of the two official documents produced from the
unchanged PDFs). This script parses the Crisis Operations Plan into
actor-grouped subsections (so a rower sees THEIR actions first) and pairs it
with a hand-verified transcription of the one-page Crisis Ops Flow Chart.

Nothing here rewords the source. Steps are copied verbatim; only the outline
numbering (e.g. "4.1.1 ") is stripped for display and the actor headings are
used to group steps. Re-run after replacing the PDFs / source JSON:

    python tools/extract-procedures.py
"""
import json
import re
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "references" / "official-procedures-source.json"
OUT = ROOT / "js" / "data" / "procedures-data.js"

SHAREPOINT = ("https://microsofteur.sharepoint.com/teams/growoceancrew/"
              "Shared%20Documents/App%20Content/Rules%20and%20Safety")
COPYRIGHT = ("© Atlantic Campaigns / World's Toughest Row. "
             "Crew-provided official reference — do not alter.")

# Curated triage. "emergency" procedures surface first, in this order; every
# other procedure is kept under "Other situations & definitions".
PRIORITY = {4: 1, 5: 2, 12: 3, 11: 4, 9: 5, 10: 6, 13: 7, 14: 8, 6: 9, 7: 10}

# Plain-language words a rower might reach for, mapped to the procedure number.
SYNONYMS = {
    4: ["person overboard", "man overboard", "mob", "overboard", "in the water",
        "fell in", "casualty in water", "fire", "sinking", "capsize", "capsized",
        "abandon", "mayday", "she's in the water"],
    5: ["medical", "medical emergency", "sick", "ill", "injured", "injury",
        "bleeding", "unconscious", "chest pain", "casualty", "hurt", "wound",
        "broken bone", "collapsed"],
    6: ["injury", "illness", "non emergency", "minor injury", "seasick",
        "sea sick", "blister", "unwell", "sore", "rash", "salt sore"],
    7: ["death", "died", "dead", "fatality", "deceased"],
    8: ["unconfirmed distress", "accidental epirb", "false alarm", "distress"],
    9: ["loss of communication", "comms", "communications", "radio dead",
        "no signal", "lost contact", "cannot reach", "can't reach", "missing",
        "satphone", "sat phone", "phone dead", "vhf dead", "no comms"],
    10: ["technical", "technical problem", "broken", "autopilot", "auto tiller",
         "rudder", "watermaker", "steering", "equipment failure", "repair",
         "malfunction", "pump"],
    11: ["power failure", "no power", "batteries", "battery dead", "electrics",
         "electrical", "solar", "no charge", "blackout", "flat battery"],
    12: ["hull breach", "breach", "leak", "leaking", "taking on water",
         "water ingress", "hole", "holed", "crack", "flooding", "swamped"],
    13: ["evacuation", "evacuate", "airlift", "medevac", "remove rower",
         "rescue rower", "take off boat"],
    14: ["abandon ship", "abandon boat", "abandonment", "life raft", "liferaft",
         "transfer", "safety vessel", "board rescue", "step up"],
    15: ["landfall", "finish elsewhere", "land", "make landfall", "wrong port"],
    19: ["attack", "assault", "sexual", "physical attack", "harassment"],
}

STEP_RE = re.compile(r"^\d+\.\d+(?:\.|\s+)\d+\s+")          # 4.1.1  or mangled 9.2 8
HEAD_RE = re.compile(r"^\d+\.\d+\s+(?=\D)")                 # 4.1 Rowing Boat Actions:


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def parse_procedure(proc):
    """Split a flat step list into intro + actor-grouped subsections."""
    intro = []
    sections = []
    current = None
    for raw in proc["steps"]:
        line = raw.rstrip()
        if not line:
            continue
        if HEAD_RE.match(line) and not STEP_RE.match(line):
            heading = HEAD_RE.sub("", line).strip().rstrip(":").strip()
            actor = "boat" if "rowing boat" in heading.lower() else "shore"
            current = {"actor": actor, "heading": heading, "note": "", "steps": []}
            sections.append(current)
        elif STEP_RE.match(line):
            text = STEP_RE.sub("", line).strip()
            if current is None:                 # step before any heading
                current = {"actor": "shore", "heading": "", "note": "", "steps": []}
                sections.append(current)
            current["steps"].append(text)
        else:                                    # continuation of previous line
            if current and current["steps"]:
                current["steps"][-1] = clean(current["steps"][-1] + " " + line)
            elif current:                        # a note between heading and first step
                current["note"] = clean(current["note"] + " " + line)
            else:
                intro.append(line)
    for sec in sections:
        sec["steps"] = [clean(s) for s in sec["steps"] if clean(s)]
        sec["note"] = clean(sec.get("note", ""))
    sections = [s for s in sections if s["steps"]]
    return clean(" ".join(intro)), sections


def title_of(proc):
    # Drop the leading "4. " numbering from the transcribed section title.
    return re.sub(r"^\d+\.\s*", "", proc["title"]).strip()


def build_plan(doc):
    procedures = []
    for proc in doc["procedures"]:
        num_match = re.match(r"^(\d+)\.", proc["title"])
        if not num_match:
            continue
        number = int(num_match.group(1))
        intro, sections = parse_procedure(proc)
        has_boat = any(s["actor"] == "boat" for s in sections)
        procedures.append({
            "id": str(number),
            "number": number,
            "title": title_of(proc),
            "pageRefs": proc.get("pageRefs", []),
            "group": "emergency" if number in PRIORITY else "other",
            "priority": PRIORITY.get(number, 100 + number),
            "hasBoatActions": has_boat,
            "synonyms": SYNONYMS.get(number, []),
            "intro": intro,
            "sections": sections,
        })
    procedures.sort(key=lambda p: p["priority"])
    rel_file = "references/" + slug(doc["sourceFilename"])
    sha256, byte_size = pin(rel_file)
    return {
        "title": doc["documentTitle"],
        "edition": "WTR Atlantic 2026",
        "file": rel_file,
        "source": SHAREPOINT + "/" + doc["sourceFilename"].replace(" ", "%20"),
        "sha256": sha256,
        "byteSize": byte_size,
        "pageCount": doc["pageCount"],
        "copyright": COPYRIGHT,
        "procedures": procedures,
    }


def slug(name):
    base = re.sub(r"[^a-z0-9]+", "-", name.lower().replace(".pdf", "")).strip("-")
    return base + ".pdf"


def pin(rel_path):
    """Hash the actual shipped PDF so the app's recorded hash always matches the
    bytes served offline (OneDrive/git can rewrite PDF structure on sync)."""
    data = (ROOT / rel_path).read_bytes()
    return hashlib.sha256(data).hexdigest(), len(data)


# Hand-verified transcription of the single-page Crisis Ops Flow Chart. Copied
# verbatim from the PDF text; grouped into its two decision branches so the
# rowers get a fast, faithful decision aid on top of the full-page PDF.
def build_flow_chart(doc):
    rel_file = "references/" + slug(doc["sourceFilename"])
    sha256, byte_size = pin(rel_file)
    return {
        "title": doc["documentTitle"],
        "file": rel_file,
        "source": SHAREPOINT + "/" + doc["sourceFilename"].replace(" ", "%20"),
        "sha256": sha256,
        "byteSize": byte_size,
        "copyright": COPYRIGHT,
        "contacts": [
            {"label": "Duty Officer (DO)", "value": "+1 470-972-3338"},
            {"label": "Duty Officer (DO) — alternate", "value": "+1 470-972-3389"},
            {"label": "NMOC", "value": "+44 1329 244681"},
        ],
        "emergency": {
            "when": ("Grave & imminent danger — e.g. rower overboard, fire, "
                     "sinking, abandonment, medical emergency."),
            "steps": [
                "Activate 406 mHz EPIRB",
                "Issue Mayday by VHF",
                "Contact Duty Officer (DO) +1 470-972-3338.",
                "If unable to contact DO call NMOC +44 1329 244681",
                "If unable, contact DO by any means on board",
                "Ensure all comms and AIS are on & working.",
                "Deploy sea anchor to maintain position.",
                ("If you see other vessel try contacting it by any means: VHF, "
                 "signalling mirror, set off hand held red flare or orange smoke flare."),
                "If in contact with vessel, follow instructions.",
                "Await further instruction.",
            ],
            "scenarioNotes": [
                ("If rower overboard make every effort to recover them without "
                 "compromising your own safety. (pg4)"),
                ("If fire or abandonment prepare life raft & grab bag and get "
                 "foul weather gear. (pg4)"),
                ("If medical emergency get medical kit and treat as best you can. "
                 "Await response. (pg5)"),
            ],
        },
        "nonEmergency": [
            {"problem": "Injury/Illness", "page": 6, "procId": "6",
             "guidance": ("Assess seriousness, treat as best as can with Medical Kit. "
                          "Contact DO. Ensure comms on, await call from DO +/- race "
                          "medic and support vessel.")},
            {"problem": "Loss of Communication", "page": 9, "procId": "9",
             "guidance": ("Try to make contact with passing vessel via handheld VHF, "
                          "mirror, orange smoke flare and ask them to contact DO. If "
                          "situation deteriorates eg. drift into shipping lanes, poor "
                          "weather follow Emergency protocol.")},
            {"problem": "Technical Problem", "page": 11, "procId": "10",
             "guidance": ("If unresolved may turn into a Pan-Pan and Emergency. Contact "
                          "DO via any means on board. Call every 4 hours until situation "
                          "stabilises. If unable to contact DO try Support/other vessels "
                          "to contact DO.")},
            {"problem": "Complete Power Failure", "page": 12, "procId": "11",
             "guidance": "Contact DO by any means possible. Go to pg12."},
            {"problem": "Unconfirmed Distress", "page": 7, "procId": "8",
             "guidance": "eg accidental EPIRB activation. You will receive call from DO."},
            {"problem": "Evacuation", "page": 12, "procId": "13", "guidance": "See pg12."},
            {"problem": "Death on Board", "page": 8, "procId": "7", "guidance": "See pg8."},
        ],
    }


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    docs = {d["documentTitle"]: d for d in data["documents"]}
    plan_doc = next(d for d in data["documents"] if d["pageCount"] > 1)
    flow_doc = next(d for d in data["documents"] if d["pageCount"] == 1)

    document = {
        "plan": build_plan(plan_doc),
        "flowChart": build_flow_chart(flow_doc),
    }

    body = json.dumps(document, ensure_ascii=False, indent=2)
    OUT.write_text(
        "// Generated by tools/extract-procedures.py from the unchanged, "
        "crew-provided official PDFs.\n"
        "// Steps are copied verbatim from references/official-procedures-source.json.\n"
        "// Do not hand-edit — re-run the generator after replacing the source PDFs.\n"
        "export const PROCEDURES_DOCUMENT = " + body + ";\n",
        encoding="utf-8",
    )
    plan = document["plan"]
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"  plan: {len(plan['procedures'])} procedures, {plan['pageCount']} pages")
    emerg = [p for p in plan["procedures"] if p["group"] == "emergency"]
    print(f"  emergency (rower-first): {', '.join(p['title'] for p in emerg)}")


if __name__ == "__main__":
    main()
