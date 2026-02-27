-- Restore category default variables for all categories
-- Run this SQL in your Supabase SQL editor to restore the deleted category defaults

INSERT INTO document_default_variables (category, document_type, description, variables) 
VALUES
  -- ARCHITECTURE Category Defaults
  (
    'ARCHITECTURE',
    'CATEGORY_DEFAULTS',
    'Default variables for Architecture category',
    '[
      {
        "id": "arch-category-deadline",
        "name": "Category Deadline",
        "type": "date",
        "description": "Deadline for the Architecture category",
        "isDefault": true
      },
      {
        "id": "arch-drawing-scale-standard",
        "name": "Drawing Scale Standard",
        "type": "text",
        "description": "Standard scale for architectural drawings",
        "isDefault": true
      },
      {
        "id": "arch-grid-system",
        "name": "Grid System",
        "type": "text",
        "description": "Grid system reference for the project",
        "isDefault": true
      },
      {
        "id": "arch-level-reference",
        "name": "Level Reference",
        "type": "text",
        "description": "Level reference system used in the project",
        "isDefault": true
      },
      {
        "id": "arch-room-numbering-system",
        "name": "Room Numbering System",
        "type": "text",
        "description": "Room numbering convention for the project",
        "isDefault": true
      },
      {
        "id": "arch-material-coding-system",
        "name": "Material Coding System",
        "type": "text",
        "description": "Material coding system used in the project",
        "isDefault": true
      }
    ]'::jsonb
  ),
  
  -- CONSTRUCTION Category Defaults
  (
    'CONSTRUCTION',
    'CATEGORY_DEFAULTS',
    'Default variables for Construction category',
    '[
      {
        "id": "const-category-deadline",
        "name": "Category Deadline",
        "type": "date",
        "description": "Deadline for the Construction category",
        "isDefault": true
      },
      {
        "id": "const-consequence-class",
        "name": "Consequence Class (KK)",
        "type": "dropdown",
        "description": "Consequence class for the structural design",
        "dropdownOptions": [
          { "displayText": "KK1", "value": "KK1" },
          { "displayText": "KK2", "value": "KK2" },
          { "displayText": "KK3", "value": "KK3" }
        ],
        "isDefault": true
      },
      {
        "id": "const-design-working-life",
        "name": "Design Working Life",
        "type": "text",
        "description": "Expected design working life of the structure",
        "isDefault": true
      },
      {
        "id": "const-structural-class",
        "name": "Structural Class",
        "type": "text",
        "description": "Structural class of the building",
        "isDefault": true
      },
      {
        "id": "const-load-standards",
        "name": "Load Standards",
        "type": "text",
        "description": "Load standards applied to the project",
        "isDefault": true
      },
      {
        "id": "const-concrete-class",
        "name": "Concrete Class",
        "type": "text",
        "description": "Concrete class specification",
        "isDefault": true
      },
      {
        "id": "const-steel-grade",
        "name": "Steel Grade",
        "type": "text",
        "description": "Steel grade specification",
        "isDefault": true
      },
      {
        "id": "const-geotechnical-category",
        "name": "Geotechnical Category",
        "type": "dropdown",
        "description": "Geotechnical category of the project",
        "dropdownOptions": [
          { "displayText": "GK1", "value": "GK1" },
          { "displayText": "GK2", "value": "GK2" },
          { "displayText": "GK3", "value": "GK3" }
        ],
        "isDefault": true
      }
    ]'::jsonb
  ),
  
  -- FIRE Category Defaults
  (
    'FIRE',
    'CATEGORY_DEFAULTS',
    'Default variables for Fire Safety category',
    '[
      {
        "id": "fire-category-deadline",
        "name": "Category Deadline",
        "type": "date",
        "description": "Deadline for the Fire Safety category",
        "isDefault": true
      },
      {
        "id": "fire-strategy-level",
        "name": "Fire Strategy Level",
        "type": "dropdown",
        "description": "Fire strategy level for the building",
        "dropdownOptions": [
          { "displayText": "Level 1", "value": "Level 1" },
          { "displayText": "Level 2", "value": "Level 2" },
          { "displayText": "Level 3", "value": "Level 3" }
        ],
        "isDefault": true
      },
      {
        "id": "fire-building-class",
        "name": "Building Class (Fire)",
        "type": "text",
        "description": "Fire classification of the building",
        "isDefault": true
      },
      {
        "id": "fire-occupancy-category",
        "name": "Occupancy Category",
        "type": "text",
        "description": "Occupancy category for fire safety",
        "isDefault": true
      },
      {
        "id": "fire-escape-route-requirements",
        "name": "Escape Route Requirements",
        "type": "text",
        "description": "Escape route requirements for the building",
        "isDefault": true
      },
      {
        "id": "fire-resistance-standard",
        "name": "Fire Resistance Standard",
        "type": "text",
        "description": "Fire resistance standard applied",
        "isDefault": true
      },
      {
        "id": "fire-sprinkler-system",
        "name": "Sprinkler System",
        "type": "dropdown",
        "description": "Sprinkler system requirement",
        "dropdownOptions": [
          { "displayText": "Required", "value": "Required" },
          { "displayText": "Not Required", "value": "Not Required" },
          { "displayText": "Optional", "value": "Optional" }
        ],
        "isDefault": true
      }
    ]'::jsonb
  ),
  
  -- AUTHORITY PROCESSING Category Defaults
  (
    'AUTHORITY PROCESSING',
    'CATEGORY_DEFAULTS',
    'Default variables for Authority Processing category',
    '[
      {
        "id": "auth-category-deadline",
        "name": "Category Deadline",
        "type": "date",
        "description": "Deadline for the Authority Processing category",
        "isDefault": true
      },
      {
        "id": "auth-permit-application-number",
        "name": "Permit Application Number",
        "type": "text",
        "description": "Permit application number",
        "isDefault": true
      },
      {
        "id": "auth-municipality",
        "name": "Municipality",
        "type": "text",
        "description": "Municipality handling the permit",
        "isDefault": true
      },
      {
        "id": "auth-case-officer",
        "name": "Case Officer",
        "type": "text",
        "description": "Case officer responsible for the permit",
        "isDefault": true
      },
      {
        "id": "auth-submission-phase",
        "name": "Submission Phase",
        "type": "dropdown",
        "description": "Current submission phase",
        "dropdownOptions": [
          { "displayText": "Pre-submission", "value": "Pre-submission" },
          { "displayText": "Submitted", "value": "Submitted" },
          { "displayText": "Under Review", "value": "Under Review" },
          { "displayText": "Approved", "value": "Approved" },
          { "displayText": "Rejected", "value": "Rejected" }
        ],
        "isDefault": true
      },
      {
        "id": "auth-approval-status",
        "name": "Approval Status",
        "type": "dropdown",
        "description": "Current approval status",
        "dropdownOptions": [
          { "displayText": "Pending", "value": "Pending" },
          { "displayText": "Approved", "value": "Approved" },
          { "displayText": "Conditionally Approved", "value": "Conditionally Approved" },
          { "displayText": "Rejected", "value": "Rejected" }
        ],
        "isDefault": true
      }
    ]'::jsonb
  ),
  
  -- ENERGY Category Defaults
  (
    'ENERGY',
    'CATEGORY_DEFAULTS',
    'Default variables for Energy category',
    '[
      {
        "id": "energy-category-deadline",
        "name": "Category Deadline",
        "type": "date",
        "description": "Deadline for the Energy category",
        "isDefault": true
      },
      {
        "id": "energy-frame",
        "name": "Energy Frame",
        "type": "text",
        "description": "Energy frame for the building",
        "isDefault": true
      },
      {
        "id": "energy-heated-floor-area",
        "name": "Heated Floor Area",
        "type": "number",
        "description": "Heated floor area in square meters",
        "isDefault": true
      },
      {
        "id": "energy-target-class",
        "name": "Target Energy Class",
        "type": "dropdown",
        "description": "Target energy class for the building",
        "dropdownOptions": [
          { "displayText": "BR18 2020", "value": "BR18 2020" },
          { "displayText": "BR18 Low Energy", "value": "BR18 Low Energy" },
          { "displayText": "Building Class 2025", "value": "Building Class 2025" }
        ],
        "isDefault": true
      },
      {
        "id": "energy-envelope-standard",
        "name": "Building Envelope Standard",
        "type": "text",
        "description": "Building envelope standard applied",
        "isDefault": true
      },
      {
        "id": "energy-primary-factor",
        "name": "Primary Energy Factor",
        "type": "number",
        "description": "Primary energy factor",
        "isDefault": true
      },
      {
        "id": "energy-reference-building-values",
        "name": "Reference Building Values",
        "type": "text",
        "description": "Reference building values for comparison",
        "isDefault": true
      }
    ]'::jsonb
  ),
  
  -- HVAC Category Defaults
  (
    'HVAC',
    'CATEGORY_DEFAULTS',
    'Default variables for HVAC category',
    '[
      {
        "id": "hvac-category-deadline",
        "name": "Category Deadline",
        "type": "date",
        "description": "Deadline for the HVAC category",
        "isDefault": true
      },
      {
        "id": "hvac-indoor-climate-category",
        "name": "Indoor Climate Category",
        "type": "dropdown",
        "description": "Indoor climate category",
        "dropdownOptions": [
          { "displayText": "Category I", "value": "Category I" },
          { "displayText": "Category II", "value": "Category II" },
          { "displayText": "Category III", "value": "Category III" }
        ],
        "isDefault": true
      },
      {
        "id": "hvac-design-temp-winter",
        "name": "Design Indoor Temperature (Winter)",
        "type": "number",
        "description": "Design indoor temperature for winter in °C",
        "isDefault": true
      },
      {
        "id": "hvac-design-temp-summer",
        "name": "Design Indoor Temperature (Summer)",
        "type": "number",
        "description": "Design indoor temperature for summer in °C",
        "isDefault": true
      },
      {
        "id": "hvac-min-ventilation-rate",
        "name": "Minimum Ventilation Rate",
        "type": "number",
        "description": "Minimum ventilation rate in l/s per person",
        "isDefault": true
      },
      {
        "id": "hvac-ventilation-system-type",
        "name": "Ventilation System Type",
        "type": "dropdown",
        "description": "Type of ventilation system",
        "dropdownOptions": [
          { "displayText": "Natural Ventilation", "value": "Natural Ventilation" },
          { "displayText": "Mechanical Ventilation", "value": "Mechanical Ventilation" },
          { "displayText": "Hybrid Ventilation", "value": "Hybrid Ventilation" }
        ],
        "isDefault": true
      },
      {
        "id": "hvac-heat-recovery-efficiency",
        "name": "Heat Recovery Efficiency",
        "type": "number",
        "description": "Heat recovery efficiency in percentage",
        "isDefault": true
      }
    ]'::jsonb
  ),
  
  -- EXECUTION CONTROL Category Defaults
  (
    'EXECUTION CONTROL',
    'CATEGORY_DEFAULTS',
    'Default variables for Execution Control category',
    '[
      {
        "id": "exec-category-deadline",
        "name": "Category Deadline",
        "type": "date",
        "description": "Deadline for the Execution Control category",
        "isDefault": true
      },
      {
        "id": "exec-quality-control-level",
        "name": "Quality Control Level",
        "type": "dropdown",
        "description": "Quality control level for the project",
        "dropdownOptions": [
          { "displayText": "Normal", "value": "Normal" },
          { "displayText": "Extended", "value": "Extended" },
          { "displayText": "Enhanced", "value": "Enhanced" }
        ],
        "isDefault": true
      },
      {
        "id": "exec-inspection-frequency",
        "name": "Inspection Frequency",
        "type": "dropdown",
        "description": "Frequency of inspections",
        "dropdownOptions": [
          { "displayText": "Weekly", "value": "Weekly" },
          { "displayText": "Bi-weekly", "value": "Bi-weekly" },
          { "displayText": "Monthly", "value": "Monthly" },
          { "displayText": "As needed", "value": "As needed" }
        ],
        "isDefault": true
      },
      {
        "id": "exec-third-party-inspector",
        "name": "Third-Party Inspector",
        "type": "text",
        "description": "Third-party inspector information",
        "isDefault": true
      },
      {
        "id": "exec-approved-inspector",
        "name": "Approved Inspector/Company",
        "type": "text",
        "description": "Name of approved inspector or company",
        "isDefault": true
      },
      {
        "id": "exec-control-plan-reference",
        "name": "Control Plan Reference",
        "type": "text",
        "description": "Reference to the control plan",
        "isDefault": true
      },
      {
        "id": "exec-test-standards",
        "name": "Test Standards",
        "type": "text",
        "description": "Test standards applied",
        "isDefault": true
      },
      {
        "id": "exec-acceptance-criteria",
        "name": "Acceptance Criteria",
        "type": "text",
        "description": "Acceptance criteria for the project",
        "isDefault": true
      },
      {
        "id": "exec-documentation-standard",
        "name": "Documentation Standard",
        "type": "text",
        "description": "Documentation standard applied",
        "isDefault": true
      },
      {
        "id": "exec-responsible-control-authority",
        "name": "Responsible Control Authority",
        "type": "text",
        "description": "Responsible control authority",
        "isDefault": true
      },
      {
        "id": "exec-control-log-system",
        "name": "Control Log System",
        "type": "text",
        "description": "Control log system used",
        "isDefault": true
      }
    ]'::jsonb
  )
ON CONFLICT (category, document_type) DO UPDATE SET
  description = EXCLUDED.description,
  variables = EXCLUDED.variables,
  updated_at = now();
