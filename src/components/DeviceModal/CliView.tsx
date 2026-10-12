import React, { useState, useRef, useEffect } from 'react';
import { NetworkDevice, NetworkCable } from '../../types/network';
import { CliSessionState, executeIosCommand, getPrompt } from '../../engine/ciscoIosCli';
import { simulatePing } from '../../engine/networkSimulation';
import { Terminal, CornerDownLeft, RotateCcw } from 'lucide-react';

interface CliViewProps {
  device: NetworkDevice;
  allDevices: NetworkDevice[];
  cables: NetworkCable[];
  onUpdateDevice: (updated: NetworkDevice) => void;
  onTriggerSimulation?: (events: any[]) => void;
}

export const CliView: React.FC<CliViewProps> = ({
  device,
  allDevices,
  cables,
  onUpdateDevice,
  onTriggerSimulation
}) => {
  const [history, setHistory] = useState<string[]>([
    `System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)\n` +
    `Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.1(4)M4, RELEASE SOFTWARE (fc1)\n` +
    `Compiled Thu 21-Feb-13 14:12 by prod_rel_team\n\n` +
    `Press RETURN to get started!\n`
  ]);
  const [commandInput, setCommandInput] = useState('');
  const [session, setSession] = useState<CliSessionState>({ mode: 'user-exec' });
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = commandInput;
      const prompt = getPrompt(device, session);

      // Execute command
      const result = executeIosCommand(cmd, device, session);

      let newHistoryEntry = `${prompt} ${cmd}`;
      if (result.output) {
        newHistoryEntry += `\n${result.output}`;
      }

      setHistory(prev => [...prev, newHistoryEntry]);
      if (cmd.trim()) {
        setCommandHistory(prev => [...prev, cmd.trim()]);
      }
      setHistoryIndex(-1);
      setCommandInput('');

      if (result.newSessionState) {
        setSession(result.newSessionState);
      }
      if (result.updatedDevice) {
        onUpdateDevice(result.updatedDevice);
      }

      // Handle ping target simulation
      if (result.pingTarget) {
        const sim = simulatePing(device.id, result.pingTarget, allDevices, cables);
        setTimeout(() => {
          if (sim.success) {
            const avgRtt = Math.max(1, Math.round(sim.rttMs || 4));
            const minRtt = Math.max(1, Math.round(avgRtt * 0.85));
            const maxRtt = Math.round(avgRtt * 1.25);
            setHistory(prev => [
              ...prev,
              `Sending 5, 100-byte ICMP Echos to ${result.pingTarget}, timeout is 2 seconds:\n` +
              `!!!!!\n` +
              `Success rate is 100 percent (5/5), round-trip min/avg/max = ${minRtt}/${avgRtt}/${maxRtt} ms\n`
            ]);
            if (onTriggerSimulation && sim.events.length > 0) {
              onTriggerSimulation(sim.events);
            }
          } else {
            setHistory(prev => [
              ...prev,
              `Sending 5, 100-byte ICMP Echos to ${result.pingTarget}, timeout is 2 seconds:\n` +
              `.....\n` +
              `Success rate is 0 percent (0/5) [${sim.errorReason || 'Destination host unreachable'}]\n`
            ]);
          }
        }, 300);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCommandInput(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandHistory.length === 0 || historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIdx);
        setCommandInput(commandHistory[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Basic autocompletion for common commands
      const val = commandInput.trim().toLowerCase();
      const common = [
        'enable', 'configure terminal', 'interface', 'show ip interface brief',
        'show running-config', 'show ip route', 'show vlan brief', 'no shutdown',
        'shutdown', 'ip address', 'switchport mode trunk', 'switchport mode access',
        'router ospf 1', 'exit', 'end'
      ];
      const match = common.find(c => c.startsWith(val));
      if (match) {
        setCommandInput(match);
      }
    }
  };

  const handleClear = () => {
    setHistory([`System console restarted. Press RETURN to get started!\n`]);
    setSession({ mode: 'user-exec' });
  };

  if (!device.power) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black text-slate-500 font-mono text-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center mb-3">
          <Terminal className="w-6 h-6 text-slate-600" />
        </div>
        <p className="font-semibold text-slate-400">Device is Powered OFF</p>
        <p className="text-xs text-slate-600 mt-1">
          Switch power on from the Physical tab to boot Cisco IOS.
        </p>
      </div>
    );
  }

  const currentPrompt = getPrompt(device, session);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-emerald-400 font-mono text-xs select-text">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cisco IOS Command Line Interface — {device.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Press ? for help | Tab to autocomplete</span>
          <button
            onClick={handleClear}
            title="Reset Terminal"
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Output Scroll area */}
      <div
        className="flex-1 p-3 overflow-y-auto space-y-1 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((entry, idx) => (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed break-words">
            {entry}
          </div>
        ))}

        {/* Current prompt and active input */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="font-bold text-emerald-300 shrink-0">{currentPrompt}</span>
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={e => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-emerald-300 outline-none border-none p-0 text-xs font-mono caret-emerald-400"
          />
        </div>
        <div ref={terminalEndRef} />
      </div>

      {/* Quick Cisco Helper Buttons */}
      <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap gap-1.5 text-[10px] select-none">
        <span className="text-slate-500 self-center mr-1">Quick:</span>
        <button
          onClick={() => {
            setCommandInput('en');
            inputRef.current?.focus();
          }}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
        >
          enable
        </button>
        <button
          onClick={() => {
            setCommandInput('conf t');
            inputRef.current?.focus();
          }}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
        >
          conf t
        </button>
        <button
          onClick={() => {
            setCommandInput('show ip int br');
            inputRef.current?.focus();
          }}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
        >
          sh ip int br
        </button>
        <button
          onClick={() => {
            setCommandInput('show run');
            inputRef.current?.focus();
          }}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
        >
          sh run
        </button>
        <button
          onClick={() => {
            setCommandInput('show ip route');
            inputRef.current?.focus();
          }}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
        >
          sh ip ro
        </button>
        <button
          onClick={() => {
            setCommandInput('no shut');
            inputRef.current?.focus();
          }}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
        >
          no shut
        </button>
      </div>
    </div>
  );
};
