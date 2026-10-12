import React, { useState } from 'react';
import { LabChallenge, NetworkDevice, NetworkCable } from '../types/network';
import { presetLabs } from '../data/presetLabs';
import {
  GraduationCap,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface LabGuideModalProps {
  currentLab: LabChallenge | null;
  devices: NetworkDevice[];
  cables: NetworkCable[];
  onSelectLab: (lab: LabChallenge) => void;
  onClose: () => void;
}

export const LabGuideModal: React.FC<LabGuideModalProps> = ({
  currentLab,
  devices,
  cables,
  onSelectLab,
  onClose
}) => {
  const [selectedLabId, setSelectedLabId] = useState<string>(currentLab?.id || presetLabs[0].id);
  const [expandedHintId, setExpandedHintId] = useState<string | null>(null);

  const activeLab = presetLabs.find(l => l.id === selectedLabId) || presetLabs[0];

  // Evaluate objectives for the active lab
  const objectiveResults = activeLab.objectives.map(obj => ({
    id: obj.id,
    passed: obj.check(devices, cables)
  }));

  const passedCount = objectiveResults.filter(r => r.passed).length;
  const progressPercent = Math.round((passedCount / activeLab.objectives.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl h-[620px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              CCNA Network Simulation Labs & Challenges
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Lab Menu */}
          <div className="w-64 bg-slate-950 border-r border-slate-800 p-3 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-semibold text-slate-500 uppercase px-2 py-1">
              Curated Lab Exercises
            </div>

            {presetLabs.map(lab => {
              const isSelected = lab.id === selectedLabId;
              const isLoaded = currentLab?.id === lab.id;

              return (
                <button
                  key={lab.id}
                  onClick={() => setSelectedLabId(lab.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-500/80 text-white shadow-sm'
                      : 'bg-slate-900/40 hover:bg-slate-900 border-transparent text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[10px] text-slate-400">{lab.category}</span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                        lab.difficulty === 'Beginner'
                          ? 'bg-emerald-950 text-emerald-400'
                          : lab.difficulty === 'Intermediate'
                            ? 'bg-sky-950 text-sky-400'
                            : 'bg-amber-950 text-amber-400'
                      }`}
                    >
                      {lab.difficulty}
                    </span>
                  </div>
                  <div className="text-xs font-medium leading-snug line-clamp-2">{lab.title}</div>
                  {isLoaded && (
                    <div className="mt-1 text-[10px] text-sky-400 font-mono">Current Workspace Lab</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Lab Detail Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-900 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Title & Metadata */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-400 border border-sky-800 font-semibold uppercase">
                    {activeLab.category}
                  </span>
                  <span className="text-xs text-slate-500">· {activeLab.difficulty} Level</span>
                </div>
                <h3 className="text-lg font-bold text-slate-100">{activeLab.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeLab.description}</p>
              </div>

              {/* Progress Bar & Scoring */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">Lab Completion Score</span>
                  <span className="font-mono font-bold text-sky-400">
                    {passedCount} / {activeLab.objectives.length} Tasks ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Lab Tasks & Objectives
                </div>

                {activeLab.objectives.map((obj, idx) => {
                  const passed = objectiveResults[idx]?.passed;
                  const isHintOpen = expandedHintId === obj.id;

                  return (
                    <div
                      key={obj.id}
                      className={`p-3 rounded-lg border transition-all ${
                        passed
                          ? 'bg-emerald-950/20 border-emerald-800/60 text-slate-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-slate-500">
                              {idx + 1}
                            </div>
                          )}
                          <div>
                            <div className={`text-xs ${passed ? 'line-through text-slate-400' : 'font-medium'}`}>
                              {obj.description}
                            </div>
                            {isHintOpen && (
                              <div className="mt-2 p-2 bg-slate-900 border border-slate-800 rounded text-[11px] text-sky-300 font-mono">
                                💡 Hint: {obj.hint}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedHintId(isHintOpen ? null : obj.id)}
                          className="text-[11px] text-slate-400 hover:text-sky-300 flex items-center gap-1 shrink-0"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{isHintOpen ? 'Hide' : 'Hint'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Load topology to test configs in workspace canvas.
              </span>
              <button
                onClick={() => {
                  onSelectLab(activeLab);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Load Lab into Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
