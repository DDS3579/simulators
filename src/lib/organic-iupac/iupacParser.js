// IUPAC Name Parser and Structure Generator

// Parent chain name to carbon count mapping
const PARENT_CHAINS = {
  'meth': 1,
  'eth': 2,
  'prop': 3,
  'but': 4,
  'pent': 5,
  'hex': 6,
  'hept': 7,
  'oct': 8,
  'non': 9,
  'dec': 10,
  'undec': 11,
  'dodec': 12,
};

// Substituent prefixes
const SUBSTITUENT_PREFIXES = {
  'methyl': 1,
  'ethyl': 2,
  'propyl': 3,
  'isopropyl': 3,
  'butyl': 4,
  'isobutyl': 4,
  'tert-butyl': 4,
  'pentyl': 5,
  'hexyl': 6,
};

// Multiplicity prefixes
const MULTIPLICITY = {
  'di': 2,
  'tri': 3,
  'tetra': 4,
  'penta': 5,
  'hexa': 6,
};

// Functional group suffixes
const FUNCTIONAL_GROUPS = {
  'ol': 'alcohol',
  'al': 'aldehyde',
  'one': 'ketone',
  'oic acid': 'carboxylic-acid',
  'amine': 'amine',
  'ene': 'alkene',
  'yne': 'alkyne',
  'ane': 'none',
};

// Atomic weights
const ATOMIC_WEIGHTS = {
  'C': 12.01,
  'H': 1.008,
  'O': 16.00,
  'N': 14.01,
};

