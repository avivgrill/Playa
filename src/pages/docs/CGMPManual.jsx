import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CHAPTERS = [
  {
    id: 'allergen',
    title: 'Allergen Control Program',
    sections: [
      {
        heading: 'Allergens at Playa',
        body: `Playa produces M&M-style hard-shell candy and gummy candy. Allergens present in our facility include: milk (from confectioner's chocolate coatings and dairy-based colorants), soy (from soy lecithin used as an emulsifier in chocolate coatings), tree nuts (from any nut-flavored or nut-filled variants), wheat (from glucose syrup derivatives in some gummy formulas), and gelatin (porcine-derived, relevant for dietary restriction disclosure). Pectin-based gummies (vegan) are also produced and must be segregated from gelatin-based gummies.`,
      },
      {
        heading: 'Preventing Unintended Allergen Introduction (a)',
        body: `Unintended allergens are prevented from entering the manufacturing process through the following controls:\n\n• Supplier qualification: all raw material suppliers must declare allergen status in writing for every ingredient. Suppliers of allergen-free ingredients must provide a Certificate of Analysis (COA) confirming testing and confirming no cross-contact at their facility.\n• Employee controls: production personnel handling allergen-containing materials (e.g., chocolate coating batches) must don designated colored aprons/gloves before handling. These are removed and hands are washed before transitioning to allergen-free production.\n• Visitor controls: visitors are prohibited from bringing food into production areas. Visitors with known nut allergies who may be sensitive to airborne allergens must be noted before entering allergen-active zones.`,
      },
      {
        heading: 'Allergen Identification, Receiving, and Onsite Management (b)',
        body: `All allergen-containing raw materials are identified on the Allergen Ingredient Register. Upon receiving, allergen-containing ingredients are labeled with orange allergen tags before transfer to storage. On the bill of lading and receiving log, allergen status is documented. Allergen-containing ingredients (e.g., chocolate compound coating, soy-lecithin solutions) are stored in dedicated, labeled bins or on designated shelving within the raw materials area — never stored above or adjacent to allergen-free ingredients without physical separation.`,
      },
      {
        heading: 'Handling, Cleaning, Changeover, and Segregation (c)',
        body: `Playa operates dedicated production runs for allergen-containing and allergen-free products:\n\n• Scheduling: allergen-free gummy production runs are scheduled before allergen-containing candy coating runs within the same day wherever possible. If allergen-containing runs must precede allergen-free runs, a full allergen changeover clean is mandatory before resuming allergen-free production.\n• Allergen changeover clean: All coating drums, candy processing equipment, deposit lines, and product contact surfaces are fully disassembled and wet-washed with warm water and approved allergen cleaning agent. Equipment is visually inspected and, where applicable, swabbed for allergen protein (e.g., ATP or allergen-specific lateral flow test) before allergen-free production resumes. Swab results are logged and retained.\n• Dedicated utensils: color-coded utensils (scoops, spatulas, bins) are designated per allergen type and labeled. They are stored separately and are not used across allergen categories without full sanitation.\n• Packaging materials: allergen-free products are packaged before allergen-containing products in a shared run. If packaging materials are shared (e.g., same packaging machine), allergen labeling verification is required before changeover.`,
      },
      {
        heading: 'Allergen Storage Segregation (d)',
        body: `Allergen-containing raw materials and finished products are never stored above non-allergenic or different allergen-containing materials. Storage layout:\n\n• Raw materials: allergen-containing ingredients stored on bottom shelves or in dedicated allergen-designated storage zones, clearly marked with orange allergen signage.\n• Finished goods: allergen-containing finished product (e.g., milk chocolate M&M-style candy) stored in designated areas physically separate from allergen-free gummies. Products are clearly labeled on all sides of master cartons with allergen declarations.\n• WIP: allergen-containing WIP (e.g., coated candy awaiting polishing) stored in labeled, covered containers on designated production carts, not commingled with allergen-free WIP.`,
      },
      {
        heading: 'Finished Product Allergen Label Verification (e)',
        body: `Before packaging, the Lead Confectioner verifies that the correct label is loaded for the current product. The verification process:\n\n1. Compare the label allergen declaration against the batch formula sheet for the current production run.\n2. Confirm that the label matches the product SKU on the batch production record.\n3. Document the label lot/version number on the packaging run record.\n4. Conduct a line check: verify the first 3 units packaged to confirm correct label application and legibility.\n\nAny mislabeling discovered post-packaging results in an immediate product hold pending CAPA.`,
      },
      {
        heading: 'Allergen Labeling Legal Compliance (f)',
        body: `All product labels comply with the FDA Food Allergen Labeling and Consumer Protection Act (FALCPA) and, where applicable, FASTER Act requirements. The nine major allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame) are declared in plain language in the ingredient list or in a "Contains:" statement immediately following. For gummy products: gelatin source (porcine/bovine) is declared. For pectin-based vegan gummies: "gelatin-free" may be declared only after ingredient verification. Label artwork changes are reviewed against the current formula before approval.`,
      },
    ],
  },
  {
    id: 'environmental',
    title: 'Environmental Monitoring Program',
    sections: [
      {
        heading: 'Responsibility and Monitoring Methods (a)',
        body: `The Lead Confectioner (Alfredo Hurtado) is designated as the Environmental Monitoring Program (EMP) responsible individual. The Lead Confectioner oversees all sampling activities, records results, initiates corrective actions, and reports trend data to management quarterly. Monitoring methods used at Playa include:\n\n• ATP bioluminescence swabbing: primary rapid verification tool for equipment surfaces and food-contact areas post-sanitation, measuring organic residue load.\n• Microbiological contact plates (environmental swabs for indicator organisms): deployed in defined Zone 1–4 areas to detect Listeria spp., Total Aerobic Count (TAC), yeast, and mold as applicable to our sugar confectionery environment.\n• Visual inspection records: as a supplementary method; logged on the pre-operational and daily inspection records.`,
      },
      {
        heading: 'Risk Assessment and Monitoring Zones (b)',
        body: `A documented EMP Risk Assessment is conducted at minimum annually (or when processes, facility layout, or sanitation procedures change). The assessment categorizes facility areas into monitoring zones based on proximity to exposed product:\n\n• Zone 1 (Direct product contact): coating drum interiors, depositor nozzles, conveyor belts in contact with product, packaging machine product channels. Highest sampling frequency.\n• Zone 2 (Adjacent to Zone 1): exterior surfaces of coating drums, tabletops near deposit lines, equipment frames adjacent to Zone 1 surfaces.\n• Zone 3 (General production area): floors, drains, walls within the production room.\n• Zone 4 (Non-production areas): hallways, break rooms, restroom door handles, utility areas.\n\nCandy coating operations (M&M-style) present elevated sugar residue risk that supports yeast and mold growth — these are designated high-attention surfaces for Zone 1/2 monitoring.`,
      },
      {
        heading: 'Methods, Frequency, Indicator Organisms, and Corrective Actions (c)',
        body: `Monitoring schedule:\n\n• Zone 1 surfaces: swabbed after each allergen changeover clean and a minimum of 2× per week during active production.\n• Zone 2 surfaces: swabbed 1× per week.\n• Zone 3 surfaces: swabbed 2× per month (drains swabbed 1× per week).\n• Zone 4 surfaces: swabbed monthly.\n\nIndicator organisms monitored: Listeria spp. (highest priority for any RTE confectionery environment), Total Aerobic Count, yeast and mold. Established limits are documented in the EMP Log and are based on product type and regulatory guidance.\n\nCorrective actions for exceeded limits:\n1. Re-clean and re-sanitize the implicated surface/zone.\n2. Re-sample to verify effectiveness.\n3. If Listeria spp. is found in Zone 1 or Zone 2: hold all WIP and finished product produced on that line since last clean negative sample. Investigate root cause, conduct expanded Zone 1/2 sampling, and notify Managing Partners immediately. Document all actions in the corrective action log.`,
      },
      {
        heading: 'Trending of Environmental Monitoring Records (d)',
        body: `The Lead Confectioner compiles and trends all EMP results quarterly. Trending analysis includes: frequency of exceedances by zone, recurring positive locations, seasonal patterns (e.g., increased mold in summer), and correlation with sanitation schedule changes or new ingredient introductions. Trend reports are presented at the quarterly management review. Three or more exceedances at the same location within 90 days triggers a root cause investigation and targeted corrective action regardless of whether individual results triggered immediate action.`,
      },
    ],
  },
  {
    id: 'foreign-matter',
    title: 'Foreign Matter Detection and Control',
    sections: [
      {
        heading: 'Foreign Matter Detection Plan (a)',
        body: `Playa uses the following foreign matter detection equipment, appropriate to our M&M-style candy and gummy production operations:\n\n• Metal detector: inline, positioned at the end of the packaging line before final sealing. Detects ferrous, non-ferrous, and stainless steel metals. Sensitivity settings verified with certified test pieces for each product type (different reject thresholds may apply to gummy products vs. hard candy due to product density and moisture).\n• Visual inspection: pre-packaged product inspected at the depositing/coating stage by the operator for visual foreign matter including hard plastic, string, and color anomalies that may indicate contamination.\n• Magnets: installed over the sugar/glucose syrup receiving inlet to capture any ferrous contamination from transport equipment.`,
      },
      {
        heading: 'Monitoring and Verification Methods and Frequency (b)',
        body: `Metal detector monitoring and verification:\n\n• Startup check: metal detector tested at the start of every production run using certified test pieces (3mm Fe, 4mm non-Fe, 4mm SS minimum for confectionery) — one pass of each test piece through the detector. Results logged on the metal detector log.\n• In-process checks: test pieces run through the detector every 2 hours during production and at every product changeover.\n• Line clearance check: test piece check immediately following any metal detector alarm, adjustment, or restart after breakdown.\n\nMagnet inspection: magnets over receiving inlets inspected and cleaned daily during receiving operations. Findings (any metal material captured) are photographed and logged as a corrective event.`,
      },
      {
        heading: 'Inspection and Investigation of Detected Foreign Matter (c)',
        body: `When the metal detector activates a reject:\n\n1. The reject bin is emptied and every rejected unit is physically inspected.\n2. The Lead Confectioner is notified immediately if any metal is confirmed in product.\n3. A product hold is placed on all product produced since the previous successful test piece check.\n4. Root cause analysis is conducted: review equipment for wear, maintenance work in the area, incoming materials, and WIP.\n5. Corrective actions are documented and implemented before production resumes.\n6. If a foreign object reaches a customer, it is treated as a food safety complaint requiring full investigation per the Complaints Management Procedure.`,
      },
      {
        heading: 'Routine Verification Checks (d)',
        body: `Sensitivity test pieces are certified by the manufacturer with stated sensitivity values. Test pieces are stored in a dedicated, labeled pouch at the metal detector station — not in the production area where they could be confused with product. Test pieces are replaced or re-certified annually or when physical damage is observed. Each verification check is logged with: time, test piece type, pass/fail result, and operator initials. Failed verification checks immediately halt production on the line.`,
      },
      {
        heading: 'Calibration (e & f)',
        body: `Metal detector calibration is conducted by an approved external service provider at minimum annually, in accordance with the manufacturer's recommendations and applicable national standards. Calibration records include: equipment ID, calibration date, calibration results, technician name and qualifications, next calibration due date, and any adjustments made. Calibration certificates are retained on file. Equipment with a failed calibration is removed from service until re-calibrated and re-verified.`,
      },
      {
        heading: 'Foreign Matter Control — Exclusion and Management',
        body: `All wood, glass, brittle plastic, ceramics, and similar materials are excluded from production, packaging, and storage areas where open product is handled. Where full exclusion is not possible (e.g., glass gauge tubes on equipment, fluorescent light fixtures), these items are on the Glass and Brittle Plastic Register, are inspected daily, and are covered or protected with shatterproof guards or safety tape. Any breakage of a registered item triggers an immediate area quarantine, product hold, and full investigation.\n\nNo loose objects are permitted on equipment or overhead structures — all tools, fasteners, and hardware used for maintenance are inventoried before and after use via the tool control log. Equipment, building materials, and pallets are inspected at pre-operational inspection for cleanliness and good repair. Metal cutting instruments (box cutters, knives) used in the processing or packaging area are logged on the cutting instrument control sheet — each knife/cutter is assigned a number, inventoried at shift start and end, and stored in a designated holder when not in use.`,
      },
    ],
  },
  {
    id: 'product-control',
    title: 'Product Control: Holds, Rework, Traceability, and Recall',
    sections: [
      {
        heading: 'Non-Conforming Product Holds',
        body: `Non-conforming raw materials, WIP, finished products, and packaging materials are controlled as follows:\n\n• Identification: non-conforming goods are immediately tagged with a red "HOLD — Do Not Use" tag identifying the product, lot number, reason for hold, date placed on hold, and the name of the person initiating the hold.\n• Quarantine: held items are physically moved to a designated Hold Area, which is physically separated from usable inventory and clearly marked. Held items are never returned to production shelving until formally released by the Lead Confectioner or Managing Partner.\n• Disposition: the Lead Confectioner or Managing Partner conducts root cause analysis and documents the disposition decision: rework, reprocess, donate, destroy, or return to supplier. Disposition and rationale are recorded on the Non-Conforming Product Log. Only qualified, authorized personnel (Lead Confectioner or Managing Partner) may authorize release of held goods.`,
      },
      {
        heading: 'Rework, Recoup, and Repacking',
        body: `Rework is used at Playa for the following limited, approved scenarios: re-coating of M&M-style candy that fails color or shell uniformity standards; re-tempering of gummy product that has sticked due to humidity exposure before packaging.\n\nRework requirements:\n\n• All rework is labeled with: "REWORK — [original batch number] — [rework date]" before processing. This label travels with the rework through all stages.\n• Each rework batch is inspected by the Lead Confectioner before release for use: visual inspection for color, texture, and coating integrity; allergen compatibility check (rework may only be incorporated into a product with the same or greater allergen declaration).\n• Rework must be processed in a manner that results in a finished product with a remaining shelf life equal to or greater than the minimum shelf life established for that product — if the original product is approaching its minimum shelf life, it is not eligible for rework.\n• Rework is processed "like-to-like": M&M-style candy rework is only incorporated into M&M-style candy of the same flavor/allergen profile. Gummy rework is only incorporated into gummies of the same type (gelatin into gelatin, pectin into pectin).\n• All rework activity is documented on the Rework Log, linked to both the original batch and the receiving batch.`,
      },
      {
        heading: 'Traceability — One Forward, One Back',
        body: `Playa maintains complete traceability for all raw materials, WIP, finished products, and packaging materials.\n\nOne back (raw material to supplier):\n• Every ingredient lot received is recorded in the production management system with: supplier name, supplier lot number, Playa internal lot number (L##-xxx format), receive date, and quantity. Internal lot numbers are physically labeled on every container upon receipt.\n• Packaging material lots are similarly logged on receipt.\n\nForward traceability (batch to customer):\n• Each production batch (work order) is assigned a batch number linking to the ingredient lots consumed (via ingredientUsage records). Each packaging order links to the batch lot. Each pickup/shipping order records the packaged lot dispatched, customer name, and ship date.\n• Finished product master cases are labeled with the internal lot number, batch number, and best-by date.\n\nTraceability during holds and rework: rework batches reference original batch numbers. Held product retains its original lot number. The traceability chain is never broken — if a lot is split into multiple sub-lots, each sub-lot receives a unique sub-identifier cross-referenced to the parent lot.\n\nMock recall traceability exercise: Playa conducts a documented mock recall/traceability exercise at minimum annually. The exercise tests both one-forward and one-back traceability and must be completed in under 2 hours. Results are documented on the Mock Recall Record including quantity reconciliation.`,
      },
      {
        heading: 'Product Recall Procedure',
        body: `Recall Team:\n• Managing Partner — Aviv Grill (Lead): initiates recall decision, regulatory notification, customer communication\n• Managing Partner — Kayde McMullen: customer/co-packer contacts, logistics, product recovery\n• Lead Confectioner — Alfredo Hurtado: traceability records, product identification, quantity reconciliation\n\nContact list (maintained current in the emergency contacts file): Managing Partners (personal mobile numbers), Lead Confectioner, FDA (1-866-300-4374), state department of health, all co-packing customers, ingredient suppliers for implicated lots, third-party cold storage (if applicable), waste disposal contractor, certification body.\n\nRecall plan:\n1. Recall decision made by Managing Partner based on food safety risk assessment.\n2. Regulatory notification to FDA within the required timeframe (24 hours for Class I).\n3. Customer notification via phone + written notice within hours of recall decision.\n4. Public communication (if required): prepared press release template on file; communications coordinated with regulatory authorities.\n5. Product recovery: customers directed to quarantine and return or destroy product per recall instructions. Playa confirms quantities recovered vs. quantities shipped.\n6. Disposal: affected product destroyed per regulatory and environmental requirements, with documented destruction records.\n\nRecall records must include: regulatory classification, recall summary, implicated lot numbers, quantity of raw materials received, quantity produced, quantity shipped, quantity confirmed recovered, in-house quantity verified, duration of recall, and corrective actions implemented.\n\nAnnual mock recall: tested annually; results documented on the Mock Recall Tab. Auditors may conduct a live mock traceability exercise during the audit — Playa targets completion within 2 hours as required.`,
      },
    ],
  },
  {
    id: 'food-defense',
    title: 'Food Defense Plan',
    sections: [
      {
        heading: 'Food Defense Team and Qualified Individual (b)',
        body: `Playa maintains a Food Defense Team consisting of:\n\n• Food Defense Qualified Individual (FDQI): Aviv Grill (Managing Partner) — maintains formal food defense training recognized as sufficient to design and maintain a Food Defense Plan meeting FDA regulatory expectations (e.g., FDA FDPCI training or equivalent).\n• Co-lead: Kayde McMullen (Managing Partner).\n• Operational liaison: Alfredo Hurtado (Lead Confectioner).\n\nAll other personnel receive awareness-level food defense training annually, covering signs of intentional adulteration and reporting procedures.`,
      },
      {
        heading: 'Threat Assessment (a & c)',
        body: `An initial food defense threat assessment was conducted upon facility opening and is reviewed at minimum annually by the Food Defense Team. The threat assessment identifies actionable process steps most vulnerable to intentional adulteration using the FDA CARVER+Shock methodology as a reference. For our candy and gummy production operations, assessed vulnerable points include:\n\n• Bulk sugar and glucose syrup receiving and storage (large open containers)\n• Liquid flavor and color additive storage (accessible tanks/bottles)\n• Coating drum operations (accessible to personnel)\n• Packaging materials storage (unsealed master rolls)\n\nMitigation measures for each identified vulnerability are documented in the Food Defense Plan and implemented as controls.`,
      },
      {
        heading: 'Protection of Product Throughout the Process (a)',
        body: `All raw materials are received through the designated receiving dock and immediately logged. Bulk liquid tanks (glucose syrup, flavor solutions) are stored in locked secondary containment when not in active use. Candy coating drums are secured (drum access door locked or latched) when unattended and between shifts. Packaging materials are stored in the sealed packaging materials area and accessed only by production personnel. Finished products in the cold/dry storage room are secured — storage rooms are locked when production is not in progress.`,
      },
      {
        heading: 'Employee Reporting and Notification (d)',
        body: `Employees observe and report any suspicious behavior, unauthorized access, unusual odors, discoloration, or product tampering evidence immediately to the Lead Confectioner or Managing Partner. Emergency contacts are posted at all production area exit doors and in the break room. Reporting is never punished — anonymous reporting is accepted. In the event of a credible food defense breach, the Food Defense Team initiates a product hold, notifies the FDA and appropriate law enforcement, and follows recall procedures as applicable.`,
      },
      {
        heading: 'Employee Screening and Access Control (e & f)',
        body: `New employees are subject to background screening before being granted unescorted access to production and storage areas. References are verified before hire. Only authorized production personnel have access to the production floor, ingredient storage, and finished goods areas. All exterior doors to the facility are locked when not in active use. Computer systems containing production records and traceability data are protected with individual user passwords; systems are backed up to a secure offsite location. Visitors must sign in/out and are escorted at all times (see Visitor Control section). Sensitive areas (cold storage, chemical storage) are additionally key-controlled.`,
      },
      {
        heading: 'Secured Receipt and Transport (g)',
        body: `Incoming raw material shipments: drivers present a bill of lading at the dock. The receiving employee verifies the shipment against the purchase order before unloading begins. Tamper-evident seals or lot stickers on ingredient containers are verified intact. Any signs of tampering, damage, or irregular seals are documented and the shipment is placed on hold pending Managing Partner review.\n\nOutgoing finished product shipments: outbound loads are verified against the pick list. Customer vehicles/third-party carriers are inspected before loading for cleanliness, pests, and contamination. After loading, the load is documented, and tamper-evident seals are applied where required by customer specification.`,
      },
      {
        heading: 'Annual Verification and Testing (h)',
        body: `The Food Defense Plan is reviewed and verified at minimum annually by the FDQI (Aviv Grill). Verification includes: reviewing the threat assessment for changes in operations or personnel, confirming all physical and procedural controls are in place and functioning, and testing awareness among production staff through unannounced observation. Corrective actions for any identified vulnerabilities are documented and implemented. Records of actual food defense events (if any) serve in place of test scenarios for the applicable elements tested.`,
      },
    ],
  },
  {
    id: 'visitors',
    title: 'Visitor and Contractor Controls',
    sections: [
      {
        heading: 'Visitor Requirements',
        body: `All visitors and contractors entering product handling areas at Playa must comply with the following:\n\n• Health screening: visitors exhibiting signs of illness (fever, vomiting, jaundice, open lesions, active respiratory illness) are not permitted to enter production or storage areas. The escorting employee must ask the standard health screening question before entry.\n• cGMP compliance: all visitors are briefed on Playa's cGMP requirements before entering the production floor. Briefing covers: hair restraints (hairnets provided), no jewelry, clean clothing, no food or drink, proper handwashing, and no touching of product or food-contact surfaces without authorization. PPE (hairnet, beard net if applicable, visitor apron if required) is provided at the visitor station.\n• Sign-in/sign-out: all visitors sign the Visitor Log upon arrival, attesting that they have been informed of and agree to follow Playa's visitor rules. The log captures name, company, purpose, escorting employee, and time in/out.\n• Identification and escort: all visitors wear a visible visitor badge at all times and are escorted by an authorized Playa employee throughout their visit. No visitor may access production, storage, or chemical areas unescorted.`,
      },
    ],
  },
  {
    id: 'internal-audits',
    title: 'Internal Audits and Pre-Operational Inspections',
    sections: [
      {
        heading: 'Internal Audits (a–c)',
        body: `Playa conducts a comprehensive internal audit of the entire Food Safety Management System at minimum annually. The audit covers all documentation (policies, procedures, HACCP plan, records), physical facility and equipment, personnel practices, and operational controls.\n\nThe internal audit is conducted by the Lead Confectioner or by a qualified external auditor/consultant with demonstrated food safety audit competence. Where possible, the auditor has not been solely responsible for the area being audited (i.e., the person who writes a procedure should not be the only person auditing it). Managing Partners may also conduct or co-conduct internal audits.\n\nAll internal audit findings are recorded, including: the specific element audited, any nonconformances identified, root cause analysis, corrective actions assigned, responsible party, and target completion date. Corrective actions are tracked to closure. Internal audit records are retained as food safety records and presented to management at the annual review meeting.`,
      },
      {
        heading: 'Pre-Operational Inspections (a–b)',
        body: `Before every production shift, the Lead Confectioner or designee conducts a documented pre-operational inspection covering:\n\n• Personnel: all employees in proper cGMP attire (hairnets, beard nets, clean uniforms, no jewelry, no nail polish).\n• Equipment: all food-contact surfaces and equipment properly cleaned and sanitized since last use; no sanitizer residue visible; equipment assembled correctly; no loose parts or tools left on equipment.\n• Facility: production area floors, walls, and drains clean; pest traps checked and free of activity; no evidence of pest excretion or pest presence; overhead structures free of debris; no standing water.\n• Supplies: adequate supply of packaging materials, labels, and production inputs staged; correct label loaded for the first production run.\n• Utilities: adequate water pressure and temperature; refrigeration temperatures within range; fire suppression systems unobstructed.\n\nAny nonconformance identified at pre-op inspection is corrected before production begins and the correction is documented on the inspection record. If a nonconformance cannot be immediately corrected, production is delayed and a Managing Partner is notified.`,
      },
    ],
  },
  {
    id: 'suppliers',
    title: 'Supplier Approval and Monitoring Program',
    sections: [
      {
        heading: 'Approved Supplier List and Responsibilities (a & b)',
        body: `Playa maintains a current Approved Supplier List (ASL) for all raw materials and packaging materials. The Lead Confectioner is responsible for the day-to-day management of the ASL. Managing Partners are responsible for the approval and annual review of all suppliers. No raw material or packaging material from a non-approved supplier may be used in production without written authorization from a Managing Partner (see emergency supplier provision below).`,
      },
      {
        heading: 'Supplier Selection, Evaluation, and Approval Criteria (c)',
        body: `New suppliers are evaluated using the following criteria before approval:\n\n• Regulatory compliance: supplier must demonstrate compliance with FDA food safety regulations. Documentation required: FDA facility registration number, state licenses as applicable.\n• Food safety certification: preferred (not mandatory) that suppliers hold a GFSI-benchmarked food safety certification. For suppliers of allergen-containing or high-risk ingredients (chocolate compound, glucose syrup, gelatin, pectin), a food safety certification or recent satisfactory third-party audit report is required.\n• Allergen declaration: written allergen statement for each ingredient covering the 9 major FDA allergens is mandatory.\n• Certificate of Analysis (COA): COA for each production lot of high-risk ingredients (color additives, flavors, gelatin) is required.\n• Approved food additive status: all color additives, flavors, and other functional ingredients must be confirmed as FDA-approved for use in the applicable food product category.`,
      },
      {
        heading: 'Emergency Non-Approved Supplier Use (d)',
        body: `In a documented emergency (approved supplier stockout, supply chain disruption), a Managing Partner may authorize temporary use of a non-approved supplier for a single purchase. Before use, the Managing Partner must: obtain a COA and allergen declaration, confirm FDA compliance, verify the ingredient meets all formula requirements, and document the authorization in the non-approved supplier log. The supplier is then added to the evaluation queue for full approval before a second purchase is authorized.`,
      },
      {
        heading: 'Annual Supplier Review and Removal (e & f)',
        body: `All approved suppliers are reviewed at minimum annually. The annual review assesses: any food safety recalls or alerts involving the supplier's products, changes in the supplier's certification or compliance status, quality complaints related to the supplier's materials in the prior year, and timeliness of COA and allergen documentation. Suppliers are removed from the ASL when: they are the subject of a Class I food safety recall that directly affects ingredients we source, they fail to maintain required certifications or compliance documentation, or two or more quality failures traceable to their materials are documented in a calendar year. Supplier removal is authorized by a Managing Partner.`,
      },
    ],
  },
  {
    id: 'personnel',
    title: 'Personnel Health, Hygiene, and Clothing',
    sections: [
      {
        heading: 'Employee Health — Illness Reporting (a–e)',
        body: `All employees must be trained on the following signs and symptoms of infectious diseases that require them to report to management and be excluded from product-handling areas:\n\n• Jaundice\n• Diarrhea or vomiting\n• Open sores, boils, or lesions on exposed skin (hands, arms, face)\n• Sore throat with fever\n• Confirmed diagnosis of Hepatitis A, Norovirus, Salmonella, Shigella, STEC, or other transmissible foodborne illness\n\nAll employees must report symptoms to the Lead Confectioner or Managing Partner before beginning work. Reports are kept confidential.\n\nEmployee with exposed cuts, sores, or lesions: excluded from handling product or food-contact surfaces. Minor cuts are covered with a brightly colored (blue preferred) bandage and then covered with a food-grade disposable glove before returning to product-handling duties. Blue bandages are used because they are detectable by metal detectors; the metal strip is built in.\n\nSpillage of bodily fluids (blood, vomit): the affected area is immediately quarantined with caution tape or cones. No production employee other than the designated cleanup person wearing full PPE (disposable gown, gloves, face shield) approaches the area. The area is cleaned with a detergent solution and sanitized with an EPA-registered virucidal sanitizer at the appropriate concentration before being released by the Lead Confectioner or Managing Partner.`,
      },
      {
        heading: 'Personal Hygiene (a–d)',
        body: `All production personnel must follow these hygiene requirements:\n\n• Eating, drinking, chewing gum, chewing tobacco, vaping, and smoking are permitted only in the designated break room — never in production, packaging, or storage areas. Drinking water is permitted in the production area only in sealed, lidded containers at the designated hydration station, provided it is not located over exposed product or product-contact surfaces.\n• No false fingernails, nail polish, or false eyelashes are permitted. Natural fingernails must be kept clean and trimmed short enough to not extend beyond the fingertip. Inspected at pre-op by the Lead Confectioner.\n• Handwashing: required upon entering production areas, after using the restroom, after handling allergen-containing materials, after handling waste or cleaning chemicals, after touching face/hair, after breaks, and any time hands become contaminated. Handwashing stations are located at all production area entry points and in the restroom.\n• Proper handwashing technique: wet hands with warm water, apply soap, scrub vigorously for minimum 20 seconds (including between fingers and under nails), rinse thoroughly, dry with single-use paper towel. Signage with illustrated handwashing instructions is posted above each handwashing sink in English and Spanish.`,
      },
      {
        heading: 'Protective Clothing and Jewelry (a–i)',
        body: `Personal attire requirements:\n\n• All production personnel wear clean uniforms or dedicated facility clothing (provided by Playa) to prevent outside contamination from entering the facility. Uniforms are changed before the start of each shift and when soiled.\n• Sufficient uniforms are provided for each employee (minimum 3 sets per person).\n• Uniforms are laundered in-house using approved detergent and sanitizer at a frequency that ensures cleanliness (at minimum weekly, or after each soiling). Clean and soiled uniforms are stored in separate labeled bins — clean uniforms in sealed laundry bags in the changing area; soiled uniforms in a covered hamper at the exit.\n• All production personnel wear facility-provided hairnets covering all head hair. Beard nets are required for all personnel with facial hair longer than light stubble. Hairnet and beard net racks are located at the production floor entry point; all personnel must don these before entering.\n• Gloves are worn when handling exposed product. Hands must be washed before donning gloves. Gloves are changed: when torn or punctured, when changing tasks between different products, after touching face or non-product surfaces, and at a minimum every 2 hours of continuous use.\n• No jewelry except a plain (smooth-surface) wedding band or medical alert bracelet is permitted in production areas. Watches, rings with stones, earrings, necklaces, and facial piercings must be removed before entering the production floor. Policy is explained during onboarding and verified at pre-op inspection.`,
      },
    ],
  },
  {
    id: 'sanitation',
    title: 'Cleaning, Sanitation, Chemicals, and Pest Control',
    sections: [
      {
        heading: 'Cleaning and Sanitation Program (a–d)',
        body: `Playa maintains a Master Cleaning and Sanitation Schedule (MCSS) that lists every area, surface, and piece of equipment requiring cleaning or sanitation, with assigned frequency, method, chemicals, concentrations, and responsible employee.\n\nFor M&M-style candy production: sugar residue build-up in coating drums and on conveyor surfaces is a primary hygiene concern, as it supports yeast/mold and attracts pests. Wet cleaning with warm water followed by an approved food-grade sanitizer is required for all product-contact surfaces after each production run and after each product changeover.\n\nFor gummy production: gelatin residue in depositing equipment is particularly adhesive when cooled and becomes a microbial substrate if not fully removed. Depositor nozzles and molds are disassembled and soaked in hot detergent water, then sanitized after every production run.\n\nSpillage response: a dedicated spill kit (absorbent material, food-grade sanitizer spray, disposable towels, biohazard bags) is stationed in the production area. Spills of product, solutions, or cleaning chemicals are addressed immediately by the nearest employee following the documented spill cleanup procedure. Spill events are logged.\n\nCleanliness verification: the Lead Confectioner verifies the effectiveness of all cleaning and sanitation prior to production start at pre-operational inspection using visual inspection and ATP swab testing at minimum weekly on Zone 1 surfaces. ATP results are logged and any surface exceeding the action limit is re-cleaned and re-tested before use.`,
      },
      {
        heading: 'Chemical Control Program (a–f)',
        body: `All chemicals used at Playa (cleaning agents, sanitizers, lubricants, pest control chemicals) are controlled through the Chemical Approval Program:\n\n• Approved Chemical List: maintained by the Lead Confectioner. No new chemical may be introduced to the facility without Managing Partner approval and confirmation that it is appropriate for use in a food manufacturing environment.\n• Storage: all chemicals are stored in the dedicated, locked chemical storage room, physically separate from food, ingredients, packaging materials, and finished goods. Food-grade chemicals (food-contact sanitizers, equipment lubricants) are stored on separate, labeled shelving from non-food-grade chemicals (floor degreasers, drain openers).\n• Labeling: all chemicals remain in original manufacturer-labeled containers. When chemicals are dispensed into spray bottles or secondary containers, those containers are immediately labeled with: chemical name, concentration, use-by date (if applicable), and "Food Grade" or "Non-Food Grade" as appropriate. Unmarked spray bottles are prohibited.\n• Safety Data Sheets (SDS): a current SDS for every chemical used on site is maintained in the SDS binder located in the chemical storage room and at the production supervisor's station. SDS binder is reviewed annually.\n• Sanitizer effectiveness verification: sanitizers used on food-contact surfaces are tested for concentration at the point of use at the start of each production day using the appropriate test kit (e.g., quaternary ammonium test strips, chlorine titration strips). Concentration results are logged. Sanitizer outside the approved concentration range is discarded and replaced.`,
      },
      {
        heading: 'Integrated Pest Management (IPM) Program (a–g)',
        body: `Playa uses a licensed third-party pest control operator (PCO) for the IPM program. The PCO's name, license number, certificate of insurance, scope of service, and service schedule are documented in the IPM file.\n\nBait station map: the PCO maintains a current bait station map identifying the type, location, and number of all traps (snap traps, glue boards, insect light traps [ILTs], pheromone traps, exterior rodent bait stations). The map is signed and dated by the PCO at minimum annually. Interior bait stations use only mechanical traps (no rodenticide inside the facility). Exterior rodent bait stations are tamper-resistant and locked.\n\nMonitoring frequency: the PCO visits monthly (minimum). Interior traps are checked at each PCO visit and by facility staff weekly — findings (catch counts, activity evidence) are logged on the Pest Trap Monitoring Log and trended quarterly. Trends showing increased activity trigger an intensified monitoring and corrective action response.\n\nPesticide list: a current list of all pesticides used by the PCO or Playa staff is maintained in the IPM file with SDS for each. Only EPA-registered pesticides are used. No pesticide is applied inside the facility near open product without Managing Partner approval and a pre-use safety review.\n\nPCO service reports: each PCO visit results in a written service report documenting findings and any pesticide applications (date, chemical/EPA number, location, amount/concentration, target pest, applicator name). These are retained in the IPM file.`,
      },
    ],
  },
  {
    id: 'utilities-storage',
    title: 'Utilities, Storage, and Facility Standards',
    sections: [
      {
        heading: 'Water, Steam, and Ice (a–f)',
        body: `Playa uses municipal potable water for all production operations. Water pressure and temperature are verified adequate for production and sanitation at the start of each production week.\n\nAnnual water testing: potable water is sampled at minimum at two points of use (the production handwashing sink and the equipment wash-down area) and submitted to an accredited third-party laboratory annually for microbiological analysis (Total Coliform, E. coli) and chemical analysis (basic potability panel per local regulatory requirements). Results are retained and reviewed by management.\n\nBackflow prevention: backflow prevention devices (minimum air gap or approved backflow preventer) are installed on all main water supply lines, hose connections, and spray nozzles within the facility. A licensed plumber or inspector verifies all backflow devices at minimum annually; the verification record is retained.\n\nHandwashing stations: located at all production area entry points, adjacent to restrooms, and accessible throughout the production floor. Each station is equipped with: potable warm water (minimum 100°F), liquid soap dispenser, single-use paper towels or hands-free dryer, and handwashing procedure signage in English and Spanish.`,
      },
      {
        heading: 'Air Quality and Ventilation (a–c)',
        body: `All compressed air lines that come into contact with product or product-contact surfaces (e.g., compressed air used to clean depositor nozzles or blow off candy) are fitted with oil-removal filters and particulate filters. Filters are maintained per the preventative maintenance schedule (minimum quarterly inspection, replaced when a pressure drop or visual contamination is observed).\n\nIf compressed air contacts product or product-contact surfaces, the compressed air is tested by an accredited laboratory at minimum annually for oil content, total particle count, and microbiological contamination. Results are reviewed by management.\n\nVentilation: the production and packaging areas are mechanically ventilated to control temperature, humidity, and remove steam/sugar dust generated during coating operations. For gummy production areas, humidity is controlled to prevent sticking of gummies during cooling. Exhaust vents are directed away from raw material and finished goods storage areas and are equipped with pest exclusion screens.`,
      },
      {
        heading: 'Dry and Temperature-Controlled Storage',
        body: `Dry storage: raw materials (sugar, corn syrup solids, citric acid, flavor powders, packaging materials) are stored on racks or pallets off the floor (minimum 6 inches clearance). No product contacts the floor. Storage areas are sealed against moisture and pest entry. Raw materials, WIP, and finished products are stored in separate, labeled zones and not commingled.\n\nFor M&M-style candy and gummies: finished products are stored at ambient temperature (ideally below 65°F/18°C) to prevent sugar bloom on hard candy shells and prevent gummies from sticking. Temperature is monitored continuously with a calibrated data logger; readings are reviewed weekly and logged monthly. Temperature excursions (above 72°F/22°C) trigger assessment of product quality and potential hold.\n\nRefrigerated/temperature-controlled storage (if applicable for seasonal production or humidity-sensitive gummies): temperature monitored with a calibrated sensor, data logged. Corrective actions for temperature excursions are documented on the Temperature Excursion Log. Condensation from cooling units is directed to a drain that does not pass over product storage areas.`,
      },
      {
        heading: 'Waste Management (a–d)',
        body: `Waste containers (production scrap, packaging waste, food waste) are clearly labeled by type ("Product Waste," "Packaging Waste," "Chemical Waste"). Containers are emptied at minimum at the end of each production shift and whenever full. Waste containers are cleaned and sanitized weekly and inspected at pre-op. External waste dumpsters are kept closed when not actively being loaded. Waste staging areas are inspected for pest activity at each PCO visit and on the weekly facility walk.`,
      },
      {
        heading: 'Receiving and Shipping',
        body: `Receiving: the receiving dock is inspected before each inbound delivery. Before unloading, the receiving employee inspects the delivery vehicle or transport container for: cleanliness, absence of pests, absence of odors, temperature compliance for temperature-sensitive items, and integrity of tamper-evident seals. Any concerns are documented and the shipment is placed on conditional hold pending Managing Partner review. Raw materials are labeled and moved to appropriate storage immediately after receiving inspection.\n\nShipping: outbound customer vehicles or contracted carriers are inspected before loading: cleanliness, absence of pests, absence of odors or chemical residues. Product is loaded to prevent shifting or damage during transport. After loading, the shipment is documented, and where required, a tamper-evident seal is applied. The shipping record captures: order number, customer, lot numbers shipped, quantity, carrier, and departure date.`,
      },
    ],
  },
  {
    id: 'facility-equipment',
    title: 'Facility, Equipment, and Maintenance',
    sections: [
      {
        heading: 'Facility Location and Grounds (a–e)',
        body: `The Playa production facility is located in an area suitable for food manufacturing. The building structure is maintained in good repair — any structural damage (cracked walls, damaged roof, broken windows) is reported to management and addressed under the preventative maintenance program.\n\nGrounds: the immediate exterior of the facility is maintained free from debris, standing water, and excessive dust. An 18-inch pest-exclusion perimeter of gravel or maintained bare ground is maintained around the building exterior. Roadways, loading, and unloading areas are paved or compacted and kept free from debris and pooled water.\n\nThe facility has clear physical segregation between: production areas, packaging areas, raw material receiving/storage, finished goods storage, employee break room and restrooms, and exterior loading/dock areas.`,
      },
      {
        heading: 'Facility Interior Standards (a–j)',
        body: `Floors, walls, ceilings, and drains: constructed of smooth, cleanable, non-absorbent materials. Production area floors are non-slip, sealed, and sloped to floor drains to prevent standing water. Walls in wet-process areas (depositing, washing) are covered with a cleanable surface. Ceilings and overhead structures are free of flaking paint, condensation, or debris. Drains are covered with removable, cleanable covers and inspected at pre-op.\n\nLights: sufficient illumination for all production, inspection, and storage activities. Light fixtures over exposed product and product-contact surfaces are equipped with shatterproof covers or safety tubes. Any broken or missing fixture covers are treated as a foreign material event.\n\nWindows and openings: all external windows are sealed or screened to prevent pest entry. Windows that open are fitted with pest-exclusion screens. All exterior openings (conduit passes, pipe penetrations) are sealed with appropriate pest-exclusion material.\n\nRestrooms: self-closing doors; do not open directly into production areas; equipped with adequate toilets and handwashing sinks for the number of employees; handwashing signs posted; covered waste receptacles provided. Employee locker/break room is maintained clean and in good repair.`,
      },
      {
        heading: 'Equipment Standards (a–d)',
        body: `All food-contact equipment is constructed of food-grade materials, is smooth, non-porous, and designed for easy disassembly and cleaning. Coating drums, gummy depositing equipment, and conveyor systems are inspected at pre-op for cleanliness, proper assembly, and absence of damage.\n\nOverhead equipment (motors, fans, utility lines): inspected monthly. Any overhead equipment that could drop debris, lubricant, or condensation onto product is equipped with appropriate guards or drip shields.\n\nAll hoses and portable cleaning equipment are stored on wall-mounted racks or hooks off the floor when not in use. Equipment not in active use is stored in a designated equipment staging area in a sanitary manner (surfaces covered or inverted to prevent contamination).`,
      },
      {
        heading: 'Preventative Maintenance and Calibration (a–c / a–c)',
        body: `Preventative Maintenance (PM) Schedule: a Master PM Schedule documents all structures, areas, equipment, and parts requiring scheduled maintenance, including frequency and responsible party. The Lead Confectioner manages the PM schedule; Managing Partners are notified of any overdue PM items.\n\nUnplanned maintenance: unplanned repairs are documented in the Maintenance Log including date, equipment, description of problem, repair performed, parts replaced, and sign-off by the Lead Confectioner confirming production area was cleared and cleaned/sanitized after maintenance before production resumed.\n\nMaintenance and product safety: maintenance personnel use only designated tools that are logged on the tool control sheet. After any maintenance in or near the production area, the Lead Confectioner conducts a post-maintenance inspection verifying: all tools removed and accounted for; no lubricant, metal shavings, or debris on or near product contact surfaces; area cleaned and sanitized as appropriate before production restart.\n\nTemporary repairs: temporary repairs (e.g., tape patches on equipment housings) are approved only by the Managing Partners in writing. Temporary repairs are tagged with a bright orange "Temporary Repair — Review by [date]" tag and logged in the maintenance log. Temporary repairs must be replaced with permanent solutions within 30 days (or sooner if a food safety risk is identified); the maintenance log is reviewed at each monthly management walk-through to ensure no temporary repair becomes de facto permanent.\n\nCalibration: all equipment used to measure food safety-critical parameters (thermometers for receiving and storage temperature, metal detector) is identified in the Calibration Register with calibration due date. Calibration is performed against national or international standards per manufacturer recommendations, by the manufacturer's service program or by an accredited calibration provider. Records are retained including: equipment ID, calibration date, standard used, results, and technician identity. Any critical measurement equipment found out of calibration triggers an immediate review of product safety since the last valid calibration and initiation of a CAPA.`,
      },
    ],
  },
]

