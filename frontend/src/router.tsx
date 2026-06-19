import { createBrowserRouter } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";
import SearchResults from "./pages/SearchResults";
import CourseDetail from "./pages/CourseDetail";
import Departments from "./pages/Departments";
import DepartmentDetail from "./pages/DepartmentDetail";
import InstructorDetail from "./pages/InstructorDetail";

const router = createBrowserRouter([
	{
		path: "/",
		element: <AppShell />,
		children: [
			{ index: true, element: <Home /> },
			{ path: "search", element: <SearchResults /> },
			{ path: "courses/:courseId", element: <CourseDetail /> },
			{ path: "departments", element: <Departments /> },
			{ path: "departments/:dept", element: <DepartmentDetail /> },
			{ path: "instructors/:name", element: <InstructorDetail /> },
		],
	},
]);

export default router;
