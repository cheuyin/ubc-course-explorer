import { useEffect, useState } from "react";
import {
	Paper,
	Typography,
	CircularProgress,
} from "@mui/material";
import api from "../api/axios";
import axios from "axios";
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, BarChart } from "recharts";

interface Section {
    id: string,
    instructor: string,
    year: number,
    avg: number,
    pass: number,
	fail: number;
	audit: number;
    links: {
        self: string,
        course: string,
    }
}

interface Enrolled_year {
	year: number;
	cpsc110_enrolled: number;
	cpsc121_enrolled: number;
	cpsc210_enrolled: number;
}

function calculateEnrollments(course_sections: Section[], course_enrolled: Enrolled_year[]) {
	for (let i = 0; i < course_sections.length; i++) {
		const year = course_sections[i].year;
		const enrolled = course_sections[i].pass + course_sections[i].fail;
		const course = course_sections[i].links.course.split("courses/")[1];
        if (year === 1900) {
            continue;
        }
		let en_yr = course_enrolled.find((yr) => yr.year === year);
		if (en_yr === undefined) {
			if (course === "cpsc110") {
				en_yr = { year, cpsc110_enrolled: enrolled, cpsc121_enrolled: 0, cpsc210_enrolled: 0 };
			} else if (course === "cpsc121") {
				en_yr = { year, cpsc110_enrolled: 0, cpsc121_enrolled: enrolled, cpsc210_enrolled: 0 };
			} else {
				en_yr = { year, cpsc110_enrolled: 0, cpsc121_enrolled: 0, cpsc210_enrolled: enrolled };
			}
			course_enrolled.push(en_yr);
			course_enrolled.sort((a, b) => a.year - b.year);
		} else {
			if (course === "cpsc110") {
				en_yr.cpsc110_enrolled += enrolled;
			} else if (course === "cpsc121") {
                en_yr.cpsc121_enrolled += enrolled;
            } else {
				en_yr.cpsc210_enrolled += enrolled;
			}
		}
	}
}

async function getEnrollments(): Promise<Enrolled_year[]> {
	const cpsc110 = await api.get("/v1/courses/cpsc110");
	const cpsc121 = await api.get("/v1/courses/cpsc121");
	const cpsc210 = await api.get("/v1/courses/cpsc210");
	const cpsc110_s = await axios.get(cpsc110.data.links.sections);
	const cpsc121_s = await axios.get(cpsc121.data.links.sections);
	const cpsc210_s = await axios.get(cpsc210.data.links.sections);

	const cpsc110_sections = cpsc110_s.data.items;
	const cpsc121_sections = cpsc121_s.data.items;
	const cpsc210_sections = cpsc210_s.data.items;
	// currently: have objects of each section - items[]

	const enrolled: Enrolled_year[] = [];

	calculateEnrollments(cpsc110_sections, enrolled);
	calculateEnrollments(cpsc121_sections, enrolled);
	calculateEnrollments(cpsc210_sections, enrolled);
	return enrolled;
}

//recharts.github.io/en-US/api/BarChart/
const CourseEnrollmentChart = ({ isAnimationActive = true }) => {
	const [data, setData] = useState<Enrolled_year[] | null>(null);

	useEffect(() => {
		getEnrollments().then(setData);
	}, []);

	if (!data) {
		return <CircularProgress />;
	}

	return (
		<Paper sx={{ p: 3, mb: 3 }} elevation={2}>
			<Typography variant="h6" align="center">
				Number of students enrolled in introductory CPSC courses over years
			</Typography>
			<BarChart style={{ display: "flex", flexWrap: "wrap", width: "80%", aspectRatio: 1.618 }} responsive data={data}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="year" />
				<YAxis width="auto" />
				<Tooltip />
				<Legend />
				<Bar dataKey="cpsc110_enrolled" name="CPSC 110" fill="#df5250" isAnimationActive={isAnimationActive} />
				<Bar dataKey="cpsc121_enrolled" name="CPSC 121" fill="#9CCC65" isAnimationActive={isAnimationActive} />
				<Bar dataKey="cpsc210_enrolled" name="CPSC 210" fill="#e67384" isAnimationActive={isAnimationActive} />
			</BarChart>
		</Paper>
	);
};

export default CourseEnrollmentChart;