export default function CGMPManual() {
  const navigate = useNavigate()
  const [openChapter, setOpenChapter] = useState(null)

  return (
    <div style={wrap}>
      <button style={backBtn} onClick={() => navigate('/docs/program')}>← Management Program</button>
      <p style={docLabel}>Operational Requirements · Reviewed Annually</p>
      <h1 style={pageTitle}>cGMP & Operational Standards Manual</h1>
      <p style={metaLine}>Playa · M&M-Style Candy and Gummy Production · Effective upon adoption</p>
      <div style={divider} />
      <p style={intro}>
        This manual documents Playa's current Good Manufacturing Practices and operational food safety requirements, specific to M&M-style hard-shell candy and gummy candy production and co-packing operations. All employees must be trained on the sections applicable to their role. This document is reviewed and updated annually and whenever a significant change occurs in facility, personnel, product scope, or regulatory requirements.
      </p>

      {CHAPTERS.map(ch => (
        <div key={ch.id} style={chapterBlock}>
          <button
            style={{ ...chapterBtn, ...(openChapter === ch.id ? chapterBtnOpen : {}) }}
            onClick={() => setOpenChapter(openChapter === ch.id ? null : ch.id)}
          >
            <span>{ch.title}</span>
            <span style={chevron}>{openChapter === ch.id ? '▲' : '▼'}</span>
          </button>
          {openChapter === ch.id && (
            <div style={chapterBody}>
              {ch.sections.map((sec, i) => (
                <div key={i} style={sectionBox}>
                  <h3 style={sectionHeading}>{sec.heading}</h3>
                  <p style={body}>{sec.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={approvalBlock}>
        <p style={approvalLabel}>Reviewed and approved by:</p>
        <div style={sigRow}>
          <SigLine name="Aviv Grill" title="Managing Partner" />
          <SigLine name="Kayde McMullen" title="Managing Partner" />
        </div>
      </div>
    </div>
  )
}

function SigLine({ name, title }) {
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ borderBottom: '1.5px solid #374151', height: 40, marginBottom: '0.5rem', width: 200 }} />
      <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.875rem' }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ borderBottom: '1.5px solid #d1d5db', height: 36, width: 140 }} />
      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Date</div>
    </div>
  )
}

const wrap = { maxWidth: 820 }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1.25rem', padding: 0 }
const docLabel = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', margin: 0 }
const pageTitle = { fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.4rem 0 0.15rem' }
const metaLine = { fontSize: '0.8rem', color: '#9ca3af', margin: 0 }
const divider = { borderTop: '2px solid #e5e7eb', margin: '1.5rem 0' }
const intro = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.8, margin: '0 0 1.5rem', background: '#f9fafb', padding: '0.875rem 1rem', borderRadius: 8, borderLeft: '3px solid #1d4ed8' }
const chapterBlock = { marginBottom: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }
const chapterBtn = { width: '100%', background: '#f9fafb', border: 'none', padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.95rem', fontWeight: 700, color: '#111827', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const chapterBtnOpen = { background: '#eff6ff', color: '#1d4ed8' }
const chevron = { fontSize: '0.75rem', color: '#9ca3af' }
const chapterBody = { padding: '1.25rem', borderTop: '1px solid #e5e7eb' }
const sectionBox = { marginBottom: '1.5rem' }
const sectionHeading = { fontSize: '0.9rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 0.5rem', paddingBottom: '0.3rem', borderBottom: '1px solid #eff6ff' }
const body = { fontSize: '0.875rem', color: '#374151', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }
const approvalBlock = { borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '1.5rem' }
const approvalLabel = { fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }
const sigRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap' }
