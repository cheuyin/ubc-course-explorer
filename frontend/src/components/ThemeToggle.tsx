import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";

export default function ThemeToggle() {
	const [theme, setThemeState] = useState<Theme>(() => getTheme());

	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label="Toggle theme"
			onClick={() => setThemeState(toggleTheme())}
		>
			{theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
		</Button>
	);
}
