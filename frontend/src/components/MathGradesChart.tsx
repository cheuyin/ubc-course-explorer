import { Button, CircularProgress, Paper, Stack, ThemeProvider, Typography, Tooltip as Tool} from "@mui/material";
import api from "../api/axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import theme, { LINE_COLOURS } from "../types";

interface Grade {
	year: number;
	average: number;
	enrolled: number;
}
interface Section_ {
    title: string,
	code: string;
	year: number;
	avg: number;
	pass: number;
	fail: number;
}

interface CourseAvgs {
    title: string,
	code: string;
	course_grades: Grade[];
}

function calculateAvgs(courses: Section_[], course_avgs: CourseAvgs[]) {
	for (let i = 0; i < courses.length; i++) {
		const year = courses[i].year;
		const code = courses[i].code;
		const average = courses[i].avg;
		const enrolled = courses[i].pass + courses[i].fail;
        const title = courses[i].title;
		if (year === 1900 || parseInt(code) >= 190 || parseInt(code) === 152 || parseInt(code) === 131) {
			continue;
		}
		let course = course_avgs.find((c) => c.code === code);

		if (course === undefined) {
			const course_avg = [{ year, average, enrolled }];
			course = { title,  code, course_grades: course_avg };
			course_avgs.push(course);
			course_avgs.sort((a, b) => parseInt(a.code) - parseInt(b.code));
		} else {
			let c_avg = course.course_grades.find((c) => c.year === year);
			if (c_avg === undefined) {
				c_avg = { year, average, enrolled };
				course.course_grades.push(c_avg);
				course.course_grades.sort((a, b) => a.year - b.year);
			} else {
				c_avg.average = (c_avg.average * c_avg.enrolled + average * enrolled) / (c_avg.enrolled + enrolled);
				c_avg.enrolled += enrolled;
			}
			c_avg.average = Number(c_avg.average.toFixed(2));
		}
	}
}

async function getGrades() {
	const query = {
		kind: "course_offerings",
		query: {
			WHERE: {
				IS: {
					dept: "math",
				},
			},
			OPTIONS: {
				COLUMNS: ["title","code", "year", "avg", "pass", "fail"],
				ORDER: "code",
			},
		},
	};
	const courses_res = await api.post("/v1/search", query);
	const courses = courses_res.data;

	const grades: CourseAvgs[] = [];
	calculateAvgs(courses, grades);
	return grades;
}

// debugged w/ gemini
// https://recharts.github.io/en-US/examples/LineChartHasMultiSeries/
export default function MathGradesChart() {
	const [data, setData] = useState<CourseAvgs[] | null>(null);

	useEffect(() => {
		getGrades().then(setData);
	}, []);

	// created with copilot
	const [visible, setVisible] = useState<Record<string, boolean>>({});
    type ButtonVariant = "text" | "contained" | "outlined";
	const [variant, setVariant] = useState<Record<string, ButtonVariant>>({});

	useEffect(() => {
		if (data) {
			setVisible(Object.fromEntries(data.map((course) => [course.code, true])));
			setVariant(Object.fromEntries(data.map((course) => [course.code, "contained" as ButtonVariant])));
		}
	}, [data]);
	const handleClick = (code: string) => {
		setVisible((prev) => ({
			...prev,
			[code]: !prev[code],
		}));
		if (variant[code] === "contained") {
			setVariant((prev) => ({
				...prev,
				[code]: "outlined",
			}));
		} else {
			setVariant((prev) => ({
				...prev,
				[code]: "contained",
			}));
		}
	};
	// created with copilot

	if (!data) {
		return <CircularProgress />;
	}

	return (
		<Paper sx={{ p: 3, mb: 3 }} elevation={2}>
			<Typography variant="h6" align="center">
				Average grades in first year calculus courses
			</Typography>
			<LineChart
				style={{ width: "100%", maxHeight: "70vh", aspectRatio: 1.618 }}
				responsive
				margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
			>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="year" type="category" allowDuplicatedCategory={false} />
				<YAxis dataKey="average" width="auto" />
				<Tooltip />
				{data.map((course) =>
					visible[course.code] === false ? null : (
						<Line
							dataKey="average"
							data={course.course_grades}
							key={course.code}
							name={"MATH" + course.code}
							stroke={LINE_COLOURS[course.code] ?? "#000"}
							dot={{
								fill: LINE_COLOURS[course.code] ?? "#000",
							}}
						/>
					)
				)}
			</LineChart>
			<Stack
				spacing={{ xs: 1, sm: 2, md: 3 }}
				direction="row"
				justifyContent={"center"}
				alignItems={"center"}
				useFlexGap
				sx={{ flexWrap: "wrap" }}
			>
				{data.map((course) => (
					<ThemeProvider theme={theme}>
						<Tool title={course.title}>
							<Button
								variant={variant[course.code]}
								onClick={() => handleClick(course.code)}
								sx={{ backgroundColor: theme.palette.custom[Number(course.code)] }}
							>
								MATH {course.code}
							</Button>
						</Tool>
					</ThemeProvider>
				))}
			</Stack>
		</Paper>
	);
} // debugged button and created line visibility functionaility with Copilot
