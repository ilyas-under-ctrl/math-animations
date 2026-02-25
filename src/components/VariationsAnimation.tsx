import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTheme } from '../context/ThemeContext';

interface VariationsProps {
    variation: string; // 'R', 'R+', 'R-', 'R*', 'R*+', 'R*-'
}

export default function VariationsAnimation({ variation }: VariationsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        if (!containerRef.current) return;

        let resizeObserver: ResizeObserver | null = null;
        let isRendered = false;

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
                .attr('style', 'max-width: 100%; height: auto;');

            const lineY = cy;
            const margin = 40;
            const scale = d3.scaleLinear()
                .domain([-5, 5])
                .range([margin, width - margin]);

            const axisColor = isDark ? '#475569' : '#CBD5E1';
            const textColor = isDark ? '#94A3B8' : '#64748B';
            const highlightColor = '#10B981';
            const excludedColor = isDark ? '#0F172A' : '#FAFAFA';

            // Base Axis Line
            svg.append('line')
                .attr('x1', scale(-5))
                .attr('y1', lineY)
                .attr('x2', scale(5))
                .attr('y2', lineY)
                .attr('stroke', axisColor)
                .attr('stroke-width', 2);

            // Arrows
            svg.append('polygon')
                .attr('points', `${scale(5)},${lineY - 4} ${scale(5) + 12},${lineY} ${scale(5)},${lineY + 4}`)
                .attr('fill', axisColor);
            svg.append('polygon')
                .attr('points', `${scale(-5)},${lineY - 4} ${scale(-5) - 12},${lineY} ${scale(-5)},${lineY + 4}`)
                .attr('fill', axisColor);

            // Infinity labels
            svg.append('text')
                .attr('x', scale(5) + 18)
                .attr('y', lineY + 5)
                .text('+∞')
                .attr('fill', textColor)
                .attr('font-size', '13px')
                .attr('font-weight', 'bold');
            svg.append('text')
                .attr('x', scale(-5) - 36)
                .attr('y', lineY + 5)
                .text('-∞')
                .attr('fill', textColor)
                .attr('font-size', '13px')
                .attr('font-weight', 'bold');

            // Ticks
            const ticks = d3.range(-4, 5);
            svg.selectAll('line.tick')
                .data(ticks)
                .enter()
                .append('line')
                .attr('class', 'tick')
                .attr('x1', d => scale(d))
                .attr('y1', lineY - 5)
                .attr('x2', d => scale(d))
                .attr('y2', lineY + 5)
                .attr('stroke', axisColor)
                .attr('stroke-width', 2);

            svg.selectAll('text.tick')
                .data(ticks)
                .enter()
                .append('text')
                .attr('class', 'tick')
                .attr('x', d => scale(d))
                .attr('y', lineY + 25)
                .text(d => d)
                .attr('text-anchor', 'middle')
                .attr('fill', textColor)
                .attr('font-size', '12px');

            // Determine highlighted region
            let highlightStart = -5;
            let highlightEnd = 5;
            let excludeZero = false;
            let showZeroStroke = false;

            switch (variation) {
                case 'R+':
                    highlightStart = 0;
                    break;
                case 'R-':
                    highlightEnd = 0;
                    break;
                case 'R*':
                    excludeZero = true;
                    break;
                case 'R*+':
                    highlightStart = 0;
                    excludeZero = true;
                    break;
                case 'R*-':
                    highlightEnd = 0;
                    excludeZero = true;
                    break;
                case 'R':
                default:
                    break;
            }

            const gHighlight = svg.append('g').attr('class', 'highlights');

            const drawHighlight = (startX: number, endX: number) => {
                gHighlight.append('line')
                    .attr('x1', scale(startX))
                    .attr('y1', lineY)
                    .attr('x2', scale(startX))
                    .attr('y2', lineY)
                    .attr('stroke', highlightColor)
                    .attr('stroke-width', 6)
                    .attr('stroke-linecap', 'round')
                    .style('filter', 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))')
                    .transition()
                    .duration(800)
                    .ease(d3.easeCubicOut)
                    .attr('x2', scale(endX));
            };

            if (variation === 'R*') {
                drawHighlight(-5.2, -0.1);
                drawHighlight(0.1, 5.2);
                showZeroStroke = true;
            } else {
                drawHighlight(
                    highlightStart === -5 ? -5.2 : highlightStart,
                    highlightEnd === 5 ? 5.2 : highlightEnd
                );
                if (excludeZero || highlightStart === 0 || highlightEnd === 0) {
                    showZeroStroke = true;
                }
            }

            // Zero point
            const zeroX = scale(0);
            const zeroGroup = svg.append('g').attr('class', 'zero-point');

            zeroGroup.append('circle')
                .attr('cx', zeroX)
                .attr('cy', lineY)
                .attr('r', 0)
                .attr('fill', excludeZero ? excludedColor : highlightColor)
                .attr('stroke', showZeroStroke ? highlightColor : 'none')
                .attr('stroke-width', 2)
                .transition()
                .delay(500)
                .duration(400)
                .attr('r', 6);

            // Zero label
            zeroGroup.append('text')
                .attr('x', zeroX)
                .attr('y', lineY - 16)
                .text('0')
                .attr('text-anchor', 'middle')
                .attr('fill', showZeroStroke ? highlightColor : textColor)
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
                .attr('opacity', 0)
                .transition()
                .delay(600)
                .duration(300)
                .attr('opacity', 1);

            // Mathematical notation at the top
            const notationMap: Record<string, string> = {
                'R': 'ℝ = ] −∞ , +∞ [',
                'R+': 'ℝ⁺ = [ 0 , +∞ [',
                'R-': 'ℝ⁻ = ] −∞ , 0 ]',
                'R*': 'ℝ* = ] −∞ , 0 [ ∪ ] 0 , +∞ [',
                'R*+': 'ℝ*⁺ = ] 0 , +∞ [',
                'R*-': 'ℝ*⁻ = ] −∞ , 0 [',
            };

            svg.append('text')
                .attr('x', cx)
                .attr('y', 60)
                .text(notationMap[variation] || notationMap['R'])
                .attr('text-anchor', 'middle')
                .attr('fill', highlightColor)
                .attr('font-size', '22px')
                .attr('font-weight', 'bold')
                .attr('font-family', 'serif')
                .attr('opacity', 0)
                .transition()
                .delay(200)
                .duration(600)
                .attr('opacity', 1);

            // Explanation text below
            const explanations: Record<string, string> = {
                'R': "L'ensemble de tous les nombres réels.",
                'R+': "Les nombres réels positifs (incluant zéro).",
                'R-': "Les nombres réels négatifs (incluant zéro).",
                'R*': "Les nombres réels privés de zéro.",
                'R*+': "Les nombres réels strictement positifs (excluant zéro).",
                'R*-': "Les nombres réels strictement négatifs (excluant zéro).",
            };

            svg.append('text')
                .attr('x', cx)
                .attr('y', height - 40)
                .text(explanations[variation] || explanations['R'])
                .attr('text-anchor', 'middle')
                .attr('fill', textColor)
                .attr('font-size', '14px')
                .attr('opacity', 0)
                .transition()
                .delay(800)
                .duration(500)
                .attr('opacity', 1);

            // Bracket indicators at endpoints
            if (variation !== 'R') {
                if (highlightStart === 0 || highlightEnd === 0) {
                    const bracketX = scale(0);
                    const displayBracket = highlightStart === 0
                        ? (excludeZero ? ']' : '[')
                        : (excludeZero ? '[' : ']');

                    svg.append('text')
                        .attr('x', bracketX)
                        .attr('y', lineY + 45)
                        .text(displayBracket)
                        .attr('text-anchor', 'middle')
                        .attr('fill', highlightColor)
                        .attr('font-size', '20px')
                        .attr('font-weight', 'bold')
                        .attr('opacity', 0)
                        .transition()
                        .delay(700)
                        .duration(300)
                        .attr('opacity', 0.8);
                }
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
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, [variation, isDark]);

    return (
        <div ref={containerRef} className="w-full h-full min-h-[300px]" />
    );
}
