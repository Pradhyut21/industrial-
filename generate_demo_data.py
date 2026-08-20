import os
import sys

# Ensure backend directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import init_db, get_db_connection, DB_PATH
from backend.ingestion import ingest_document

def seed_data():
    print("Seeding database...")
    # Remove existing DB file if it exists to refresh schema columns
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print("Deleted old database file to refresh schema.")
        except Exception as e:
            print("Failed to remove old database:", e)
    init_db()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Clean existing records
    cursor.execute("DELETE FROM engineers")
    cursor.execute("DELETE FROM documents")
    cursor.execute("DELETE FROM equipment_nodes")
    cursor.execute("DELETE FROM voice_notes")
    cursor.execute("DELETE FROM conflicts")
    cursor.execute("DELETE FROM causal_links")
    cursor.execute("DELETE FROM semantic_drift")
    cursor.execute("DELETE FROM counterfactuals")
    cursor.execute("DELETE FROM coreference_map")
    cursor.execute("DELETE FROM org_network")
    cursor.execute("DELETE FROM sop_compliance")
    
    # 2. Insert Engineers with Cognitive Fingerprints (out of 100)
    engineers = [
        ("Rajan Sharma", "Senior Boiler & Turbine Lead", "Retired", "2026-03-15", 2026, "RS", 92, 
         "Boiler Operations, Steam Turbines, High Pressure Systems", 85, 20, 90, 30, 45, 80),
        ("Amit Patel", "Electrical Maintenance Lead", "Active", "2031-08-10", 2031, "AP", 45, 
         "Switchgears, Transformers, Power Distribution", 40, 85, 25, 92, 50, 40),
        ("Vikram Sen", "Instrumentation & Control Expert", "Active", "2033-05-12", 2033, "VS", 30, 
         "Control Valves, Loop Calibration, PLC Systems", 75, 55, 35, 45, 95, 70),
        ("T. Nair", "Rotating Equipment Specialist", "Active", "2028-04-01", 2028, "TN", 81, 
         "Pumps, Seals, Bearings, Vibration Trend Analysis", 78, 82, 95, 32, 50, 60),
        ("M. Pillai", "Process Veteran", "Active", "2026-09-15", 2026, "MP", 96, 
         "Distillation, Heat Exchange, Startup Procedures", 70, 95, 55, 35, 60, 99),
        ("R. Nayar", "Senior Instrument Systems Engineer", "Active", "2027-06-30", 2027, "RN", 88, 
         "Positioner Calibration, Signal Drift, Field Devices", 92, 45, 70, 40, 98, 75),
        ("S. Kulkarni", "High Pressure Safety Auditor", "Active", "2030-10-15", 2030, "SK", 55, 
         "Safety Valves, Relief Systems, Hazard Analysis", 90, 60, 60, 50, 80, 85),
        ("H. Mehta", "Auxiliary Systems Technician", "Active", "2029-12-31", 2029, "HM", 72, 
         "Compressors, Heat Exchangers, Auxiliary Steam", 65, 70, 85, 60, 55, 60),
        ("A. Joshi", "Automation & PLC Engineer", "Active", "2035-05-20", 2035, "AJ", 25, 
         "SCADA systems, Logic Controller, Network architecture", 95, 80, 40, 85, 90, 80)
    ]
    
    cursor.executemany("""
    INSERT INTO engineers (
        name, role, status, retirement_date, retirement_year, avatar, risk_score, specialties,
        cognitive_systematic, cognitive_intuitive, cognitive_mechanical, cognitive_electrical,
        cognitive_instrumentation, cognitive_process
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, engineers)
    
    # 3. Insert Equipment Nodes with Downtime Costs
    nodes = [
        ("TURBINE-04", "Auxiliary Steam Turbine", "Utility Section", 200.0, 120.0, "High", 15000000),
        ("BOILER-2", "High-Pressure Boiler 2", "Utility Section", 500.0, 110.0, "High", 18000000),
        ("P-302", "Boiler Feedwater Pump A", "Feedwater Station", 320.0, 420.0, "High", 8000000),
        ("B-101", "Primary Steam Boiler", "Utility Section", 460.0, 140.0, "High", 12000000),
        ("V-205", "Low-Ambient Control Valve", "Feedwater Station", 650.0, 250.0, "Medium", 5000000),
        ("C-104", "Main Air Compressor", "Instrument Air Section", 180.0, 200.0, "High", 10000000),
        ("S-501", "Main Electrical Switchgear", "Power House", 750.0, 380.0, "High", 12000000),
        ("E-310", "Feed/Effluent HX", "Reaction Section", 560.0, 360.0, "Medium", 1800000),
        ("T-401", "Main Fractionator Column", "Distillation", 820.0, 460.0, "High", 20000000),
        ("D-220", "Reactor Knockout Drum", "Reaction Section", 660.0, 80.0, "Medium", 7800000),
        ("P-304", "Emergency Backup Pump", "Feedwater Station", 380.0, 480.0, "Medium", 6000000),
        ("H-102", "Primary Flue Gas Heater", "Utility Section", 580.0, 180.0, "Low", 4000000),
        ("V-206", "High-Pressure Safety Vessel", "Reaction Section", 700.0, 150.0, "High", 14000000),
        ("TURBINE-02", "Main Generator Turbine", "Power House", 850.0, 280.0, "High", 25000000)
    ]
    
    cursor.executemany("""
    INSERT INTO equipment_nodes (tag, name, process_area, coordinates_x, coordinates_y, criticality, downtime_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, nodes)
    
    # 4. Insert Cross-Expert Conflicts
    conflicts = [
        ("P-302", "Feedwater Pump P-302 Cavitation Correction", "Rajan Sharma", "Vikram Sen", 
         "Reduce pump suction throttling immediately by 15% and increase flow rate.",
         "Recalibrate the suction pressure gauge and check for air leaks in the seal housing.",
         "Resolved cavitation warning in 4 hours.",
         "Required 12 hours of testing; did not fully resolve sensor drift.",
         "Follow Rajan Sharma's suction throttling sequence first. It addresses the primary hydrodynamic pressure threshold directly, yielding 3x faster stabilization. Calibrate Vikram's sensor seals as a secondary preventive measure.",
         90),
        ("C-104", "Compressor C-104 Valve Chattering", "Amit Patel", "Rajan Sharma",
         "Bypass the electronic solenoid interlock and reset the PLC control cycle.",
         "Perform physical cleaning of the discharge check valve seat and replace mechanical springs.",
         "Bypassed solenoid in 2 hours but chattering recurred 3 days later.",
         "Completed mechanical rebuild in 8 hours. Resolved issue permanently.",
         "Follow Rajan Sharma's mechanical spring replacement guide. Amit's solenoid bypass is a temporary workaround that leads to premature mechanical wear and system recurrence.",
         87)
    ]
    
    cursor.executemany("""
    INSERT INTO conflicts (
        equipment_tag, title, expert_a, expert_b, rec_a, rec_b, outcome_a, outcome_b, ai_recommendation, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, conflicts)
    
    # 5. Insert Temporal Causal Links
    causal_links = [
        ("B-101", "B-101 Boiler Bearing Wear (Rajan, 2016)", "P-302 Feedwater Cavitation (Vikram, 2018)", 0, 
         "Boiler discharge pressure fluctuations induced severe transient cavitation on the feedwater pump impeller."),
        ("B-101", "P-302 Feedwater Cavitation (Vikram, 2018)", "V-205 Control Valve Positioner Drift (Vikram, 2021)", 0,
         "Micro-vibrations from pump cavitation loosened positioner linkages on V-205 control valve over 3 years."),
        ("B-101", "V-205 Control Valve Positioner Drift (Vikram, 2021)", "C-104 Compressor Interlock Shutdown (PREDICTED, late 2026)", 1,
         "Drift in V-205 feedback loops under freezing ambient temperature causes secondary air line pressure drops, causing C-104 startup trips.")
    ]
    
    cursor.executemany("""
    INSERT INTO causal_links (equipment_tag, parent_event, child_event, is_prediction, description)
    VALUES (?, ?, ?, ?, ?)
    """, causal_links)
    
    # 6. Insert Semantic Drift coordinates
    semantic_drift = [
        ("C-104", 2016, "Minor vibration noted on startup", 12.0, 15.0, 0.1),
        ("C-104", 2018, "Vibration within acceptable range", 20.0, 22.0, 0.2),
        ("C-104", 2020, "Vibration elevated, monitoring recommended", 42.0, 35.0, 0.5),
        ("C-104", 2022, "Persistent vibration, cause unclear", 65.0, 58.0, 0.7),
        ("C-104", 2024, "CRITICAL: vibration exceeding thresholds", 88.0, 80.0, 0.9),
        
        ("B-101", 2016, "Normal pressure levels observed", 10.0, 10.0, 0.0),
        ("B-101", 2019, "Boiler flue gas temp slightly high", 25.0, 18.0, 0.2),
        ("B-101", 2022, "Transient pressure spikes during night shifts", 48.0, 38.0, 0.4),
        ("B-101", 2025, "Accumulating carbon scaling in secondary superheater tubes", 78.0, 72.0, 0.7)
    ]
    
    cursor.executemany("""
    INSERT INTO semantic_drift (equipment_tag, year, phrase, vector_x, vector_y, severity_index)
    VALUES (?, ?, ?, ?, ?, ?)
    """, semantic_drift)
    
    # 7. Insert Counterfactual failures
    counterfactuals = [
        ("P-302", "Rajan's 2018 valve calibration on P-302", "Calibrated zero span feedback arm instead of standard loop reset", 2.3, 
         "P-302 cavitation would have progressed to complete rotor impeller seizure;Starved B-101 feedwater loop, triggering dry boiler thermal stress interlock;Forced 340 hours of high-pressure pipeline rebuilds (₹2.3 Cr downtime avoided)"),
        ("S-501", "Amit's 2024 switchgear grease on S-501", "Cleaned oxide layer and applied conductive thermal grease before monsoon", 1.1,
         "Busbar connection overheating would have escalated to switchgear substation fire;Shutdown of plant Utility section due to main switchgear offline;Forced backup diesel generator usage costing 15 Lakhs/day")
    ]
    
    cursor.executemany("""
    INSERT INTO counterfactuals (equipment_tag, title, intervention, cost_avoided_crore, consequences)
    VALUES (?, ?, ?, ?, ?)
    """, counterfactuals)
    
    # 8. Insert Cross-Document Coreferences
    coreferences = [
        ("B-101 Primary Steam Boiler", "B-101", "Equipment", 98),
        ("B-101 Primary Steam Boiler", "Boiler 101", "Equipment", 95),
        ("B-101 Primary Steam Boiler", "the main boiler", "Equipment", 88),
        ("Rajan Sharma", "R. Sharma", "Person", 95),
        ("Rajan Sharma", "Rajan S.", "Person", 99),
        ("Feedwater Cavitation", "pump surge", "Phenomenon", 82),
        ("Feedwater Cavitation", "flow instability", "Phenomenon", 85),
        ("R. Nayar", "Nayar", "Person", 99),
        ("R. Nayar", "R. Nayar", "Person", 100),
        ("Senior Instrument Engineer", "R. Nayar", "Person", 90),
        ("BOILER-2", "Boiler 2", "Equipment", 97),
        ("TURBINE-04", "Aux Turbine", "Equipment", 94)
    ]
    
    cursor.executemany("""
    INSERT INTO coreference_map (standard_name, alias_name, entity_type, confidence)
    VALUES (?, ?, ?, ?)
    """, coreferences)
    
    # 9. Insert Org Network dependency scores
    network = [
        ("Vikram Sen", 0.89, "Rajan Sharma, Amit Patel", 3, 0.33),
        ("Rajan Sharma", 0.72, "Vikram Sen", 2, 0.24),
        ("Amit Patel", 0.45, "Vikram Sen", 1, 0.12),
        ("T. Nair", 0.65, "Rajan Sharma", 2, 0.20),
        ("M. Pillai", 0.82, "R. Nayar, Rajan Sharma", 4, 0.38),
        ("R. Nayar", 0.78, "Vikram Sen", 3, 0.30)
    ]
    
    cursor.executemany("""
    INSERT INTO org_network (engineer, centrality, dependencies, domains_affected, resilience_drop)
    VALUES (?, ?, ?, ?, ?)
    """, network)
    
    # 10. Insert SOP Compliance audits
    compliance = [
        ("SOP-2019-047 (Boiler Startup)", 1, "Verify feedwater pump suction valves are open", 100, "None"),
        ("SOP-2019-047 (Boiler Startup)", 2, "Check mechanical positioner feedback arm alignment", 82, "Often verified visually rather than dial gauge calibration"),
        ("SOP-2019-047 (Boiler Startup)", 3, "Calibrate zero pressure baseline offsets", 34, "Skipped on warm startup to save 45 minutes; leads to sensor drift risk"),
        ("SOP-2019-047 (Boiler Startup)", 4, "Run two-engineer sign-off interlock check", 17, "Engineers consistently skip and perform Step 4 before Step 3. Rajan's custom sequence has 100% success rate.")
    ]
    
    cursor.executemany("""
    INSERT INTO sop_compliance (sop_id, step_number, step_desc, compliance_rate, workaround_detected)
    VALUES (?, ?, ?, ?, ?)
    """, compliance)
    
    conn.commit()
    conn.close()
    
    # Ingest documents
    doc1 = ingest_document(
        title="Boiler Pressure Fluctuation Investigation - B-101",
        content="""
        EQUIPMENT: B-101 Primary Steam Boiler
        DATE: Aug 2016
        AUTHOR: Rajan Sharma (Senior Boiler & Turbine Lead)
        
        OBSERVATION: 
        Boiler pressure fluctuating approximately 0.3 bar at 3am, with feedwater flow remaining stable.
        
        DIAGNOSIS & ACTIONS:
        I checked the feedwater control valve positioner calibration first, not the system setpoints. 
        Discovered feedwater control valve positioner drift at low ambient temperatures during the night shift.
        Calibrated the positioner feedback arm and lubricated the mechanical linkages. Pressure stabilized post-calibration.
        
        RECOMMENDATION:
        Always perform verification of mechanical positioner alignment before adjusting digital controller loop gains.
        """,
        doc_type="Maintenance Log",
        forced_author="Rajan Sharma"
    )
    
    doc2 = ingest_document(
        title="Turbine Blade Vibration Incident Report - B-101",
        content="""
        EQUIPMENT: B-101 Primary Steam Boiler / Steam Turbine Loop
        DATE: Jan 2018
        AUTHOR: Rajan Sharma (Senior Boiler & Turbine Lead)
        
        OBSERVATION:
        During startup, minor pressure fluctuations of 0.3 bar were noted, followed by high vibration alerts on the auxiliary steam line.
        
        DIAGNOSIS & RESOLUTION:
        Feedwater flow was reported as stable by shift operators, but valve positioner drift was observed. 
        Re-calibrated the valve feedback system which corrected the boiler pressure fluctuations.
        """,
        doc_type="Inspection Report",
        forced_author="Rajan Sharma"
    )
    
    doc3 = ingest_document(
        title="Switchgear Busbar Overheating - S-501",
        content="""
        EQUIPMENT: S-501 Main Electrical Switchgear
        DATE: Mar 2024
        AUTHOR: Amit Patel (Electrical Maintenance Lead)
        
        OBSERVATION:
        Thermography scan showed a temperature rise of 24 degrees Celsius on Phase-B busbar connection.
        
        DIAGNOSIS & ACTION:
        Isolated the switchgear panel. Cleaned oxide layers off the contact surfaces and applied conductive contact grease.
        Torqued all connection bolts to OEM specs (85 Nm). Temperature returned to normal.
        """,
        doc_type="Inspection Report",
        forced_author="Amit Patel"
    )
    
    doc4 = ingest_document(
        title="Feedwater Valve Positioner Calibration - V-205",
        content="""
        EQUIPMENT: V-205 Low-Ambient Control Valve
        DATE: Apr 2025
        AUTHOR: Vikram Sen (Instrumentation & Control Expert)
        
        OBSERVATION:
        Positioner feedback signal mismatched from controller output by 4.2%.
        
        DIAGNOSIS:
        Adjusted the zero and span pots on the positioner. Feedwater loop response improved.
        Cross-checked with Rajan's old notes from 2018, which also flagged cold-weather drift issues.
        """,
        doc_type="Maintenance Log",
        forced_author="Vikram Sen"
    )

    doc5 = ingest_document(
        title="Shift Log 2019-04-22 — C-104 Trip",
        content="""
        EQUIPMENT: C-104 Recycle Compressor
        DATE: 2019-04-22
        AUTHOR: Amit Patel (Electrical Maintenance Lead)
        
        OBSERVATION:
        Compressor C-104 tripped due to elevated transient vibration thresholds.
        
        DIAGNOSIS & ACTIONS:
        Verified electrical feed. Amit Patel checked mechanical casing torque and noted loose anchor bolts. Cross-pattern tightening performed.
        """,
        doc_type="Maintenance Log",
        forced_author="Amit Patel"
    )

    doc6 = ingest_document(
        title="Overhaul Report 2021 — P-302 Cavitation",
        content="""
        EQUIPMENT: P-302 Reflux Pump A
        DATE: Jun 2021
        AUTHOR: T. Nair (Rotating Equipment Specialist)
        
        OBSERVATION:
        Prior cavitation events in 2020 and 2022 on sister pump P-302B match current signature.
        
        DIAGNOSIS:
        Cavitation occurs due to suction strainer restriction. T. Nair checked impeller eye pitting.
        """,
        doc_type="Inspection Report",
        forced_author="T. Nair"
    )

    doc7 = ingest_document(
        title="Startup Procedure SOP-114 — V-205 Vessel",
        content="""
        EQUIPMENT: V-205 Low-Ambient Control Valve
        DATE: Oct 2022
        AUTHOR: M. Pillai (Process Veteran)
        
        OBSERVATION:
        Contradictions found on heat-soak intervals.
        
        DIAGNOSIS:
        M. Pillai noted that heat-soak interval must be verified against the plant standard SOP-114, even if it contradicts the OEM manual.
        """,
        doc_type="Maintenance Log",
        forced_author="M. Pillai"
    )

    doc8 = ingest_document(
        title="Zero-Span Calibration Standard - TURBINE-04",
        content="""
        EQUIPMENT: TURBINE-04 Auxiliary Steam Turbine
        DATE: Nov 2023
        AUTHOR: R. Nayar (Senior Instrument Systems Engineer)
        
        OBSERVATION:
        Turbine speed governor signal showing minor feedback lag on cold startup.
        
        DIAGNOSIS:
        Adjusted governor feedback loop. Re-zeroed the signal offset at 4mA and 20mA span limit. 
        Feedback now perfectly linear.
        """,
        doc_type="Maintenance Log",
        forced_author="R. Nayar"
    )

    doc9 = ingest_document(
        title="Boiler-2 Fuel Gas Solenoid Overhaul",
        content="""
        EQUIPMENT: BOILER-2 High-Pressure Boiler 2
        DATE: Dec 2024
        AUTHOR: R. Nayar (Senior Instrument Systems Engineer)
        
        OBSERVATION:
        Intermittent solenoid trips during peak loads.
        
        DIAGNOSIS:
        Found solenoid coil temperature exceeding 85°C. Cleaned dust coating and re-routed instrumentation air duct to supply cooling air. Trips resolved.
        """,
        doc_type="Inspection Report",
        forced_author="R. Nayar"
    )

    # Update freshness metrics in DB
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE documents SET age_years = 10, reference_count = 6, contradiction_count = 2, hardware_generation = 'Gen 1' WHERE id = ?", (doc1["id"],))
    cursor.execute("UPDATE documents SET age_years = 8, reference_count = 3, contradiction_count = 0, hardware_generation = 'Gen 1' WHERE id = ?", (doc2["id"],))
    cursor.execute("UPDATE documents SET age_years = 2, reference_count = 1, contradiction_count = 0, hardware_generation = 'Gen 2' WHERE id = ?", (doc3["id"],))
    cursor.execute("UPDATE documents SET age_years = 1, reference_count = 0, contradiction_count = 0, hardware_generation = 'Gen 2' WHERE id = ?", (doc4["id"],))
    cursor.execute("UPDATE documents SET age_years = 7, reference_count = 5, contradiction_count = 0, hardware_generation = 'Gen 2' WHERE id = ?", (doc5["id"],))
    cursor.execute("UPDATE documents SET age_years = 5, reference_count = 8, contradiction_count = 1, hardware_generation = 'Gen 2' WHERE id = ?", (doc6["id"],))
    cursor.execute("UPDATE documents SET age_years = 4, reference_count = 12, contradiction_count = 3, hardware_generation = 'Gen 1' WHERE id = ?", (doc7["id"],))
    cursor.execute("UPDATE documents SET age_years = 2, reference_count = 14, contradiction_count = 0, hardware_generation = 'Gen 2' WHERE id = ?", (doc8["id"],))
    cursor.execute("UPDATE documents SET age_years = 1, reference_count = 9, contradiction_count = 1, hardware_generation = 'Gen 2' WHERE id = ?", (doc9["id"],))
    conn.commit()
    conn.close()

    print("Database seeding completed.")

if __name__ == "__main__":
    seed_data()