export function parseIUPACName(name) {
  const steps = [];
  const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Initialize result
  let result = {
    name: name,
    parentChain: '',
    parentCarbonCount: 0,
    substituents: [],
    functionalGroup: { type: 'none', position: null, suffix: 'ane' },
    carbonAtoms: [],
    molecularFormula: '',
    molecularWeight: 0,
    isValid: false,
    parsingSteps: steps,
  };

  try {
    // STEP 1: Parse Parent Chain
    const parentChainResult = parseParentChain(normalizedName);
    const parentChainNames = {
      1: 'meth (1 carbon)',
      2: 'eth (2 carbons)',
      3: 'prop (3 carbons)',
      4: 'but (4 carbons)',
      5: 'pent (5 carbons)',
      6: 'hex (6 carbons)',
      7: 'hept (7 carbons)',
      8: 'oct (8 carbons)',
      9: 'non (9 carbons)',
      10: 'dec (10 carbons)',
    };
    
    steps.push({
      step: 1,
      title: '📝 Step 1: Find the Parent Chain (Backbone)',
      description: 'Look at the ending of the name to find the root word. The root tells you how many carbon atoms are in the main chain. Common roots: meth=1, eth=2, prop=3, but=4, pent=5, hex=6, hept=7, oct=8, non=9, dec=10.',
      result: parentChainResult.found 
        ? `✅ Found "${parentChainResult.name}" → Draw ${parentChainResult.carbonCount} carbon atom(s) in a straight horizontal line: ${Array.from({length: parentChainResult.carbonCount}, (_, i) => `C${i+1}`).join(' — ')}`
        : '❌ Could not identify parent chain. Check the spelling!',
      status: parentChainResult.found ? 'success' : 'error',
    });

    if (!parentChainResult.found) {
      result.error = `Could not identify parent chain in "${name}". Expected names like methane, ethane, propane, etc.`;
      return result;
    }

    result.parentChain = parentChainResult.name;
    result.parentCarbonCount = parentChainResult.carbonCount;

    // STEP 2: Identify Functional Groups
    const funcGroupResult = parseFunctionalGroup(normalizedName, parentChainResult.name);
    
    const funcGroupInstructions = {
      'alcohol': 'Attach -OH group to the specified carbon. Draw: C-O-H',
      'aldehyde': 'Attach -CHO group at carbon 1 (end). Draw: C with double bond to O and single bond to H',
      'ketone': 'Attach =O (double bond to oxygen) to the middle carbon. Draw: C=O',
      'carboxylic-acid': 'Attach -COOH group at carbon 1. Draw: C with double bond to O and single bond to O-H',
      'amine': 'Attach -NH₂ group to the specified carbon. Draw: C-N-H₂',
      'alkene': 'Create a C=C double bond between the specified carbons',
      'alkyne': 'Create a C≡C triple bond between the specified carbons',
      'none': 'This is a simple alkane with only C-C single bonds and C-H bonds',
    };
    
    steps.push({
      step: 2,
      title: '🔬 Step 2: Identify the Functional Group',
      description: 'Look at the suffix (ending) of the name. -ane = alkane (no functional group), -ol = alcohol (-OH), -al = aldehyde (-CHO), -one = ketone (=O), -oic acid = carboxylic acid (-COOH), -amine = amine (-NH₂), -ene = alkene (C=C), -yne = alkyne (C≡C).',
      result: funcGroupResult.type !== 'none'
        ? `✅ Found ${funcGroupResult.type.toUpperCase()} at carbon ${funcGroupResult.position || 1}. ${funcGroupInstructions[funcGroupResult.type]}`
        : `ℹ️ No functional group found — this is a simple ALKANE. ${funcGroupInstructions['none']}`,
      status: 'success',
    });

    result.functionalGroup = funcGroupResult;

    // STEP 3: Parse Substituents
    const substituentResult = parseSubstituents(normalizedName, parentChainResult.name);
    
    // Group substituents by position for clearer instructions
    const substituentsByPosition = {};
    substituentResult.forEach(sub => {
      if (!substituentsByPosition[sub.position]) {
        substituentsByPosition[sub.position] = [];
      }
      substituentsByPosition[sub.position].push(sub);
    });
    
    let substituentInstructions = '';
    if (substituentResult.length > 0) {
      const instructions = Object.entries(substituentsByPosition).map(([pos, subs]) => {
        const subNames = subs.map(s => `-${s.type.toUpperCase()} (${s.carbonCount} carbon${s.carbonCount > 1 ? 's' : ''})`).join(' and ');
        const direction = subs.length > 1 ? '(one above, one below the chain)' : '(above or below the chain)';
        return `At C${pos}: attach ${subNames} ${direction}`;
      }).join('; ');
      substituentInstructions = `✅ ${instructions}`;
    } else {
      substituentInstructions = 'ℹ️ No substituents — the main chain has no branches attached.';
    }
    
    steps.push({
      step: 3,
      title: '🌿 Step 3: Find the Substituents (Branches)',
      description: 'Look at the beginning of the name for branch names and their positions. The numbers before the name tell you WHERE to attach the branch. Common branches: methyl (-CH₃), ethyl (-C₂H₅), propyl (-C₃H₇). Prefixes like "di-" mean 2, "tri-" means 3, etc.',
      result: substituentInstructions,
      status: 'success',
    });

    result.substituents = substituentResult;

    // Validate positions
    const invalidPosition = substituentResult.find(s => s.position < 1 || s.position > result.parentCarbonCount);
    if (invalidPosition) {
      steps.push({
        step: 3,
        title: '⚠️ Position Error',
        description: 'The position number must be between 1 and the total number of carbons in the chain.',
        result: `❌ Position ${invalidPosition.position} is invalid! The chain only has ${result.parentCarbonCount} carbons (positions 1 to ${result.parentCarbonCount}).`,
        status: 'error',
      });
      result.error = `Invalid position ${invalidPosition.position} for a ${result.parentCarbonCount}-carbon chain`;
      return result;
    }

    // STEP 4: Build Molecular Structure - with detailed drawing instructions
    const carbonAtoms = buildMolecularStructure(result);
    
    // Create step-by-step drawing instructions
    let drawingSteps = [];
    drawingSteps.push(`1️⃣ Draw ${result.parentCarbonCount} carbons in a row connected by single bonds`);
    if (substituentResult.length > 0) {
      Object.entries(substituentsByPosition).forEach(([pos, subs], idx) => {
        const subText = subs.map((s, i) => {
          const direction = i % 2 === 0 ? 'ABOVE' : 'BELOW';
          return `${s.type} ${direction}`;
        }).join(' and ');
        drawingSteps.push(`${2 + idx}️⃣ At carbon ${pos}, attach: ${subText}`);
      });
    }
    if (funcGroupResult.type !== 'none') {
      drawingSteps.push(`${drawingSteps.length + 1}️⃣ At carbon ${funcGroupResult.position || 1}, add the ${funcGroupResult.type} group`);
    }
    
    steps.push({
      step: 4,
      title: '✏️ Step 4: Draw the Structure',
      description: 'Now combine everything! Start with the main chain, then add branches and functional groups at their specified positions.',
      result: drawingSteps.join('\n'),
      status: 'success',
    });

    result.carbonAtoms = carbonAtoms;

    // STEP 5: Calculate Hydrogen Count with explanation
    calculateHydrogenCount(result);
    const totalH = result.carbonAtoms.reduce((sum, c) => sum + c.hydrogenCount, 0) +
      result.substituents.reduce((sum, s) => sum + (s.carbonCount * 2 + 1), 0);
    
    // Create hydrogen distribution explanation
    const hydrogenDetails = result.carbonAtoms.map((atom, idx) => {
      let explanation = `C${idx + 1}: ${atom.hydrogenCount}H`;
      if (atom.substituents.length > 0) {
        explanation += ` (has ${atom.substituents.length} branch${atom.substituents.length > 1 ? 'es' : ''})`;
      }
      if (atom.functionalGroup) {
        explanation += ` (has ${atom.functionalGroup.type})`;
      }
      return explanation;
    }).join(', ');
    
    steps.push({
      step: 5,
      title: '💧 Step 5: Add Hydrogen Atoms',
      description: 'Carbon always makes 4 bonds (valency = 4). Count the existing bonds to each carbon, then add enough H atoms to make 4 total. Formula: H needed = 4 - (existing bonds).',
      result: `Hydrogen distribution: ${hydrogenDetails}\n📊 Total: ${totalH} hydrogen atoms`,
      status: 'success',
    });

    // STEP 6: Generate Coordinates (simplified for students)
    generateCoordinates(result);
    steps.push({
      step: 6,
      title: '📐 Step 6: Arrange for Display',
      description: 'Position atoms for clear visualization. Main chain goes horizontally, branches extend above/below.',
      result: '✅ Structure arranged — main chain horizontal, branches perpendicular',
      status: 'success',
    });

    // STEP 7: Calculate Molecular Formula and Weight with explanation
    const formulaResult = calculateMolecularFormula(result);
    result.molecularFormula = formulaResult.formula;
    result.molecularWeight = formulaResult.weight;
    
    // Parse formula for explanation
    const formulaParts = [];
    const cMatch = formulaResult.formula.match(/C(\d+)/);
    const hMatch = formulaResult.formula.match(/H(\d+)/);
    const oMatch = formulaResult.formula.match(/O(\d*)/);
    const nMatch = formulaResult.formula.match(/N(\d*)/);
    
    if (cMatch) formulaParts.push(`${cMatch[1]} Carbon`);
    if (hMatch) formulaParts.push(`${hMatch[1]} Hydrogen`);
    if (oMatch) formulaParts.push(`${oMatch[1] || 1} Oxygen`);
    if (nMatch) formulaParts.push(`${nMatch[1] || 1} Nitrogen`);
    
    steps.push({
      step: 7,
      title: '🧮 Step 7: Write the Molecular Formula',
      description: 'Count all atoms and write as CₓHᵧOᵤNᵥ. Calculate molecular weight by adding atomic masses (C=12, H=1, O=16, N=14).',
      result: `📝 Formula: ${formulaResult.formula} (${formulaParts.join(' + ')})\n⚖️ Molecular Weight: ${formulaResult.weight.toFixed(2)} g/mol`,
      status: 'success',
    });

    result.isValid = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown parsing error';
    return result;
  }
}

