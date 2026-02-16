/**
 * @typedef {Object} Molecule
 * @property {string} name
 * @property {string} formula
 * @property {string} smiles
 * @property {number} molecularWeight
 * @property {string} [description]
 */

export const PRESET_MOLECULES = [
  { name: "Methane", formula: "CH4", smiles: "C", molecularWeight: 16.04, description: "Simplest alkane, main component of natural gas" },
  { name: "Water", formula: "H2O", smiles: "O", molecularWeight: 18.02, description: "Essential for life, universal solvent" },
  { name: "Carbon Dioxide", formula: "CO2", smiles: "O=C=O", molecularWeight: 44.01, description: "Greenhouse gas, product of respiration" },
  { name: "Ammonia", formula: "NH3", smiles: "N", molecularWeight: 17.03, description: "Pungent gas, used in fertilizers" },
  { name: "Ethane", formula: "C2H6", smiles: "CC", molecularWeight: 30.07, description: "Second simplest alkane" },
  { name: "Ethanol", formula: "C2H5OH", smiles: "CCO", molecularWeight: 46.07, description: "Drinking alcohol, biofuel" },
  { name: "Methanol", formula: "CH3OH", smiles: "CO", molecularWeight: 32.04, description: "Simplest alcohol, wood alcohol" },
  { name: "Propane", formula: "C3H8", smiles: "CCC", molecularWeight: 44.10, description: "Common fuel gas for grills" },
  { name: "Butane", formula: "C4H10", smiles: "CCCC", molecularWeight: 58.12, description: "Lighter fuel" },
  { name: "Benzene", formula: "C6H6", smiles: "c1ccccc1", molecularWeight: 78.11, description: "Aromatic hydrocarbon, ring structure" },
  { name: "Glucose", formula: "C6H12O6", smiles: "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O", molecularWeight: 180.16, description: "Simple sugar, energy source" },
  { name: "Acetic Acid", formula: "CH3COOH", smiles: "CC(=O)O", molecularWeight: 60.05, description: "Vinegar acid" },
  { name: "Oxygen", formula: "O2", smiles: "O=O", molecularWeight: 32.00, description: "Essential for respiration" },
  { name: "Nitrogen", formula: "N2", smiles: "N#N", molecularWeight: 28.01, description: "78% of Earth's atmosphere" },
  { name: "Hydrogen", formula: "H2", smiles: "[H][H]", molecularWeight: 2.02, description: "Lightest element, clean fuel" },
];

// Formula to SMILES mapping for common inputs
export const FORMULA_TO_SMILES = {
  "CH4": "C",
  "H2O": "O",
  "CO2": "O=C=O",
  "NH3": "N",
  "C2H6": "CC",
  "C2H5OH": "CCO",
  "C2H6O": "CCO",
  "CH3OH": "CO",
  "CH4O": "CO",
  "C3H8": "CCC",
  "C4H10": "CCCC",
  "C6H6": "c1ccccc1",
  "C6H12O6": "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O",
  "CH3COOH": "CC(=O)O",
  "C2H4O2": "CC(=O)O",
  "O2": "O=O",
  "N2": "N#N",
  "H2": "[H][H]",
  "HCL": "Cl",
  "NACL": "[Na]Cl",
  "H2SO4": "OS(=O)(=O)O",
  "HNO3": "[N+](=O)(O)[O-]",
  "C6H8O7": "OC(=O)CC(O)(CC(=O)O)C(=O)O",
  "CAFFEINE": "Cn1cnc2c1c(=O)n(c(=O)n2C)C",
  "ASPIRIN": "CC(=O)Oc1ccccc1C(=O)O",
};

/**
 * @typedef {'lewis' | 'bondline' | 'structural' | '3d'} VisualizationMode
 */

export const VISUALIZATION_MODES = [
  { value: "structural", label: "Structural Formula", description: "Simple diagram showing all atoms with straight lines" },
  { value: "lewis", label: "Lewis Structure", description: "Electron dot diagram showing all atoms and bonds" },
  { value: "bondline", label: "Bond-line Structure", description: "Skeletal formula commonly used in organic chemistry" },
  { value: "3d", label: "3D Ball-and-stick", description: "Interactive three-dimensional molecular model" },
];