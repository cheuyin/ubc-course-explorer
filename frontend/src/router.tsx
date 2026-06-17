import { createBrowserRouter } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";
import SearchResults from "./pages/SearchResults";
import CourseDetail from "./pages/CourseDetail";
import Departments from "./pages/Departments";

const router = createBrowserRouter([
	{
		path: "/",
		element: <AppShell />,
		children: [
			{ index: true, element: <Home /> },
			{ path: "search", element: <SearchResults /> },
			{ path: "courses/:courseId", element: <CourseDetail /> },
			{ path: "departments", element: <Departments /> },
		],
	},
]);

export default router;