function parseParentChain(name) {
  // Sort by length descending to match longer prefixes first (e.g., "undec" before "dec")
  const sortedChains = Object.entries(PARENT_CHAINS).sort((a, b) => b[0].length - a[0].length);
  
  for (const [prefix, count] of sortedChains) {
    // Check for the prefix followed by a valid suffix (an, en, yn, ol, al, one, ane, ene, yne)
    const regex = new RegExp(`${prefix}(an|en|yn|ol|al|one|ane|ene|yne|oic)`, 'i');
    if (regex.test(name)) {
      return { found: true, name: prefix, carbonCount: count };
    }
  }
  return { found: false, name: '', carbonCount: 0 };
}

function parseFunctionalGroup(name, parentChain) {
  // Pattern: parentchain-position-suffix or parentchan-suffix
  // e.g., "butan-2-ol", "propan-1-ol", "pentan-2-one"
  
  // Check for position-based functional groups with hyphen notation
  const positionMatch = name.match(new RegExp(`${parentChain}[ae]?n?-?(\\d+)?-?(ol|al|one|amine)`, 'i'));
  
  if (positionMatch) {
    const position = positionMatch[1] ? parseInt(positionMatch[1]) : 1;
    const suffix = positionMatch[2].toLowerCase();
    const type = FUNCTIONAL_GROUPS[suffix] || 'none';
    return { type, position, suffix };
  }

  // Check for carboxylic acid
  if (name.includes('oic acid')) {
    return { type: 'carboxylic-acid', position: 1, suffix: 'oic acid' };
  }

  // Check for simple suffix at end without position
  if (name.endsWith('ol') && !name.endsWith('methanol') && !name.endsWith('ethanol')) {
    // Try to extract position if it exists
    const posMatch = name.match(/(\d+)-?ol$/);
    return { type: 'alcohol', position: posMatch ? parseInt(posMatch[1]) : 1, suffix: 'ol' };
  }
  
  if (name.endsWith('al') && name.includes(parentChain)) {
    return { type: 'aldehyde', position: 1, suffix: 'al' };
  }
  
  if (name.endsWith('one')) {
    const posMatch = name.match(/(\d+)-?one$/);
    return { type: 'ketone', position: posMatch ? parseInt(posMatch[1]) : 2, suffix: 'one' };
  }
  
  if (name.endsWith('amine')) {
    const posMatch = name.match(/(\d+)-?amine$/);
    return { type: 'amine', position: posMatch ? parseInt(posMatch[1]) : 1, suffix: 'amine' };
  }
  
  if (name.endsWith('ene') || name.includes('-ene')) {
    const posMatch = name.match(/(\d+)-?ene/);
    return { type: 'alkene', position: posMatch ? parseInt(posMatch[1]) : 1, suffix: 'ene' };
  }
  
  if (name.endsWith('yne') || name.includes('-yne')) {
    const posMatch = name.match(/(\d+)-?yne/);
    return { type: 'alkyne', position: posMatch ? parseInt(posMatch[1]) : 1, suffix: 'yne' };
  }

  return { type: 'none', position: null, suffix: 'ane' };
}

