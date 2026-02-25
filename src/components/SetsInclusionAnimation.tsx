import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useTheme } from '../context/ThemeContext';

interface SetsInclusionProps {
    speed?: number;
}

// Classify a number string into which sets it belongs to
function classifyNumber(input: string): string[] {
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Check for known irrationals
    const irrationals = ['pi', 'π', 'e', '√2', '√3', '√5', 'sqrt(2)', 'sqrt(3)', 'sqrt(5)', 'phi', 'φ'];
    if (irrationals.some(ir => trimmed.toLowerCase() === ir)) {
        return ['R']; // Only in ℝ (irrational)
    }

    // Try parsing as fraction a/b
    const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (fractionMatch) {
        const num = parseInt(fractionMatch[1]);
        const den = parseInt(fractionMatch[2]);
        if (den === 0) return [];
        const value = num / den;
        const sets: string[] = ['R', 'Q'];

        // Check if it's a decimal (finite decimal representation)
        const simplified = value;
        const decStr = simplified.toString();
        if (!decStr.includes('e') && decStr.split('.')[1]?.length <= 15) {
            // Check if denominator (reduced) only has factors 2 and 5
            let d = Math.abs(den);
            const g = gcd(Math.abs(num), d);
            d = d / g;
            while (d % 2 === 0) d /= 2;
            while (d % 5 === 0) d /= 5;
            if (d === 1) sets.push('D');
        }

        if (Number.isInteger(value)) {
            sets.push('Z');
            if (value >= 0) sets.push('N');
        }
        return sets;
    }

    const num = parseFloat(trimmed);
    if (isNaN(num)) return [];

    const sets: string[] = ['R'];

    // Check if rational (all parsed floats are rational by definition)
    sets.push('Q');

    // Check if decimal
    const decParts = trimmed.split('.');
    if (decParts.length <= 2) {
        sets.push('D');
    }

    if (Number.isInteger(num)) {
        sets.push('Z');
        if (num >= 0) sets.push('N');
    }

    return sets;
}

function gcd(a: number, b: number): number {
    while (b) { [a, b] = [b, a % b]; }
    return a;
}

