import { Loader2, Inbox, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
	return (
		<div className="flex flex-col items-center gap-3 py-16">
			<Loader2 className="size-7 animate-spin text-primary" />
			<p className="text-sm text-muted-foreground">{label}</p>
		</div>
	);
}

export function ErrorState({ error }: { error: unknown }) {
	const message =
		(error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
		(error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
		(error as Error)?.message ||
		"Something went wrong.";
	return (
		<Alert variant="destructive" className="my-4">
			<TriangleAlert />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
	return (
		<div className="flex flex-col items-center gap-2 py-16 text-center">
			<Inbox className="size-12 text-muted-foreground/50" />
			<p className="text-lg font-medium text-muted-foreground">{title}</p>
			{hint && <p className="text-sm text-muted-foreground">{hint}</p>}
		</div>
	);
}
