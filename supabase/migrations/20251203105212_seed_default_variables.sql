INSERT INTO document_default_variables (category, document_type, description, variables) 
VALUES
  (
    'GLOBAL',
    'GLOBAL',
    'Common variables for all documents',
    '[
      {
        "id": "project-name",
        "name": "Project Name",
        "type": "text",
        "description": "The name of the project"
      },
      {
        "id": "global-client",
        "name": "Client",
        "type": "text",
        "description": "The name of the primary client or client organization"
      },
      {
        "id": "global-client-address",
        "name": "Client Address",
        "type": "text",
        "description": "The address of the primary client or client organization"
      },
      {
        "id": "global-client-CVR",
        "name": "Client CVR",
        "type": "text",
        "description": "The CVR number of the primary client or client organization"
      },
      {
        "id": "global-client-phone-number",
        "name": "Contact Person Phone Number",
        "type": "text", 
        "description": "The phone number of the contact person of the primary client"
      },
      {
        "id": "global-client-email",
        "name": "Contact Person Email",
        "type": "text",
        "description": "The email of the contact person of the primary client"
      },
      {
        "id": "global-project-address",
        "name": "Project Address",
        "type": "text",
        "description": "The construction site address"
      },
      {
        "id": "global-cadastral-number",
        "name": "Cadastral Number",
        "type": "text",
        "description": "The cadastral number of the project"
      },
      {
        "id": "global-project-deadline",
        "name": "Project Deadline",
        "type": "date",
        "description": "The main delivery date of the project"
      },
      {
        "id": "global-project-construction-class",
        "name": "Construction Class (KK)",
        "type": "dropdown",
        "description": "The construction class of the project",
        "dropdownOptions": [
          { "displayText": "KK1", "value": "KK1" },
          { "displayText": "KK2", "value": "KK2" },
          { "displayText": "KK3", "value": "KK3" }
        ]
      }
    ]'::jsonb
  ),
  (
    'ARCHITECTURE',
    'ARK1 Design Brief',
    'High-level architectural scope and success criteria',
    '[
      {
        "id": "ark1-room-program",
        "name": "Room Program",
        "type": "text",
        "description": "Summary of room program"
      },
      {
        "id": "ark1-area-schedule",
        "name": "Area Schedule (m2)",
        "type": "number",
        "description": "Area Schedule"
      },
      {
        "id": "ark1-mep-requirements",
        "name": "Mechanical, Electrical, and Plumbing (MEP) Requirements",
        "type": "text",
        "description": "Description of MEP requirements"
      },
      {
        "id": "ark1-exterior-materials",
        "name": "Exterior Materials (facade)",
        "type": "text",
        "description": "Description of the exterior materials of the facade"
      }
    ]'::jsonb
  ),
  (
    'FIRE',
    'F0.1 START',
    'Summary of the fire safety of the project',
    '[
      {
        "id": "f01-natioanl-fire-code",
        "name": "Natioanl Fire Code",
        "type": "dropdown",
        "description": "Description of the exterior materials of the facade",
        "dropdownOptions": [
          { "displayText": "Code 1", "value": "Code 1" },
          { "displayText": "Code 2", "value": "Code 2" },
          { "displayText": "Code 3", "value": "Code 3" }
        ]
      },
      {
        "id": "f01-occupancy-type",
        "name": "Occupancy Type per Room/Zone",
        "type": "dropdown",
        "description": "",
        "dropdownOptions": [
          { "displayText": "Type 1", "value": "Type 1" },
          { "displayText": "Type 2", "value": "Type 2" },
          { "displayText": "Type 3", "value": "Type 3" }
        ]
      },
      {
        "id": "f01-max-occupant-load",
        "name": "Maximum Occupant Load (people per area)",
        "type": "number",
        "description": ""
      },
      {
        "id": "f01-special-user-group",
        "name": "Special User Group",
        "type": "dropdown",
        "description": "",
        "dropdownOptions": [
          { "displayText": "Children", "value": "Children" },
          { "displayText": "Elderly", "value": "Elderly" },
          { "displayText": "Mobility-impaired Persons", "value": "Mobility-impaired Persons" }
        ]
      }
    ]'::jsonb
  ),
  (
    'AUTHORITY PROCESSING',
    'Permit Package',
    'Submission-ready material for authority approvals',
    '[
      {
        "id": "auth-permit-case-id",
        "name": "Permit Case ID",
        "type": "text",
        "description": ""
      },
      {
        "id": "auth-permit-application-date",
        "name": "Application Date for Permit",
        "type": "date",
        "description": ""
      }
    ]'::jsonb
  ),
  (
    'ENERGY',
    'E1 Performance Report',
    'Energy usage calculations and recommendations',
    '[
      {
        "id": "e1-energy-demand",
        "name": "Energy Demand",
        "type": "number",
        "description": ""
      },
      {
        "id": "e1-energy-reference-year",
        "name": "Reference Year",
        "type": "date",
        "description": ""
      }
    ]'::jsonb
  ),
  (
    'CONSTRUCTION',
    'A1 Konstruktionsgrundlag',
    'Load calculations, materials, and compliance overview',
    '[
      {
        "id": "a1-foundation-type",
        "name": "Foundation Type",
        "type": "dropdown",
        "description": "The type of foundation for the project",
        "dropdownOptions": [
          { "displayText": "Concrete Foundation", "value": "Concrete Foundation" },
          { "displayText": "Pile Foundation", "value": "Pile Foundation" },
          { "displayText": "Sheet Pile Foundation", "value": "Sheet Pile Foundation" }
        ]
      },
      {
        "id": "a1-roof-structure",
        "name": "Roof Structure",
        "type": "dropdown",
        "description": "The type of roof structure for the project",
        "dropdownOptions": [
          { "displayText": "Flat Roof", "value": "Flat Roof" },
          { "displayText": "Slope Roof", "value": "Slope Roof" },
          { "displayText": "Curved Roof", "value": "Curved Roof" }
        ]
      },
      {
        "id": "a1-structural-analysis-software",
        "name": "Structural Analysis Software",
        "type": "dropdown",
        "description": "The software used for structural analysis",
        "dropdownOptions": [
          { "displayText": "Robot Structural Analysis", "value": "Robot Structural Analysis" },
          { "displayText": "FEB-Design", "value": "FEB-Design" },
          { "displayText": "Strusoft", "value": "Strusoft" }
        ]
      },
      {
        "id": "a1-snow-zone",
        "name": "Snow Zone",
        "type": "text",
        "description": "The snow zone of the project"
      },
      {
        "id": "a1-snow-parameters",
        "name": "Snow Parameters",
        "type": "number",
        "description": "The snow parameter of the project"
      },
      {
        "id": "a1-wind-zone",
        "name": "Wind Zone",
        "type": "text",
        "description": "The wind zone of the project"
      },
      {
        "id": "a1-wind-parameters",
        "name": "Wind Parameters",
        "type": "number",
        "description": "The wind parameter of the project"
      }
    ]'::jsonb
  ),
  (
    'CONSTRUCTION',
    'A2 Statiske beregninger',
    'Structural Design Calculations & Verification Documentation',
    '[
      {
        "id": "a2-date-calculation",
        "name": "Date of Performed Calculation",
        "type": "date",
        "description": "The date of the performed calculation"
      },
      {
        "id": "a2-connection-type",
        "name": "Connection Type",
        "type": "dropdown",
        "description": "The type of connection for the project",
        "dropdownOptions": [
          { "displayText": "Bolted Connection", "value": "Bolted Connection" },
          { "displayText": "Welded Connection", "value": "Welded Connection" },
          { "displayText": "Screwed Connection", "value": "Screwed Connection" }
        ]
      },
      {
        "id": "a2-max-bending-moment",
        "name": "Max bending moment (kNm)",
        "type": "number",
        "description": "The max bending moment (kNm)"
      },
      {
        "id": "a2-max-shear-force",
        "name": "Max Shear Force (kN)",
        "type": "number",
        "description": "The max shear force (kN)"
      }
    ]'::jsonb
  )
  -- [DocumentCategory.HVAC]: [
  --   {
  --     id: "hvac-specification",
  --     name: "System Specification",
  --     description: "HVAC equipment sizing and operating parameters.",
  --     lastUpdated: "yesterday",
  --     variables: [
  --       { id: "hvac-airflow", name: "Airflow", type: "number" },
  --     ],
  --   },
  -- ],
  -- [DocumentCategory.EXECUTION_CONTROL]: [
  --   {
  --     id: "execution-inspection",
  --     name: "Inspection Checklist",
  --     description: "On-site inspection and sign-off criteria.",
  --     lastUpdated: "9 days ago",
  --     variables: [
  --       { id: "inspection-date", name: "Inspection Date", type: "date" },
  --     ],
  --   },
  -- ],