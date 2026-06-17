import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { seriesColour } from "@/types";
import type { TrendPoint } from "@/utils/grades";

export default function GradeTrendChart({ data }: { data: TrendPoint[] }) {
	return (
		<ResponsiveContainer width="100%" height={320}>
			<LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
				<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
				<XAxis
					dataKey="year"
					type="category"
					allowDuplicatedCategory={false}
					stroke="var(--muted-foreground)"
					tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
				/>
				<YAxis
					domain={["dataMin - 5", "dataMax + 5"]}
					tickFormatter={(v) => `${v}%`}
					stroke="var(--muted-foreground)"
					tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
				/>
				<Tooltip
					formatter={(v) => [`${v}%`, "Avg grade"]}
					contentStyle={{
						background: "var(--popover)",
						border: "1px solid var(--border)",
						borderRadius: "var(--radius)",
						color: "var(--popover-foreground)",
					}}
					labelStyle={{ color: "var(--popover-foreground)" }}
				/>
				<Line type="monotone" dataKey="avg" stroke={seriesColour(0)} strokeWidth={2} dot={{ r: 3 }} />
			</LineChart>
		</ResponsiveContainer>
	);
}
