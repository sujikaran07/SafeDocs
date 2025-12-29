import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  Icon: LucideIcon | React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

export default function FeatureCard({ Icon, title, children }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow hover:shadow-lg transition">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10">
        <Icon className="h-6 w-6 text-indigo-400" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-400">{children}</p>
    </div>
  );
}