function parseSubstituents(name, parentChain) {
  const substituents = [];
  
  // Remove the parent chain and suffix part for analysis
  const parentIndex = name.indexOf(parentChain);
  if (parentIndex === -1) return substituents;
  
  const prefix = name.substring(0, parentIndex);
  if (!prefix) return substituents;

  // Pattern: positions-[multiplicity]substituent
  // e.g., "3,3-diethyl", "2-methyl", "2,3,4-trimethyl", "2,2,4-trimethyl"
  // Also handle patterns without multiplicity prefix like "3-ethyl-3-methyl"
  
  // Split by hyphens but keep the numbers
  const parts = prefix.split('-').filter(p => p.trim());
  
  let currentPositions = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    
    // Check if this part is position numbers (comma-separated digits)
    if (/^[\d,]+$/.test(part)) {
      currentPositions = part.split(',').map(p => parseInt(p.trim())).filter(n => !isNaN(n));
      continue;
    }
    
    // Check for multiplicity prefix + substituent (e.g., "dimethyl", "triethyl")
    let multiplicity = 1;
    let subType = part.toLowerCase();
    
    for (const [mult, count] of Object.entries(MULTIPLICITY)) {
      if (subType.startsWith(mult)) {
        multiplicity = count;
        subType = subType.substring(mult.length);
        break;
      }
    }
    
    // Find the substituent type
    const carbonCount = SUBSTITUENT_PREFIXES[subType];
    if (carbonCount) {
      // If we have explicit positions
      if (currentPositions.length > 0) {
        // Use positions as many times as needed
        for (let j = 0; j < Math.max(currentPositions.length, multiplicity); j++) {
          const pos = currentPositions[j % currentPositions.length];
          substituents.push({
            position: pos,
            type: subType,
            carbonCount: carbonCount,
          });
        }
      } else {
        // No positions specified, default based on multiplicity
        for (let j = 0; j < multiplicity; j++) {
          substituents.push({
            position: 2, // Default to position 2
            type: subType,
            carbonCount: carbonCount,
          });
        }
      }
      currentPositions = []; // Reset positions after using them
    }
  }

  return substituents;
}

