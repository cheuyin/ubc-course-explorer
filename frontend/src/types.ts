import { type ThemeOptions, createTheme } from "@mui/material";

//stackoverflow.com/questions/50069724/how-to-add-custom-material-ui-palette-colors - used for reference
declare module "@mui/material/styles" {
	interface Palette {
		custom: {
			[key: string]: string;
		};
	}

	interface PaletteOptions {
		custom?: {
			[key: string]: string;
		};
	}
}

declare module "@mui/material/Button" {
	interface ButtonPropsColorOverrides {
		custom: true;
	}
}

export interface Organization {
	id: string;
	name: string;
	links: {
		self: string;
		courses: string[]; // Course urls
	};
}

export interface Course {
	id: string;
	title: string;
	dept: string;
	code: string;
}

export interface Section {
	id: string;
	instructor: string;
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
}

export interface Building {
	id: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	links: {
        self: string,
        rooms: string,
    }
}

export const LINE_COLOURS: Record<string, string> = {
	"100": "#01722c",
	"101": "#b9203eea",
	"102": "#749c6f",
	"103": "#df5250",
	"104": "#9CCC65",
	"105": "#E57373",
	"110": "#2E7D32",
	"120": "#FF4081",
	"121": "#66BB6A",
	"180": "#e67384",
	"184": "#456941",
};

// Define a professional, academic color palette
const themeOptions: ThemeOptions = {
	palette: {
		primary: {
			main: "#ebebeb",
			light: "#ffc7d3",
		},
		secondary: {
			main: "#728b43cb",
		},
		background: {
			default: "#c2cfb4", // Light gray background so Paper components pop
			paper: "#ebebeb",
		},
		custom: {
			...LINE_COLOURS,
		},
	},
	typography: {
		fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
		h6: {
			fontWeight: 600,
		},
	},
	shape: {
		borderRadius: 8, // Slightly more rounded, modern corners
	},
};

const theme = createTheme(themeOptions);

export default theme;