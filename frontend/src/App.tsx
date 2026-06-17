import { Loader2 } from "lucide-react";
import { RouterProvider } from "react-router-dom";
import { useSeed } from "./hooks/queries";
import router from "./router";

function App() {
	const { isLoading, isError } = useSeed();

	if (isLoading) {
		return (
			<div className="flex h-screen flex-col items-center justify-center gap-3">
				<Loader2 className="size-8 animate-spin text-primary" />
				<p className="text-muted-foreground">Loading course data…</p>
			</div>
		);
	}

	if (isError) {
		// Seed failure is non-fatal — the data may already be loaded — so continue.
		console.error("Seed failed; continuing with existing data.");
	}

	return <RouterProvider router={router} />;
}

export default App;