export default function SetsInclusionAnimation({ speed = 1 }: SetsInclusionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const introAnimatingRef = useRef(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [selectedSet, setSelectedSet] = useState<{ id: string, name: string, label: string, desc: string, examples: string, color: string } | null>(null);
    const [numberInput, setNumberInput] = useState('');
    const [highlightedSets, setHighlightedSets] = useState<string[]>([]);
    const [classificationResult, setClassificationResult] = useState<string>('');
    const [visibleSets, setVisibleSets] = useState<Record<string, boolean>>({ R: true, Q: true, D: true, Z: true, N: true });

    const setsMetaForToggle = [
        { id: 'R', label: 'ℝ', color: '#EF4444' },
        { id: 'Q', label: 'ℚ', color: '#A855F7' },
        { id: 'D', label: 'ⅅ', color: '#F59E0B' },
        { id: 'Z', label: 'ℤ', color: '#10B981' },
        { id: 'N', label: 'ℕ', color: '#3B82F6' },
    ];

    const allVisible = Object.values(visibleSets).every(v => v);
    const toggleSet = (id: string) => setVisibleSets(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleAll = () => {
        const newVal = !allVisible;
        setVisibleSets({ R: newVal, Q: newVal, D: newVal, Z: newVal, N: newVal });
    };

    const handleClassify = useCallback(() => {
        if (!numberInput.trim()) {
            setHighlightedSets([]);
            setClassificationResult('');
            return;
        }
        const sets = classifyNumber(numberInput);
        setHighlightedSets(sets);
        if (sets.length === 0) {
            setClassificationResult('Nombre non reconnu');
        } else {
            const names: Record<string, string> = { N: 'ℕ', Z: 'ℤ', D: 'ⅅ', Q: 'ℚ', R: 'ℝ' };
            const display = sets.map(s => names[s]).join(', ');
            setClassificationResult(`${numberInput} ∈ { ${display} }`);
        }
    }, [numberInput]);

    useEffect(() => {
        if (!containerRef.current) return;

        let resizeObserver: ResizeObserver | null = null;
        let isRendered = false;
        let breathingInterval: ReturnType<typeof setInterval> | null = null;

        const renderChart = () => {
            if (!containerRef.current) return;

            const width = containerRef.current.clientWidth;
            if (width === 0) return;

            d3.select(containerRef.current).selectAll('*').remove();

            const height = containerRef.current.clientHeight;
            const cx = width / 2;
            const cy = height / 2;

            const svg = d3.select(containerRef.current)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', [0, 0, width, height])
                .attr('style', 'max-width: 100%; height: auto; transition: all 0.3s ease;');

            // Glow filter for highlighted sets
            const defs = svg.append('defs');
            const glowFilter = defs.append('filter').attr('id', 'glow');
            glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
            const feMerge = glowFilter.append('feMerge');
            feMerge.append('feMergeNode').attr('in', 'coloredBlur');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

            const sets = [
                { id: 'R', label: 'ℝ', name: 'Nombres Réels', desc: 'L\'ensemble de tous les nombres rationnels et irrationnels. Ils remplissent toute la droite numérique.', examples: 'π, e, √2, 0.333..., 42', color: '#EF4444', radius: Math.min(width, height) * 0.42 },
                { id: 'Q', label: 'ℚ', name: 'Nombres Rationnels', desc: 'Nombres pouvant s\'écrire sous la forme d\'une fraction a/b où a et b sont des entiers (b ≠ 0).', examples: '1/3, -5/7, 0.5', color: '#A855F7', radius: Math.min(width, height) * 0.33 },
                { id: 'D', label: 'ⅅ', name: 'Nombres Décimaux', desc: 'Nombres possédant un nombre fini de chiffres après la virgule (fractions de la forme a/10^n).', examples: '1.5, -0.25, 4.0', color: '#F59E0B', radius: Math.min(width, height) * 0.26 },
                { id: 'Z', label: 'ℤ', name: 'Nombres Entiers Relatifs', desc: 'Tous les nombres entiers naturels ainsi que leurs opposés négatifs.', examples: '-3, -2, -1, 0, 1, 2, 3', color: '#10B981', radius: Math.min(width, height) * 0.19 },
                { id: 'N', label: 'ℕ', name: 'Nombres Entiers Naturels', desc: 'Les nombres entiers positifs (incluant souvent zéro), utilisés pour compter.', examples: '0, 1, 2, 3, 4...', color: '#3B82F6', radius: Math.min(width, height) * 0.12 },
            ];

            // Track whether the intro animation has finished
            let introComplete = false;
            const introTotalDuration = (sets.length - 1) * 800 / speed + 1500 / speed + 200;
            introAnimatingRef.current = true;

            // Draw from largest to smallest
            const setGroups = svg.selectAll('g.set')
                .data(sets)
                .enter()
                .append('g')
                .attr('class', d => `set set-${d.id} cursor-pointer`)
                .attr('transform', `translate(${cx}, ${cy})`)
                .style('pointer-events', 'none'); // Disable during intro

            // Circles
            setGroups.append('circle')
                .attr('class', d => `circle-${d.id}`)
                .attr('r', 0)
                .attr('fill', d => {
                    if (highlightedSets.length > 0) {
                        return highlightedSets.includes(d.id)
                            ? (isDark ? `${d.color}35` : `${d.color}45`)
                            : (isDark ? `${d.color}05` : `${d.color}08`);
                    }
                    return isDark ? `${d.color}15` : `${d.color}20`;
                })
                .attr('stroke', d => d.color)
                .attr('stroke-width', d => highlightedSets.includes(d.id) ? 3 : 2)
                .attr('stroke-dasharray', (_d, i) => i === 2 ? '5,5' : 'none')
                .style('filter', d => {
                    if (highlightedSets.includes(d.id)) return 'url(#glow)';
                    return isDark ? 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' : 'none';
                })
                .on('mouseover', function (_event, d) {
                    if (!introComplete) return;
                    d3.select(this)
                        .transition('hover')
                        .duration(200)
                        .attr('stroke-width', 4)
                        .attr('fill', isDark ? `${d.color}30` : `${d.color}40`);

                    d3.select((this.parentNode as any).querySelector('text.set-label'))
                        .transition('hover')
                        .duration(200)
                        .attr('font-size', '28px');

                    // Show inclusion chain: highlight all parent sets
                    const setIndex = sets.findIndex(s => s.id === d.id);
                    for (let i = 0; i <= setIndex; i++) {
                        svg.select(`.circle-${sets[i].id}`)
                            .transition('hover')
                            .duration(300)
                            .attr('stroke-width', 3)
                            .attr('fill', isDark ? `${sets[i].color}25` : `${sets[i].color}30`);
                    }

                    // Show subset symbols between sets
                    svg.selectAll('.subset-symbol').remove();
                    for (let i = setIndex; i < sets.length - 1; i++) {
                        const r1 = sets[i + 1].radius;
                        const r2 = sets[i].radius;
                        const midR = (r1 + r2) / 2;
                        svg.append('text')
                            .attr('class', 'subset-symbol')
                            .attr('x', cx + midR)
                            .attr('y', cy - 4)
                            .text('⊂')
                            .attr('text-anchor', 'middle')
                            .attr('font-size', '16px')
                            .attr('fill', isDark ? '#F1F5F9' : '#1E293B')
                            .attr('opacity', 0)
                            .transition('hover')
                            .duration(300)
                            .attr('opacity', 0.7);
                    }
                })
                .on('mouseout', function (_event, d) {
                    if (!introComplete) return;
                    svg.selectAll('.subset-symbol').remove();

                    if (selectedSet?.id !== d.id) {
                        // Reset all circles
                        sets.forEach(s => {
                            svg.select(`.circle-${s.id}`)
                                .transition('hover')
                                .duration(200)
                                .attr('stroke-width', highlightedSets.includes(s.id) ? 3 : 2)
                                .attr('fill', () => {
                                    if (highlightedSets.length > 0) {
                                        return highlightedSets.includes(s.id)
                                            ? (isDark ? `${s.color}35` : `${s.color}45`)
                                            : (isDark ? `${s.color}05` : `${s.color}08`);
                                    }
                                    return isDark ? `${s.color}15` : `${s.color}20`;
                                });
                        });

                        d3.select((this.parentNode as any).querySelector('text.set-label'))
                            .transition('hover')
                            .duration(200)
                            .attr('font-size', '20px');
                    }
                })
                .on('click', (event, d) => {
                    if (!introComplete) return;
                    svg.selectAll('circle')
                        .transition('hover')
                        .duration(200)
                        .attr('stroke-width', 2);
                    svg.selectAll('text.set-label')
                        .transition('hover')
                        .duration(200)
                        .attr('font-size', '20px');

                    d3.select(event.currentTarget)
                        .transition('hover')
                        .duration(200)
                        .attr('stroke-width', 4)
                        .attr('fill', isDark ? `${d.color}30` : `${d.color}40`);
                    d3.select((event.currentTarget.parentNode as any).querySelector('text.set-label'))
                        .transition('hover')
                        .duration(200)
                        .attr('font-size', '28px');

                    setSelectedSet(d);
                })
                // Intro transition uses named 'intro' so hover ('hover') won't cancel it
                .transition('intro')
                .duration(1500 / speed)
                .delay((_d, i) => (sets.length - 1 - i) * 800 / speed)
                .ease(d3.easeElasticOut.amplitude(1).period(0.5))
                .attr('r', d => d.radius);

            // Enable pointer events after intro completes
            setTimeout(() => {
                introComplete = true;
                introAnimatingRef.current = false;
                setGroups.style('pointer-events', 'auto');
            }, introTotalDuration);

            // Labels
            setGroups.append('text')
                .attr('class', 'set-label pointer-events-none')
                .attr('x', () => 0)
                .attr('y', d => -d.radius + 24)
                .text(d => d.label)
                .attr('text-anchor', 'middle')
                .attr('font-size', '20px')
                .attr('font-weight', 'bold')
                .attr('fill', d => {
                    if (highlightedSets.length > 0 && !highlightedSets.includes(d.id)) {
                        return isDark ? `${d.color}40` : `${d.color}50`;
                    }
                    return d.color;
                })
                .attr('opacity', 0)
                .transition('intro')
                .duration(1000 / speed)
                .delay((_d, i) => (sets.length - 1 - i) * 800 / speed + 500)
                .attr('opacity', 1);

            // Inclusion symbols between sets (permanent, subtle)
            const inclusionGroup = svg.append('g').attr('class', 'inclusions');
            for (let i = 0; i < sets.length - 1; i++) {
                const inner = sets[i + 1];
                const outer = sets[i];
                const midR = (inner.radius + outer.radius) / 2;
                inclusionGroup.append('text')
                    .attr('class', `inclusion-symbol-${inner.id}-${outer.id}`)
                    .attr('x', cx - midR)
                    .attr('y', cy + 5)
                    .text('⊂')
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '14px')
                    .attr('fill', isDark ? '#475569' : '#CBD5E1')
                    .attr('opacity', 0)
                    .transition('intro')
                    .duration(600)
                    .delay((sets.length - 1 - i) * 800 / speed + 1200)
                    .attr('opacity', 0.5);
            }

            // Floating number examples
            const elementsData = [
                { set: 'R', val: 'π', angle: Math.PI * 0.2, dist: 0.9, info: 'Nombre irrationnel (transcendant)' },
                { set: 'R', val: 'e', angle: Math.PI * 0.8, dist: 0.85, info: '≈ 2.718 (Base du log népérien)' },
                { set: 'R', val: '√2', angle: Math.PI * 1.5, dist: 0.85, info: 'Irrationnel (Rapport diagonale/côté)' },
                { set: 'Q', val: '1/3', angle: Math.PI * 0.4, dist: 0.85, info: 'Périodique : 0.333...' },
                { set: 'Q', val: '-5/7', angle: Math.PI * 1.2, dist: 0.85, info: 'Fraction irréductible' },
                { set: 'D', val: '1.5', angle: Math.PI * 0.6, dist: 0.8, info: '= 15/10 (Fini)' },
                { set: 'D', val: '-0.25', angle: Math.PI * 1.8, dist: 0.8, info: '= -25/100 (Fini)' },
                { set: 'Z', val: '-1', angle: Math.PI * 0.3, dist: 0.7, info: 'Entier négatif' },
                { set: 'Z', val: '-42', angle: Math.PI * 1.4, dist: 0.7, info: '« La réponse »' },
                { set: 'N', val: '0', angle: Math.PI * 0.5, dist: 0.3, info: 'L\'élément neutre' },
                { set: 'N', val: '1', angle: Math.PI * 1.5, dist: 0.5, info: 'L\'unité' },
                { set: 'N', val: '2', angle: Math.PI * 0.9, dist: 0.5, info: 'Premier nombre pair' },
            ];

            elementsData.forEach(el => {
                const setObj = sets.find(s => s.id === el.set);
                if (setObj) {
                    const smallerSetObj = sets[sets.indexOf(setObj) + 1];
                    const rMin = smallerSetObj ? smallerSetObj.radius : 0;
                    const rMax = setObj.radius;
                    const rActual = rMin + (rMax - rMin) * el.dist * 0.9;

                    (el as any).x = cx + Math.cos(el.angle) * rActual;
                    (el as any).y = cy + Math.sin(el.angle) * rActual;
                    (el as any).color = setObj.color;
                }
            });

            // Tooltip
            const tooltip = d3.select(containerRef.current)
                .append('div')
                .attr('class', 'absolute z-10 pointer-events-none opacity-0 transition-opacity duration-200 backdrop-blur-md rounded-lg p-2 text-xs border shadow-lg')
                .style('background', isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)')
                .style('border-color', isDark ? '#475569' : '#E2E8F0')
                .style('color', isDark ? '#F1F5F9' : '#1E293B');

            svg.selectAll('text.element')
                .data(elementsData)
                .enter()
                .append('text')
                .attr('class', 'element font-mono text-sm cursor-help')
                .attr('x', (d: any) => d.x)
                .attr('y', (d: any) => d.y)
                .text((d: any) => d.val)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('fill', (d: any) => {
                    if (highlightedSets.length > 0 && !highlightedSets.includes(d.set)) {
                        return isDark ? '#334155' : '#E2E8F0';
                    }
                    return isDark ? '#F1F5F9' : '#1E293B';
                })
                .attr('opacity', 0)
                .style('animation', 'float 3s ease-in-out infinite alternate')
                .style('animation-delay', (_d, i) => `${i * 0.2}s`)
                .on('mouseover', function (event, d) {
                    if (!introComplete) return;
                    d3.select(this)
                        .transition('hover')
                        .duration(200)
                        .attr('font-size', '22px')
                        .attr('font-weight', 'bold')
                        .attr('fill', (d: any) => d.color);

                    // Highlight the set this number belongs to
                    const setObj = sets.find(s => s.id === d.set);
                    if (setObj) {
                        svg.select(`.circle-${setObj.id}`)
                            .transition('hover')
                            .duration(300)
                            .attr('stroke-width', 4)
                            .attr('fill', isDark ? `${setObj.color}30` : `${setObj.color}40`);
                    }

                    tooltip.transition().duration(200).style('opacity', 1);
                    tooltip.html(`<strong style="color:${(d as any).color}">${d.val}</strong><br/>${d.info}<br/><em style="opacity:0.7">Appartient à : ${d.set}</em>`)
                        .style('left', `${event.pageX + 12}px`)
                        .style('top', `${event.pageY - 32}px`);
                })
                .on('mousemove', function (event) {
                    tooltip
                        .style('left', `${event.pageX + 12}px`)
                        .style('top', `${event.pageY - 32}px`);
                })
                .on('mouseout', function () {
                    if (!introComplete) return;
                    d3.select(this)
                        .transition('hover')
                        .duration(200)
                        .attr('font-size', '14px')
                        .attr('font-weight', 'normal')
                        .attr('fill', isDark ? '#F1F5F9' : '#1E293B');

                    // Reset set highlight
                    sets.forEach(s => {
                        svg.select(`.circle-${s.id}`)
                            .transition('hover')
                            .duration(200)
                            .attr('stroke-width', highlightedSets.includes(s.id) ? 3 : 2)
                            .attr('fill', () => {
                                if (highlightedSets.length > 0) {
                                    return highlightedSets.includes(s.id)
                                        ? (isDark ? `${s.color}35` : `${s.color}45`)
                                        : (isDark ? `${s.color}05` : `${s.color}08`);
                                }
                                return isDark ? `${s.color}15` : `${s.color}20`;
                            });
                    });

                    tooltip.transition().duration(200).style('opacity', 0);
                })
                .transition('intro')
                .duration(1000 / speed)
                .delay((d: any) => {
                    const setIndex = sets.findIndex(s => s.id === d.set);
                    return (sets.length - 1 - setIndex) * 800 / speed + 800;
                })
                .attr('opacity', 1);

            // Idle breathing animation on circles
            const startBreathing = () => {
                let phase = 0;
                breathingInterval = setInterval(() => {
                    phase += 0.05;
                    sets.forEach((s, i) => {
                        const breathScale = 1 + Math.sin(phase + i * 0.8) * 0.008;
                        svg.select(`.circle-${s.id}`)
                            .attr('r', s.radius * breathScale);
                    });
                }, 50);
            };

            // Start breathing after intro animation completes
            const introDelay = sets.length * 800 / speed + 1500;
            setTimeout(startBreathing, introDelay);

            if (!document.getElementById('float-keyframe')) {
                const style = document.createElement('style');
                style.id = 'float-keyframe';
                style.innerHTML = `
                    @keyframes float {
                        0% { transform: translateY(0px) scale(1); }
                        100% { transform: translateY(-1px) scale(1.01); }
                    }
                `;
                document.head.appendChild(style);
            }

            isRendered = true;
        };

        resizeObserver = new ResizeObserver(() => {
            if (!isRendered && containerRef.current && containerRef.current.clientWidth > 0) {
                renderChart();
            }
        });

        resizeObserver.observe(containerRef.current);
        renderChart();

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            if (breathingInterval) clearInterval(breathingInterval);
            if (containerRef.current) {
                d3.select(containerRef.current).selectAll('.absolute.z-10.pointer-events-none').remove();
            }
        };
    }, [isDark, speed, selectedSet, highlightedSets]);

    // Separate effect for visibility toggling — avoids re-rendering the entire D3 chart
    useEffect(() => {
        // Skip while intro animation is playing so staggered appearance works
        if (introAnimatingRef.current) return;
        if (!containerRef.current) return;
        const svg = d3.select(containerRef.current).select('svg');
        if (svg.empty()) return;

        const setIds = ['R', 'Q', 'D', 'Z', 'N'];

        // Toggle set groups (circle + label)
        setIds.forEach(id => {
            svg.select(`.set-${id}`)
                .transition('visibility')
                .duration(350)
                .style('opacity', visibleSets[id] ? 1 : 0)
                .style('pointer-events', visibleSets[id] ? 'auto' : 'none');
        });

        // Toggle floating number elements
        svg.selectAll<SVGTextElement, any>('text.element')
            .each(function (d) {
                const vis = visibleSets[d.set];
                d3.select(this)
                    .transition('visibility')
                    .duration(350)
                    .style('opacity', vis ? 1 : 0)
                    .style('pointer-events', vis ? 'auto' : 'none');
            });

        // Toggle inclusion symbols
        for (let i = 0; i < setIds.length - 1; i++) {
            // sets array order: R, Q, D, Z, N — sets[i+1] ⊂ sets[i]
            const inner = setIds[i + 1];
            const outer = setIds[i];
            const bothVisible = visibleSets[inner] && visibleSets[outer];
            svg.select(`.inclusion-symbol-${inner}-${outer}`)
                .transition('visibility')
                .duration(350)
                .attr('opacity', bothVisible ? 0.5 : 0);
        }
    }, [visibleSets]);

    return (
        <div className="w-full h-full flex flex-col items-center">
            {/* SVG Container */}
            <div ref={containerRef} className="w-full flex-1 relative min-h-[350px]" />

            {/* Layer Toggle Controls */}
            <div className={`w-full max-w-lg mx-auto px-4 mb-2`}>
                <div className={`flex items-center justify-center gap-2 flex-wrap`}>
                    <button
                        onClick={toggleAll}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${allVisible
                            ? (isDark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700')
                            : (isDark ? 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400' : 'bg-transparent border-slate-300 text-slate-500 hover:border-slate-500')
                            }`}
                    >
                        Tout
                    </button>
                    <div className={`w-px h-5 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                    {setsMetaForToggle.map(s => (
                        <button
                            key={s.id}
                            onClick={() => toggleSet(s.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border`}
                            style={{
                                backgroundColor: visibleSets[s.id] ? `${s.color}20` : 'transparent',
                                borderColor: visibleSets[s.id] ? s.color : (isDark ? '#475569' : '#CBD5E1'),
                                color: visibleSets[s.id] ? s.color : (isDark ? '#64748B' : '#94A3B8'),
                                opacity: visibleSets[s.id] ? 1 : 0.6,
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Number Classifier Input */}
            <div className={`w-full max-w-lg mx-auto px-4 mb-2`}>
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${isDark ? 'bg-[#1E293B]/80 border-[#475569]' : 'bg-white/80 border-[#E2E8F0]'} backdrop-blur-sm`}>
                    <span className={`text-sm font-medium whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Tester :
                    </span>
                    <input
                        type="text"
                        value={numberInput}
                        onChange={(e) => setNumberInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleClassify()}
                        placeholder="Entrez un nombre (ex: 3, -2.5, 1/3, π)"
                        className={`flex-1 bg-transparent border-none outline-none text-sm ${isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                    />
                    <button
                        onClick={handleClassify}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}`}
                    >
                        Classer
                    </button>
                    {highlightedSets.length > 0 && (
                        <button
                            onClick={() => { setHighlightedSets([]); setClassificationResult(''); setNumberInput(''); }}
                            className={`px-2 py-1 rounded-lg text-xs transition-all ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            ✕
                        </button>
                    )}
                </div>
                {classificationResult && (
                    <div className={`mt-1 text-center text-sm font-mono font-semibold ${classificationResult.includes('non reconnu') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {classificationResult}
                    </div>
                )}
            </div>

            {/* Info Panel for Selected Set */}
            <div className={`w-full max-w-2xl mt-2 p-4 rounded-xl border transition-all duration-300 ${selectedSet ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none absolute bottom-0'}`}
                style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)', borderColor: selectedSet ? selectedSet.color : 'transparent' }}>
                {selectedSet && (
                    <div className="flex items-start gap-4">
                        <div className="text-4xl font-bold flex-shrink-0" style={{ color: selectedSet.color }}>
                            {selectedSet.label}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold" style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>{selectedSet.name}</h3>
                            <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                {selectedSet.desc}
                            </p>
                            <p className="text-xs mt-2 font-mono">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Exemples: </span>
                                <span style={{ color: selectedSet.color }}>{selectedSet.examples}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedSet(null)}
                            className={`text-sm px-2 py-1 rounded-lg transition-all flex-shrink-0 ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {!selectedSet && !classificationResult && (
                <div className={`mt-2 mb-2 text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Cliquez sur un ensemble, survolez un nombre, ou testez un nombre ci-dessus
                </div>
            )}
        </div>
    );
}
