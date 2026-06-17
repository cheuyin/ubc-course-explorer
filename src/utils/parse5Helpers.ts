import { DefaultTreeAdapterMap } from "parse5";

export type Parse5Element = DefaultTreeAdapterMap["element"];
export type Parse5Document = DefaultTreeAdapterMap["document"];
export type Parse5Node = DefaultTreeAdapterMap["node"];

// Recursively searches a parse5 element tree for elements
// matching a specific attribute name and value.
export function findElementsByAttr(childNodes: Parse5Node[], attrName: string, attrValue: string): Parse5Element[] {
	const childElements = filterElementNodes(childNodes);

	if (childElements.length === 0) {
		return [];
	}

	let res: Parse5Element[] = [];

	for (const childElement of childElements) {
		if ("attrs" in childElement) {
			const attrs = childElement.attrs;
			const targetAttr = attrs.find((attr) => attr.name === attrName);
			if (targetAttr?.value.includes(attrValue)) {
				res.push(childElement);
			}
		}

		res = res.concat(findElementsByAttr(filterElementNodes(childElement.childNodes), attrName, attrValue));
	}

	return res;
}

export function findFirstElementByAttr(
	childElements: Parse5Node[],
	attrName: string,
	attrValue: string
): Parse5Element | null {
	const matchingElements = findElementsByAttr(childElements, attrName, attrValue);
	if (matchingElements.length > 0) {
		return matchingElements[0];
	} else {
		return null;
	}
}

export function getFirstTextNodeValue(node: Parse5Node): string | null {
	if (!("childNodes" in node)) {
		return null;
	}
	const textNode = node.childNodes.find((child) => child.nodeName === "#text");
	if (textNode && "value" in textNode) {
		return textNode.value;
	}
	return null;
}

// Parse5 node arrays include text, comment, and other non-element nodes.
// This filters to only element nodes (those with a tagName and attrs).
export function filterElementNodes(nodes: Parse5Node[]): Parse5Element[] {
	return nodes.filter((node) => "tagName" in node);
}

// Removes excessive whitespaces in the string
// EXAMPLE: "  grah  " --> "grah"
// EXAMPLE: "grah\n   grah" --> "grah grah"
export function cleanString(rawString: string): string {
	const cleanName = rawString.replace(/\s+/g, " ").trim();
	return cleanName;
}
