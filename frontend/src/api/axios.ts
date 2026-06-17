import axios from "axios";

// Create a configured instance of axios
const api = axios.create({
	// Use relative path so it works in Dev (proxy) and Demo (same origin)
	baseURL: "/api",
	headers: {
		"Content-Type": "application/json",
	},
});

export default api;