function buildMolecularStructure(molecule) {
  const atoms = [];

  for (let i = 1; i <= molecule.parentCarbonCount; i++) {
    const subsAtPosition = molecule.substituents.filter(s => s.position === i);
    const funcGroup = molecule.functionalGroup.position === i ? molecule.functionalGroup : null;

    // Count upward and downward bonds for substituents
    let bondsUp = 0;
    let bondsDown = 0;
    subsAtPosition.forEach((_, idx) => {
      if (idx % 2 === 0) bondsUp++;
      else bondsDown++;
    });

    atoms.push({
      position: i,
      substituents: subsAtPosition,
      functionalGroup: funcGroup,
      hydrogenCount: 0, // Will be calculated later
      x: 0,
      y: 0,
      bondsLeft: i > 1,
      bondsRight: i < molecule.parentCarbonCount,
      bondsUp: bondsUp,
      bondsDown: bondsDown,
    });
  }

  return atoms;
}

function calculateHydrogenCount(molecule) {
  // First, determine which carbons are involved in double/triple bonds
  const doubleBondPositions = new Set();
  const tripleBondPositions = new Set();
  
  if (molecule.functionalGroup.type === 'alkene') {
    const pos = molecule.functionalGroup.position || 1;
    // Double bond is between carbon at position and the next carbon
    doubleBondPositions.add(pos);
    if (pos < molecule.parentCarbonCount) {
      doubleBondPositions.add(pos + 1);
    }
  }
  
  if (molecule.functionalGroup.type === 'alkyne') {
    const pos = molecule.functionalGroup.position || 1;
    // Triple bond is between carbon at position and the next carbon
    tripleBondPositions.add(pos);
    if (pos < molecule.parentCarbonCount) {
      tripleBondPositions.add(pos + 1);
    }
  }
  
  molecule.carbonAtoms.forEach((atom, index) => {
    const position = index + 1; // 1-indexed position
    let bonds = 0;
    
    // C-C bonds in main chain (default single bonds)
    if (index > 0) bonds += 1; // Bond to previous carbon
    if (index < molecule.carbonAtoms.length - 1) bonds += 1; // Bond to next carbon
    
    // Add extra bonds for double/triple bonds
    // Each carbon in a double bond uses 1 extra bond (total 2 between them)
    if (doubleBondPositions.has(position)) {
      bonds += 1; // Extra bond for double bond
    }
    
    // Each carbon in a triple bond uses 2 extra bonds (total 3 between them)
    if (tripleBondPositions.has(position)) {
      bonds += 2; // Extra 2 bonds for triple bond
    }
    
    // Substituent bonds
    bonds += atom.substituents.length;
    
    // Functional group bonds (non-alkene/alkyne)
    if (atom.functionalGroup) {
      switch (atom.functionalGroup.type) {
        case 'alcohol':
          bonds += 1; // C-O-H (single bond to O)
          break;
        case 'aldehyde':
          bonds += 2; // C=O (double bond)
          break;
        case 'ketone':
          bonds += 2; // C=O (double bond)
          break;
        case 'carboxylic-acid':
          bonds += 3; // C(=O)-O-H (double + single)
          break;
        case 'amine':
          bonds += 1; // C-N (single bond)
          break;
        // alkene and alkyne are handled above with position sets
      }
    }
    
    // Carbon has valency of 4
    atom.hydrogenCount = Math.max(0, 4 - bonds);
  });
}

