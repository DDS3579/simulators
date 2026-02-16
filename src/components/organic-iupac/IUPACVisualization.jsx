

export function IUPACVisualization({ molecule, mode, subType = 'expanded', zoom = 100 }) {
  const scale = zoom / 100;
  if (!molecule || !molecule.isValid) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">Enter an IUPAC name to see the structure</p>
          <p className="text-sm mt-2">Try examples like "pentane" or "3-methylpentane"</p>
        </div>
      </div>
    );
  }

  const { carbonAtoms, substituents, functionalGroup, parentCarbonCount } = molecule;

  // Calculate SVG dimensions - tighter for mobile while still readable
  const spacing = 120;
  const startX = 120;
  const startY = 230;
  const width = Math.max(480, 240 + (Math.max(1, carbonAtoms.length) - 1) * spacing);
  const height = 460;

  // Get substituent label
  const getSubstituentLabel = (type, carbonCount) => {
    switch (type) {
      case 'methyl': return 'CH₃';
      case 'ethyl': return 'C₂H₅';
      case 'propyl': return 'C₃H₇';
      case 'isopropyl': return 'CH(CH₃)₂';
      case 'butyl': return 'C₄H₉';
      default: return `C${carbonCount}H${carbonCount * 2 + 1}`;
    }
  };

  // Get functional group symbol
  const getFunctionalGroupSymbol = (type) => {
    switch (type) {
      case 'alcohol': return 'OH';
      case 'aldehyde': return 'CHO';
      case 'ketone': return '=O';
      case 'carboxylic-acid': return 'COOH';
      case 'amine': return 'NH₂';
      case 'alkene': return '=';
      case 'alkyne': return '≡';
      default: return '';
    }
  };

  // Render hydrogen atoms around a carbon
  const renderHydrogens = (atom, x, y, index) => {
    const hydrogens = [];
    const hCount = atom.hydrogenCount;

    if (hCount <= 0) return hydrogens;

    const isFirstCarbon = index === 0;
    const isLastCarbon = index === carbonAtoms.length - 1;
    const hasSubstituentsUp = atom.bondsUp > 0;
    const hasSubstituentsDown = atom.bondsDown > 0;
    const hasFuncGroup = atom.functionalGroup && atom.functionalGroup.type !== 'none';

    // Track which positions we've used for hydrogens
    let placedCount = 0;

    // Position 1: Left (only for first carbon in chain)
    if (isFirstCarbon && placedCount < hCount) {
      hydrogens.push(
        <g key={`h-left-${index}`}>
          <line x1={x - 18} y1={y} x2={x - 35} y2={y} stroke="#6b7280" strokeWidth={2} />
          <text x={x - 45} y={y + 5} className="text-sm font-bold fill-gray-500" textAnchor="middle">H</text>
        </g>
      );
      placedCount++;
    }

    // Position 2: Right (only for last carbon in chain)
    if (isLastCarbon && placedCount < hCount) {
      hydrogens.push(
        <g key={`h-right-${index}`}>
          <line x1={x + 18} y1={y} x2={x + 35} y2={y} stroke="#6b7280" strokeWidth={2} />
          <text x={x + 45} y={y + 5} className="text-sm font-bold fill-gray-500" textAnchor="middle">H</text>
        </g>
      );
      placedCount++;
    }

    // Position 3: Top (if no substituents up and no functional group)
    if (!hasSubstituentsUp && !hasFuncGroup && placedCount < hCount) {
      hydrogens.push(
        <g key={`h-top-${index}`}>
          <line x1={x} y1={y - 18} x2={x} y2={y - 35} stroke="#6b7280" strokeWidth={2} />
          <text x={x} y={y - 42} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
        </g>
      );
      placedCount++;
    }

    // Position 4: Bottom (if no substituents down)
    if (!hasSubstituentsDown && placedCount < hCount) {
      hydrogens.push(
        <g key={`h-bottom-${index}`}>
          <line x1={x} y1={y + 18} x2={x} y2={y + 35} stroke="#6b7280" strokeWidth={2} />
          <text x={x} y={y + 50} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
        </g>
      );
      placedCount++;
    }

    // Position 5: Top-left diagonal (if still need more H)
    if (placedCount < hCount && !hasSubstituentsUp) {
      hydrogens.push(
        <g key={`h-topleft-${index}`}>
          <line x1={x - 12} y1={y - 12} x2={x - 28} y2={y - 28} stroke="#6b7280" strokeWidth={2} />
          <text x={x - 36} y={y - 28} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
        </g>
      );
      placedCount++;
    }

    // Position 6: Top-right diagonal
    if (placedCount < hCount && !hasSubstituentsUp && !hasFuncGroup) {
      hydrogens.push(
        <g key={`h-topright-${index}`}>
          <line x1={x + 12} y1={y - 12} x2={x + 28} y2={y - 28} stroke="#6b7280" strokeWidth={2} />
          <text x={x + 36} y={y - 28} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
        </g>
      );
      placedCount++;
    }

    // Position 7: Bottom-left diagonal
    if (placedCount < hCount && !hasSubstituentsDown) {
      hydrogens.push(
        <g key={`h-bottomleft-${index}`}>
          <line x1={x - 12} y1={y + 12} x2={x - 28} y2={y + 28} stroke="#6b7280" strokeWidth={2} />
          <text x={x - 36} y={y + 36} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
        </g>
      );
      placedCount++;
    }

    // Position 8: Bottom-right diagonal
    if (placedCount < hCount && !hasSubstituentsDown) {
      hydrogens.push(
        <g key={`h-bottomright-${index}`}>
          <line x1={x + 12} y1={y + 12} x2={x + 28} y2={y + 28} stroke="#6b7280" strokeWidth={2} />
          <text x={x + 36} y={y + 36} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
        </g>
      );
      placedCount++;
    }

    return hydrogens;
  };

  // Render substituent branches
  const renderSubstituent = (
    carbonX,
    carbonY,
    sub,
    subIndex,
    totalAtPosition,
    carbonIndex
  ) => {
    // Alternate substituents up and down
    const goUp = subIndex % 2 === 0;
    const baseAngle = goUp ? -90 : 90; // -90 = straight up, 90 = straight down

    // Offset for multiple substituents at same position
    const offset = totalAtPosition > 1 ? (subIndex - (totalAtPosition - 1) / 2) * 25 : 0;

    const radians = (baseAngle * Math.PI) / 180;
    const branchLength = 45;

    const endX = carbonX + offset;
    const endY = carbonY + (goUp ? -branchLength : branchLength);

    return (
      <g key={`sub-${carbonIndex}-${subIndex}`}>
        <line
          x1={carbonX}
          y1={carbonY + (goUp ? -18 : 18)}
          x2={endX}
          y2={endY}
          stroke="#059669"
          strokeWidth={2}
        />
        {mode !== 'bondline' && (
          <text
            x={endX}
            y={endY + (goUp ? -8 : 18)}
            textAnchor="middle"
            className="text-xs font-mono font-bold"
            fill="#065f46"
          >
            {getSubstituentLabel(sub.type, sub.carbonCount)}
          </text>
        )}
      </g>
    );
  };

  // Generate condensed formula groups (e.g., CH3, CH2, CH, etc.) - WITHOUT substituents inline
  const getCondensedGroup = (atom, index) => {
    const hCount = atom.hydrogenCount;
    const funcGroup = atom.functionalGroup;

    let group = 'C';
    if (hCount === 3) group = 'CH₃';
    else if (hCount === 2) group = 'CH₂';
    else if (hCount === 1) group = 'CH';
    else group = 'C';

    // Add functional group (but NOT substituents - those are shown as branches)
    if (funcGroup && funcGroup.type !== 'none' && funcGroup.type !== 'alkene' && funcGroup.type !== 'alkyne') {
      if (funcGroup.type === 'alcohol') group += '(OH)';
      else if (funcGroup.type === 'amine') group += '(NH₂)';
      else if (funcGroup.type === 'carboxylic-acid') group = 'COOH';
      else if (funcGroup.type === 'aldehyde') group = 'CHO';
    }

    return group;
  };

  // Get substituent label for branches
  const getSubstituentBranchLabel = (type) => {
    switch (type) {
      case 'methyl': return 'CH₃';
      case 'ethyl': return 'C₂H₅';
      case 'propyl': return 'C₃H₇';
      case 'isopropyl': return 'CH(CH₃)₂';
      case 'butyl': return 'C₄H₉';
      default: return type;
    }
  };

  // For condensed mode, calculate dimensions with space for branches
  const condensedSpacing = 90;
  const condensedWidth = Math.max(400, 120 + carbonAtoms.length * condensedSpacing);
  const condensedHeight = 220;
  const mainChainY = 120;

  // Render condensed format
  if (mode === 'structural' && subType === 'condensed') {
    return (
      <svg
        viewBox={`0 0 ${condensedWidth} ${condensedHeight}`}
        width={condensedWidth * scale}
        height={condensedHeight * scale}
        preserveAspectRatio="xMinYMin meet"
        className="block max-w-none shrink-0"
      >
        <rect width={condensedWidth} height={condensedHeight} fill="transparent" />

        {/* Title */}
        <text
          x={condensedWidth / 2}
          y={25}
          textAnchor="middle"
          className="text-base font-semibold"
          fill="#065f46"
        >
          {molecule.name}
        </text>

        {/* Condensed formula with branches */}
        {carbonAtoms.map((atom, index) => {
          const x = 70 + index * condensedSpacing;
          const y = mainChainY;
          const group = getCondensedGroup(atom, index);
          const isLast = index === carbonAtoms.length - 1;
          const hasSubs = atom.substituents.length > 0;

          // Check for double/triple bonds
          const hasDoubleBond = functionalGroup.type === 'alkene' &&
            (functionalGroup.position === index + 1 || functionalGroup.position === index + 2);
          const hasTripleBond = functionalGroup.type === 'alkyne' &&
            (functionalGroup.position === index + 1 || functionalGroup.position === index + 2);

          return (
            <g key={`condensed-${index}`}>
              {/* Substituent branches - alternating UP and DOWN */}
              {hasSubs && atom.substituents.map((sub, subIdx) => {
                const branchLabel = getSubstituentBranchLabel(sub.type);
                // Alternate: first substituent goes UP, second goes DOWN, etc.
                const goesUp = subIdx % 2 === 0;
                const branchY = goesUp ? y - 45 : y + 45;
                // Offset multiple substituents horizontally if more than 2
                const offsetX = atom.substituents.length > 2
                  ? (Math.floor(subIdx / 2) - (Math.floor((atom.substituents.length - 1) / 2) / 2)) * 30
                  : 0;

                return (
                  <g key={`sub-${index}-${subIdx}`}>
                    {/* Vertical line from main chain to substituent */}
                    <line
                      x1={x + offsetX}
                      y1={goesUp ? y - 12 : y + 12}
                      x2={x + offsetX}
                      y2={goesUp ? branchY + 10 : branchY - 10}
                      stroke="#059669"
                      strokeWidth={2}
                    />
                    {/* Substituent label */}
                    <text
                      x={x + offsetX}
                      y={branchY}
                      textAnchor="middle"
                      className="text-sm font-bold"
                      fill="#065f46"
                    >
                      {branchLabel}
                    </text>
                  </g>
                );
              })}

              {/* Main chain group label */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                className="text-base font-bold"
                fill="#1f2937"
              >
                {group}
              </text>

              {/* Bond to next carbon */}
              {!isLast && (
                <text
                  x={x + condensedSpacing / 2}
                  y={y}
                  textAnchor="middle"
                  className="text-lg font-medium"
                  fill="#059669"
                >
                  {hasTripleBond ? '≡' : hasDoubleBond ? '=' : '−'}
                </text>
              )}

              {/* Position number below */}
              <text
                x={x}
                y={y + 22}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
              >
                {index + 1}
              </text>
            </g>
          );
        })}

        {/* Formula at bottom */}
        <text
          x={condensedWidth / 2}
          y={condensedHeight - 15}
          textAnchor="middle"
          className="text-sm font-mono fill-muted-foreground"
        >
          {molecule.molecularFormula} ({molecule.molecularWeight.toFixed(2)} g/mol)
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      preserveAspectRatio="xMinYMin meet"
      className="block max-w-none shrink-0"
    >
      {/* Background */}
      <rect width={width} height={height} fill="transparent" />

      {/* Title */}
      <text
        x={width / 2}
        y={25}
        textAnchor="middle"
        className="text-base font-semibold"
        fill="#065f46"
      >
        {molecule.name}
      </text>

      {/* Draw main chain bonds */}
      {carbonAtoms.map((atom, index) => {
        if (index < carbonAtoms.length - 1) {
          const x1 = startX + index * spacing;
          const x2 = startX + (index + 1) * spacing;

          // Check for double/triple bonds
          const hasDoubleBond = functionalGroup.type === 'alkene' &&
            (functionalGroup.position === index + 1 || functionalGroup.position === index + 2);
          const hasTripleBond = functionalGroup.type === 'alkyne' &&
            (functionalGroup.position === index + 1 || functionalGroup.position === index + 2);

          return (
            <g key={`bond-${index}`}>
              <line
                x1={x1 + 18}
                y1={startY}
                x2={x2 - 18}
                y2={startY}
                stroke="#059669"
                strokeWidth={3}
              />
              {hasDoubleBond && (
                <line
                  x1={x1 + 18}
                  y1={startY - 8}
                  x2={x2 - 18}
                  y2={startY - 8}
                  stroke="#059669"
                  strokeWidth={3}
                />
              )}
              {hasTripleBond && (
                <>
                  <line
                    x1={x1 + 18}
                    y1={startY - 8}
                    x2={x2 - 18}
                    y2={startY - 8}
                    stroke="#059669"
                    strokeWidth={3}
                  />
                  <line
                    x1={x1 + 18}
                    y1={startY + 8}
                    x2={x2 - 18}
                    y2={startY + 8}
                    stroke="#059669"
                    strokeWidth={3}
                  />
                </>
              )}
            </g>
          );
        }
        return null;
      })}

      {/* Draw substituent branches */}
      {carbonAtoms.map((atom, index) => {
        const carbonX = startX + index * spacing;
        const subsAtPos = atom.substituents;

        return subsAtPos.map((sub, subIndex) =>
          renderSubstituent(carbonX, startY, sub, subIndex, subsAtPos.length, index)
        );
      })}

      {/* Draw carbon atoms and labels based on mode */}
      {carbonAtoms.map((atom, index) => {
        const x = startX + index * spacing;
        const y = startY;
        const funcGroup = atom.functionalGroup;

        if (mode === 'bondline') {
          // Bond-line: Only show functional groups and endpoints
          return (
            <g key={`carbon-${index}`}>
              {funcGroup && funcGroup.type !== 'none' && (
                <text
                  x={x}
                  y={y - 25}
                  textAnchor="middle"
                  className="text-sm font-bold fill-red-600"
                >
                  {getFunctionalGroupSymbol(funcGroup.type)}
                </text>
              )}
            </g>
          );
        }

        if (mode === 'structural') {
          // Condensed format: CH3 - CH2 - CH2 - etc.
          if (subType === 'condensed') {
            return null; // Rendered separately above
          }

          // Expanded format (original)
          return (
            <g key={`carbon-${index}`}>
              {/* Carbon atom circle */}
              <circle cx={x} cy={y} r={16} fill="#1f2937" />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                className="text-sm font-bold fill-white"
              >
                C
              </text>

              {/* Position number */}
              <text
                x={x}
                y={y + 70}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
              >
                C{index + 1}
              </text>

              {/* Hydrogen atoms */}
              {renderHydrogens(atom, x, y, index)}

              {/* Functional group - expanded form */}
              {funcGroup && funcGroup.type !== 'none' && funcGroup.type !== 'alkene' && funcGroup.type !== 'alkyne' && (
                <g>
                  {funcGroup.type === 'alcohol' && (
                    <>
                      {/* O atom */}
                      <line x1={x + 12} y1={y - 12} x2={x + 30} y2={y - 30} stroke="#dc2626" strokeWidth={2} />
                      <circle cx={x + 38} cy={y - 38} r={14} fill="#dc2626" />
                      <text x={x + 38} y={y - 33} textAnchor="middle" className="text-sm font-bold fill-white">O</text>
                      {/* H atom bonded to O */}
                      <line x1={x + 52} y1={y - 38} x2={x + 68} y2={y - 38} stroke="#6b7280" strokeWidth={2} />
                      <text x={x + 78} y={y - 33} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
                    </>
                  )}
                  {funcGroup.type === 'amine' && (
                    <>
                      {/* N atom */}
                      <line x1={x + 12} y1={y - 12} x2={x + 30} y2={y - 30} stroke="#2563eb" strokeWidth={2} />
                      <circle cx={x + 38} cy={y - 38} r={14} fill="#2563eb" />
                      <text x={x + 38} y={y - 33} textAnchor="middle" className="text-sm font-bold fill-white">N</text>
                      {/* H atoms bonded to N */}
                      <line x1={x + 52} y1={y - 38} x2={x + 68} y2={y - 38} stroke="#6b7280" strokeWidth={2} />
                      <text x={x + 78} y={y - 33} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
                      <line x1={x + 38} y1={y - 52} x2={x + 38} y2={y - 68} stroke="#6b7280" strokeWidth={2} />
                      <text x={x + 38} y={y - 78} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
                    </>
                  )}
                  {funcGroup.type === 'aldehyde' && (
                    <>
                      {/* C=O (aldehyde at end) */}
                      <line x1={x + 12} y1={y - 12} x2={x + 30} y2={y - 30} stroke="#dc2626" strokeWidth={2} />
                      <line x1={x + 16} y1={y - 8} x2={x + 34} y2={y - 26} stroke="#dc2626" strokeWidth={2} />
                      <circle cx={x + 38} cy={y - 38} r={14} fill="#dc2626" />
                      <text x={x + 38} y={y - 33} textAnchor="middle" className="text-sm font-bold fill-white">O</text>
                    </>
                  )}
                  {funcGroup.type === 'ketone' && (
                    <>
                      {/* C=O (ketone) */}
                      <line x1={x} y1={y - 18} x2={x} y2={y - 35} stroke="#dc2626" strokeWidth={2} />
                      <line x1={x + 6} y1={y - 18} x2={x + 6} y2={y - 35} stroke="#dc2626" strokeWidth={2} />
                      <circle cx={x + 3} cy={y - 48} r={14} fill="#dc2626" />
                      <text x={x + 3} y={y - 43} textAnchor="middle" className="text-sm font-bold fill-white">O</text>
                    </>
                  )}
                  {funcGroup.type === 'carboxylic-acid' && (
                    <>
                      {/* C=O */}
                      <line x1={x} y1={y - 18} x2={x} y2={y - 35} stroke="#dc2626" strokeWidth={2} />
                      <line x1={x + 6} y1={y - 18} x2={x + 6} y2={y - 35} stroke="#dc2626" strokeWidth={2} />
                      <circle cx={x + 3} cy={y - 48} r={14} fill="#dc2626" />
                      <text x={x + 3} y={y - 43} textAnchor="middle" className="text-sm font-bold fill-white">O</text>
                      {/* O-H */}
                      <line x1={x + 18} y1={y} x2={x + 38} y2={y} stroke="#dc2626" strokeWidth={2} />
                      <circle cx={x + 52} cy={y} r={14} fill="#dc2626" />
                      <text x={x + 52} y={y + 5} textAnchor="middle" className="text-sm font-bold fill-white">O</text>
                      <line x1={x + 66} y1={y} x2={x + 82} y2={y} stroke="#6b7280" strokeWidth={2} />
                      <text x={x + 92} y={y + 5} textAnchor="middle" className="text-sm font-bold fill-gray-500">H</text>
                    </>
                  )}
                </g>
              )}
            </g>
          );
        }

        if (mode === 'lewis') {
          return (
            <g key={`carbon-${index}`}>
              {/* Carbon with electron dots */}
              <circle cx={x} cy={y} r={20} fill="#1f2937" stroke="#059669" strokeWidth={2} />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                className="text-sm font-bold fill-white"
              >
                C
              </text>

              {/* Electron pairs for C-C bonds */}
              {index > 0 && (
                <>
                  <circle cx={x - 26} cy={y - 2} r={2} fill="#059669" />
                  <circle cx={x - 26} cy={y + 2} r={2} fill="#059669" />
                </>
              )}

              {index < carbonAtoms.length - 1 && (
                <>
                  <circle cx={x + 26} cy={y - 2} r={2} fill="#059669" />
                  <circle cx={x + 26} cy={y + 2} r={2} fill="#059669" />
                </>
              )}

              {/* Hydrogen atoms with electron pairs - render based on actual hydrogenCount */}
              {(() => {
                const hydrogens = [];
                let placed = 0;
                const hCount = atom.hydrogenCount;
                const isFirst = index === 0;
                const isLast = index === carbonAtoms.length - 1;
                const hasSubUp = atom.bondsUp > 0;
                const hasSubDown = atom.bondsDown > 0;
                const hasFuncGroup = atom.functionalGroup && atom.functionalGroup.type !== 'none';

                // Position 1: Left (only for first carbon)
                if (isFirst && placed < hCount) {
                  hydrogens.push(
                    <g key={`lewis-h-left-${index}`}>
                      <circle cx={x - 45} cy={y} r={12} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
                      <text x={x - 45} y={y + 4} textAnchor="middle" className="text-xs font-bold fill-gray-700">H</text>
                      <circle cx={x - 32} cy={y - 2} r={1.5} fill="#059669" />
                      <circle cx={x - 32} cy={y + 2} r={1.5} fill="#059669" />
                    </g>
                  );
                  placed++;
                }

                // Position 2: Right (only for last carbon)
                if (isLast && placed < hCount) {
                  hydrogens.push(
                    <g key={`lewis-h-right-${index}`}>
                      <circle cx={x + 45} cy={y} r={12} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
                      <text x={x + 45} y={y + 4} textAnchor="middle" className="text-xs font-bold fill-gray-700">H</text>
                      <circle cx={x + 32} cy={y - 2} r={1.5} fill="#059669" />
                      <circle cx={x + 32} cy={y + 2} r={1.5} fill="#059669" />
                    </g>
                  );
                  placed++;
                }

                // Position 3: Top (if no substituent up and no functional group)
                if (!hasSubUp && !hasFuncGroup && placed < hCount) {
                  hydrogens.push(
                    <g key={`lewis-h-top-${index}`}>
                      <circle cx={x} cy={y - 45} r={12} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
                      <text x={x} y={y - 41} textAnchor="middle" className="text-xs font-bold fill-gray-700">H</text>
                      <circle cx={x - 2} cy={y - 32} r={1.5} fill="#059669" />
                      <circle cx={x + 2} cy={y - 32} r={1.5} fill="#059669" />
                    </g>
                  );
                  placed++;
                }

                // Position 4: Bottom (if no substituent down)
                if (!hasSubDown && placed < hCount) {
                  hydrogens.push(
                    <g key={`lewis-h-bottom-${index}`}>
                      <circle cx={x} cy={y + 45} r={12} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
                      <text x={x} y={y + 49} textAnchor="middle" className="text-xs font-bold fill-gray-700">H</text>
                      <circle cx={x - 2} cy={y + 32} r={1.5} fill="#059669" />
                      <circle cx={x + 2} cy={y + 32} r={1.5} fill="#059669" />
                    </g>
                  );
                  placed++;
                }

                // Position 5: Top-left diagonal
                if (!hasSubUp && placed < hCount) {
                  hydrogens.push(
                    <g key={`lewis-h-topleft-${index}`}>
                      <circle cx={x - 35} cy={y - 35} r={12} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
                      <text x={x - 35} y={y - 31} textAnchor="middle" className="text-xs font-bold fill-gray-700">H</text>
                      <circle cx={x - 24} cy={y - 24} r={1.5} fill="#059669" />
                      <circle cx={x - 22} cy={y - 26} r={1.5} fill="#059669" />
                    </g>
                  );
                  placed++;
                }

                // Position 6: Bottom-left diagonal
                if (!hasSubDown && placed < hCount) {
                  hydrogens.push(
                    <g key={`lewis-h-bottomleft-${index}`}>
                      <circle cx={x - 35} cy={y + 35} r={12} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
                      <text x={x - 35} y={y + 39} textAnchor="middle" className="text-xs font-bold fill-gray-700">H</text>
                      <circle cx={x - 24} cy={y + 24} r={1.5} fill="#059669" />
                      <circle cx={x - 22} cy={y + 26} r={1.5} fill="#059669" />
                    </g>
                  );
                  placed++;
                }

                return hydrogens;
              })()}

              {/* Functional group */}
              {funcGroup && funcGroup.type !== 'none' && funcGroup.type !== 'alkene' && funcGroup.type !== 'alkyne' && (
                <g>
                  <circle cx={x + 45} cy={y - 35} r={14} fill="#fee2e2" stroke="#dc2626" strokeWidth={1} />
                  <text
                    x={x + 45}
                    y={y - 31}
                    textAnchor="middle"
                    className="text-xs font-bold fill-red-700"
                  >
                    {funcGroup.type === 'alcohol' ? 'OH' : funcGroup.type === 'ketone' ? '=O' : getFunctionalGroupSymbol(funcGroup.type)}
                  </text>
                </g>
              )}
            </g>
          );
        }

        return null;
      })}

      {/* Formula at bottom */}
      <text
        x={width / 2}
        y={height - 15}
        textAnchor="middle"
        className="text-sm font-mono fill-muted-foreground"
      >
        {molecule.molecularFormula} ({molecule.molecularWeight.toFixed(2)} g/mol)
      </text>
    </svg>
  );
}