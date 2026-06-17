import type { ReactNode } from "react";

export default function StatTile({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="glass flex-1 min-w-30 rounded-xl p-4">
			<div className="text-2xl font-bold tracking-tight">{value}</div>
			<div className="text-sm text-muted-foreground">{label}</div>
		</div>
	);
}
