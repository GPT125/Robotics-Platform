import { Dialog } from './Dialog';
import { Bot, Compass, Radar, Search, Trophy, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const commands = [
  { label: 'Scout current match', to: '/app/scout', icon: Radar },
  { label: 'Compare teams', to: '/app/compare', icon: Users },
  { label: 'Open alliance builder', to: '/app/alliance', icon: Trophy },
  { label: 'Open robot simulator', to: '/app/robots/competition-bot/sim', icon: Bot },
  { label: 'Draw autonomous path', to: '/app/path', icon: Compass },
];

export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onClose={onClose}>
      <div className="border-b border-line p-4">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-ink/70 px-3 py-3 text-slate-400">
          <Search size={18} />
          <input className="w-full bg-transparent text-sm outline-none" autoFocus placeholder="Search RoboLab" />
        </div>
      </div>
      <div className="p-2">
        {commands.map((command) => (
          <button
            key={command.to}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-slate-200 hover:bg-white/5"
            onClick={() => {
              navigate(command.to);
              onClose();
            }}
          >
            <command.icon className="text-electric" size={18} />
            {command.label}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
