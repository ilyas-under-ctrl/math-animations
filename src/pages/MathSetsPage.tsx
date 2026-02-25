import { useState, useCallback } from 'react';
import LabLayout from '../components/LabLayout';
import { useTheme } from '../context/ThemeContext';
import SetsInclusionAnimation from '../components/SetsInclusionAnimation';
import VariationsAnimation from '../components/VariationsAnimation';
import PascalTriangleAnimation from '../components/PascalTriangleAnimation';
import { Play, Pause, StepForward, RotateCcw } from 'lucide-react';

interface PageProps {
    onNavigate: (page: string) => void;
    initialMode: 'inclusion' | 'variations' | 'pascal';
}

export default function MathSetsPage({ onNavigate, initialMode }: PageProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [animationSpeed, setAnimationSpeed] = useState(1);
    const [selectedVariation, setSelectedVariation] = useState<string>('R');

    // Pascal state
    const [pascalRows, setPascalRows] = useState(6);
    const [pascalPlaying, setPascalPlaying] = useState(false);
    const [pascalStepTrigger, setPascalStepTrigger] = useState(0);
    const [pascalProgress, setPascalProgress] = useState('');
    const [pascalResetKey, setPascalResetKey] = useState(0);

    const textPrimary = isDark ? 'text-[#F1F5F9]' : 'text-[#1E293B]';
    const textSecondary = isDark ? 'text-[#94A3B8]' : 'text-[#64748B]';
    const cardBg = isDark ? 'bg-[#334155]/50' : 'bg-[#EFFAFF]';
    const borderColor = isDark ? 'border-[#475569]' : 'border-[#3B82F6]/20';

    const handlePascalStepChange = useCallback((step: number, total: number) => {
        setPascalProgress(`${Math.max(0, step + 1)} / ${total}`);
    }, []);

    const handlePascalComplete = useCallback(() => {
        setPascalPlaying(false);
    }, []);

    const renderInclusionControls = () => (
        <section className={`${cardBg} rounded-2xl p-4 space-y-4 border ${borderColor}`}>
            <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Paramètres</h3>
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span className={textPrimary}>Vitesse d'animation</span>
                    <span className="text-blue-500 font-mono font-medium">{animationSpeed}x</span>
                </div>
                <input
                    type="range" min="0.5" max="2" step="0.5"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                    className="w-full accent-blue-500"
                />
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-blue-500/10 space-y-2">
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>Légende</h4>
                {[
                    { label: 'ℕ', name: 'Naturels', color: '#3B82F6' },
                    { label: 'ℤ', name: 'Entiers', color: '#10B981' },
                    { label: 'ⅅ', name: 'Décimaux', color: '#F59E0B', dashed: true },
                    { label: 'ℚ', name: 'Rationnels', color: '#A855F7' },
                    { label: 'ℝ', name: 'Réels', color: '#EF4444' },
                ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: s.color, borderStyle: s.dashed ? 'dashed' : 'solid', backgroundColor: isDark ? `${s.color}15` : `${s.color}20` }} />
                        <span className={`text-sm font-bold ${textPrimary}`} style={{ color: s.color }}>{s.label}</span>
                        <span className={`text-xs ${textSecondary}`}>{s.name}</span>
                    </div>
                ))}
            </div>

            <div className="pt-2 border-t border-blue-500/10">
                <p className={`text-xs ${textSecondary} leading-relaxed`}>
                    Observez comment chaque ensemble est contenu dans le suivant : <br />
                    <span className="font-mono font-bold">ℕ ⊂ ℤ ⊂ ⅅ ⊂ ℚ ⊂ ℝ</span>
                </p>
            </div>
        </section>
    );

    const renderVariationsControls = () => (
        <section className={`${cardBg} rounded-2xl p-4 space-y-4 border ${borderColor}`}>
            <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Sélection de l'Ensemble</h3>

            <div className="flex flex-col gap-2">
                {[
                    { id: 'R', label: 'ℝ', desc: 'Tous les nombres réels' },
                    { id: 'R+', label: 'ℝ⁺', desc: 'Nombres ≥ 0' },
                    { id: 'R-', label: 'ℝ⁻', desc: 'Nombres ≤ 0' },
                    { id: 'R*', label: 'ℝ*', desc: 'Tous sauf 0' },
                    { id: 'R*+', label: 'ℝ*⁺', desc: 'Nombres > 0' },
                    { id: 'R*-', label: 'ℝ*⁻', desc: 'Nombres < 0' },
                ].map(v => (
                    <button
                        key={v.id}
                        onClick={() => setSelectedVariation(v.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${selectedVariation === v.id
                            ? (isDark ? 'bg-[#0F172A] border-emerald-500/50 text-emerald-400' : 'bg-white border-emerald-400 text-emerald-600 shadow-sm')
                            : (isDark ? 'bg-transparent border-transparent hover:bg-[#475569]' : 'bg-transparent border-transparent hover:bg-black/5')
                            } ${selectedVariation !== v.id ? textPrimary : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold font-serif" style={{ minWidth: '2rem' }}>{v.label}</span>
                            <span className={`text-xs ${selectedVariation === v.id ? (isDark ? 'text-emerald-500/80' : 'text-emerald-600/80') : textSecondary}`}>
                                {v.desc}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Interval notation reference */}
            <div className="pt-3 border-t border-emerald-500/10">
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${textSecondary}`}>Notation d'intervalle</h4>
                <div className={`text-xs ${textSecondary} space-y-1 font-mono`}>
                    <div><span className="text-emerald-500">[</span> = inclus (fermé)</div>
                    <div><span className="text-emerald-500">]</span> = exclus (ouvert)</div>
                    <div>● = point inclus</div>
                    <div>○ = point exclus</div>
                </div>
            </div>
        </section>
    );

    const renderPascalControls = () => (
        <section className={`${cardBg} rounded-2xl p-4 space-y-4 border ${borderColor}`}>
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Contrôles</h3>

            {/* Row count */}
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span className={textPrimary}>Nombre de lignes</span>
                    <span className="text-amber-500 font-mono font-medium">{pascalRows}</span>
                </div>
                <input
                    type="range" min="2" max="10" step="1"
                    value={pascalRows}
                    onChange={(e) => {
                        setPascalRows(Number(e.target.value));
                        setPascalPlaying(false);
                        setPascalResetKey(k => k + 1);
                    }}
                    className="w-full accent-amber-500"
                    style={{ accentColor: '#F59E0B' }}
                />
            </div>

            {/* Speed */}
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span className={textPrimary}>Vitesse</span>
                    <span className="text-amber-500 font-mono font-medium">{animationSpeed}x</span>
                </div>
                <input
                    type="range" min="0.5" max="3" step="0.5"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                    className="w-full accent-amber-500"
                    style={{ accentColor: '#F59E0B' }}
                />
            </div>

            {/* Playback controls */}
            <div className="flex justify-center gap-3 pt-3 border-t border-amber-500/10">
                <button
                    onClick={() => setPascalPlaying(!pascalPlaying)}
                    className={`p-3 rounded-full transition-all ${isDark ? 'bg-[#0F172A] text-amber-400 border border-amber-500/30 hover:bg-amber-500/10' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 shadow-sm'}`}
                    title={pascalPlaying ? 'Pause' : 'Lecture automatique'}
                >
                    {pascalPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                    onClick={() => {
                        setPascalPlaying(false);
                        setPascalStepTrigger(s => s + 1);
                    }}
                    className={`p-3 rounded-full transition-all ${isDark ? 'bg-[#0F172A] text-amber-400 border border-amber-500/30 hover:bg-amber-500/10' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 shadow-sm'}`}
                    title="Pas à pas"
                >
                    <StepForward size={20} />
                </button>
                <button
                    onClick={() => {
                        setPascalPlaying(false);
                        setPascalResetKey(k => k + 1);
                    }}
                    className={`p-3 rounded-full transition-all ${isDark ? 'bg-[#0F172A] text-amber-400 border border-amber-500/30 hover:bg-amber-500/10' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 shadow-sm'}`}
                    title="Réinitialiser"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* Progress */}
            {pascalProgress && (
                <div className={`text-center text-xs font-mono ${textSecondary}`}>
                    Étape : <span className="text-amber-500 font-semibold">{pascalProgress}</span>
                </div>
            )}

            {/* Explanation */}
            <div className="pt-3 border-t border-amber-500/10">
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${textSecondary}`}>Principe</h4>
                <p className={`text-xs ${textSecondary} leading-relaxed`}>
                    Chaque nombre est la <span className="text-amber-500 font-semibold">somme des deux nombres</span> situés
                    au-dessus de lui. Les bords sont toujours <span className="text-blue-500 font-semibold">1</span>.
                </p>
                <div className={`mt-2 p-2 rounded-lg text-center font-mono text-sm ${isDark ? 'bg-[#0F172A] text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                    C(n, k) = C(n-1, k-1) + C(n-1, k)
                </div>
            </div>
        </section>
    );

    const canvasContent = (
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
            <h2 className={`text-2xl font-bold mb-4 ${textPrimary}`}>
                {initialMode === 'inclusion' ? 'Inclusion : ℕ ⊂ ℤ ⊂ ⅅ ⊂ ℚ ⊂ ℝ' :
                    initialMode === 'pascal' ? 'Triangle de Pascal' :
                        `Définition de ${selectedVariation === 'R' ? 'ℝ' : selectedVariation === 'R+' ? 'ℝ⁺' : selectedVariation === 'R-' ? 'ℝ⁻' : selectedVariation === 'R*' ? 'ℝ*' : selectedVariation === 'R*+' ? 'ℝ*⁺' : 'ℝ*⁻'}`}
            </h2>
            <div className={`flex-1 w-full max-w-4xl rounded-2xl border ${borderColor} ${isDark ? 'bg-[#0F172A]/50' : 'bg-white/50'} backdrop-blur-sm flex items-center justify-center relative overflow-hidden`}>
                {initialMode === 'inclusion' ? (
                    <SetsInclusionAnimation speed={animationSpeed} />
                ) : initialMode === 'pascal' ? (
                    <PascalTriangleAnimation
                        key={pascalResetKey}
                        rows={pascalRows}
                        isPlaying={pascalPlaying}
                        stepTrigger={pascalStepTrigger}
                        speed={animationSpeed}
                        onStepChange={handlePascalStepChange}
                        onComplete={handlePascalComplete}
                    />
                ) : (
                    <VariationsAnimation variation={selectedVariation} />
                )}
            </div>
        </div>
    );

    const getTitle = () => {
        if (initialMode === 'inclusion') return 'Inclusion des Ensembles';
        if (initialMode === 'pascal') return 'Triangle de Pascal';
        return 'Les Variations de ℝ';
    };

    const getAccent = () => {
        if (initialMode === 'inclusion') return 'blue';
        if (initialMode === 'pascal') return 'amber';
        return 'emerald';
    };

    const getControls = () => {
        if (initialMode === 'inclusion') return renderInclusionControls();
        if (initialMode === 'pascal') return renderPascalControls();
        return renderVariationsControls();
    };

    return (
        <LabLayout
            title={getTitle()}
            onNavigate={onNavigate}
            currentPage={initialMode}
            canvasContent={canvasContent}
            controlsContent={getControls()}
            accentColor={getAccent()}
            headerActions={
                <button
                    onClick={() => {
                        setAnimationSpeed(1);
                        setSelectedVariation('R');
                        setPascalRows(6);
                        setPascalPlaying(false);
                        setPascalResetKey(k => k + 1);
                    }}
                    className={`px-4 py-2 rounded-full font-medium transition-all ${isDark ? 'bg-[#334155] text-[#E2E8F0] hover:bg-[#475569]' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'} text-sm`}
                >
                    Réinitialiser
                </button>
            }
        />
    );
}
