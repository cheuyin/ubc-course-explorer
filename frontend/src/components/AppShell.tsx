import { useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import { Link as RouterLink, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

function HeaderSearch() {
	const [value, setValue] = useState("");
	const navigate = useNavigate();

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (value.trim()) navigate(`/search?q=${encodeURIComponent(value.trim())}`);
			}}
			className="relative ml-2 hidden max-w-md flex-1 sm:block"
		>
			<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder="Search courses (e.g. cpsc, computation)…"
				aria-label="search courses"
				className="pl-9"
			/>
		</form>
	);
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				cn(
					"rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground",
					isActive ? "text-foreground" : "text-muted-foreground"
				)
			}
		>
			{children}
		</NavLink>
	);
}

export default function AppShell() {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="glass sticky top-0 z-50 rounded-none border-x-0 border-t-0">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
					<RouterLink to="/" className="mr-2 flex items-center gap-2">
						<GraduationCap className="size-6 text-primary" />
						<span className="text-lg font-bold tracking-tight">UBC Course Explorer</span>
					</RouterLink>
					<HeaderSearch />
					<div className="flex-1" />
					<nav className="hidden items-center gap-1 sm:flex">
						<NavItem to="/search">Courses</NavItem>
						<NavItem to="/departments">Departments</NavItem>
					</nav>
					<ThemeToggle />
				</div>
			</header>

			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
				<Outlet />
			</main>

			<footer className="border-t border-border/60 py-6 text-center">
				<p className="text-sm text-muted-foreground">UBC Course Explorer · grade history &amp; campus data</p>
			</footer>
		</div>
	);
}
