import { useEffect, useState } from "react";
import { CircularProgress, Paper, Typography } from "@mui/material";
import api from "../api/axios";
import { Tooltip, Pie, PieChart, Sector, type PieSectorDataItem } from "recharts";

interface RoomType {
    type: string,
    value: number,
}

interface Room {
	building: string;
	type: string;
}

function makeData(buildings: Room[], building_data: RoomType[] ) {
    for (let i = 0; i < buildings.length; i++) {
			const type = buildings[i].type;
			
			let roomType = building_data.find((rooms) => rooms.type === type);

			if (roomType === undefined) {
                if (type === "") {
                    roomType = {type: "Not specified", value: 1 };
                } else {
                    roomType = { type, value: 1 };
                }
				
                building_data.push(roomType);
			} else {
				roomType.value += 1;
			}
		}
}

async function getBuildings(): Promise<RoomType[]> {
    const query = {
			kind: "facilities",
			query: {
				WHERE: {
					
				},
				OPTIONS: {
					COLUMNS: ["building", "type"],
					ORDER: "type",
				},
			},
		};
    const res = await api.post("/v2/search", query);
    const buildings = res.data;

    const building_data: RoomType[] = [];
    makeData(buildings, building_data);
    return building_data;
}
// https://recharts.github.io/en-US/examples/CustomActiveShapePieChart/ - used for calculation of proportions for pie chart segment shapes as well as implementation of tooltip labels (below functions)
const renderActiveShape = ({
	cx,
	cy,
	midAngle,
	innerRadius,
	outerRadius,
	startAngle,
	endAngle,
	fill,
	payload,
	percent,
	value,
}: PieSectorDataItem) => {
	const RADIAN = Math.PI / 180;
	const sin = Math.sin(-RADIAN * (midAngle ?? 1));
	const cos = Math.cos(-RADIAN * (midAngle ?? 1));
	const sx = (cx ?? 0) + ((outerRadius ?? 0) + 10) * cos;
	const sy = (cy ?? 0) + ((outerRadius ?? 0) + 10) * sin;
	const mx = (cx ?? 0) + ((outerRadius ?? 0) + 30) * cos;
	const my = (cy ?? 0) + ((outerRadius ?? 0) + 30) * sin;
	const ex = mx + (cos >= 0 ? 1 : -1) * 22;
	const ey = my;
	const textAnchor = cos >= 0 ? "start" : "end";

	return (
		<g>
			<text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
				{`Room type: ${payload.type}`}
			</text>
			<Sector
				cx={cx}
				cy={cy}
				innerRadius={innerRadius}
				outerRadius={outerRadius}
				startAngle={startAngle}
				endAngle={endAngle}
				fill={fill}
			/>
			<Sector
				cx={cx}
				cy={cy}
				startAngle={startAngle}
				endAngle={endAngle}
				innerRadius={(outerRadius ?? 0) + 6}
				outerRadius={(outerRadius ?? 0) + 10}
				fill={fill}
			/>
			<path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
			<circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
			<text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`Number: ${value}`}</text>
			<text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
				{`(Proportion: ${((percent ?? 1) * 100).toFixed(2)}%)`}
			</text>
		</g>
	);
};

const BuildingTypesChart = ({ isAnimationActive = true, defaultIndex = undefined }) => {
	const [data, setData] = useState<RoomType[] | null>(null);

	useEffect(() => {
		getBuildings().then(setData);
	}, []);

	if (!data) {
		return <CircularProgress />;
	}

	return (
		<Paper sx={{ p: 3, mb: 3 }} elevation={2}>
			<Typography variant="h6" align="center">
				Proportions of room types in buildings at UBC
			</Typography>
			<PieChart style={{ width: "100%", maxHeight: "80vh", aspectRatio: 1 }} responsive>
				<Pie
					activeShape={renderActiveShape}
					data={data}
					cx="50%"
					cy="50%"
					innerRadius="60%"
					outerRadius="80%"
					fill="#e67384"
					dataKey="value"
					isAnimationActive={isAnimationActive}
				/>
				<Tooltip content={() => null} defaultIndex={defaultIndex} />
			</PieChart>
		</Paper>
	);
};

export default BuildingTypesChart;