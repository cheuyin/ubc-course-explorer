import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


// https://vite.dev/config/
// AI HELP
export default defineConfig({
	plugins: [react()],
	publicDir: "static",
	build: {
		outDir: "./public",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: "http://localhost:4321",
				changeOrigin: true,
			},
		},
	},
});
// END AI HELP