function generateCoordinates(molecule) {
  const spacing = 80;
  const startX = 120;
  const startY = 180;

  molecule.carbonAtoms.forEach((atom, index) => {
    atom.x = startX + index * spacing;
    atom.y = startY;
  });
}

function calculateMolecularFormula(molecule) {
  let carbonCount = molecule.parentCarbonCount;
  let hydrogenCount = 0;
  let oxygenCount = 0;
  let nitrogenCount = 0;

  // Count hydrogens on main chain
  molecule.carbonAtoms.forEach(atom => {
    hydrogenCount += atom.hydrogenCount;
  });

  // Add substituent carbons and hydrogens
  molecule.substituents.forEach(sub => {
    carbonCount += sub.carbonCount;
    // Each substituent carbon contributes: CnH(2n+1) formula for alkyl group
    hydrogenCount += sub.carbonCount * 2 + 1;
  });

  // Add functional group atoms
  switch (molecule.functionalGroup.type) {
    case 'alcohol':
      oxygenCount += 1;
      hydrogenCount += 1; // The H in OH
      break;
    case 'aldehyde':
      oxygenCount += 1;
      // CHO already counted the H in main chain calculation
      break;
    case 'ketone':
      oxygenCount += 1;
      break;
    case 'carboxylic-acid':
      oxygenCount += 2;
      hydrogenCount += 1; // The H in COOH
      break;
    case 'amine':
      nitrogenCount += 1;
      hydrogenCount += 2; // The H2 in NH2
      break;
  }

  // Build formula string in standard order: C, H, N, O (Hill system for organic compounds)
  let formula = '';
  if (carbonCount > 0) formula += `C${carbonCount > 1 ? carbonCount : ''}`;
  if (hydrogenCount > 0) formula += `H${hydrogenCount > 1 ? hydrogenCount : ''}`;
  if (nitrogenCount > 0) formula += `N${nitrogenCount > 1 ? nitrogenCount : ''}`;
  if (oxygenCount > 0) formula += `O${oxygenCount > 1 ? oxygenCount : ''}`;

  // Calculate weight
  const weight = 
    carbonCount * ATOMIC_WEIGHTS['C'] +
    hydrogenCount * ATOMIC_WEIGHTS['H'] +
    oxygenCount * ATOMIC_WEIGHTS['O'] +
    nitrogenCount * ATOMIC_WEIGHTS['N'];

  return { formula, weight };
}

// Get test examples
export const IUPAC_EXAMPLES = [
  { name: 'methane', description: 'Simplest alkane (1 carbon)' },
  { name: 'ethane', description: 'Simple 2-carbon chain' },
  { name: 'ethene', description: 'Simplest alkene (C=C double bond)' },
  { name: 'ethyne', description: 'Simplest alkyne (C≡C triple bond)' },
  { name: 'propane', description: 'Simple 3-carbon chain' },
  { name: 'propene', description: '3-carbon alkene (C=C double bond)' },
  { name: 'butane', description: 'Simple 4-carbon chain' },
  { name: 'pentane', description: 'Simple 5-carbon chain' },
  { name: '2-methylpropane', description: 'Isobutane' },
  { name: '2-methylbutane', description: 'Isopentane' },
  { name: '3-methylpentane', description: 'Pentane with methyl at C3' },
  { name: '2,2-dimethylpropane', description: 'Neopentane' },
  { name: '2,3-dimethylbutane', description: 'Butane with methyls at C2 and C3' },
  { name: '3,3-diethylpentane', description: 'Pentane with two ethyls at C3' },
  { name: 'propan-2-ol', description: 'Isopropanol (rubbing alcohol)' },
  { name: 'butan-2-one', description: 'Methyl ethyl ketone' },
];