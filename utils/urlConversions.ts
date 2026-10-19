export const serviceTypeToSubmenu: Record<string, "one" | "group" | "subscribe"> = {
  "1-on-1-tutoring": "one",
  "group-tutoring": "group",
  "self-study": "subscribe",
};

export const submenuToServiceType: Record<string, string> = {
  one: "1-on-1-tutoring",
  group: "group-tutoring",
  subscribe: "self-study",
};

export const courseCodeToNumeric: Record<string, string> = {
  asvab: "40",
  afoqt: "51",
  sift: "52",
  astb: "53",
  oar: "54",
  "hesi-a2": "56",
  "ati-teas": "57",
  cna: "58",
  shsat: "59",
  "state-math-test-prep": "60",
};

export const numericToCourseCode: Record<string, string> = {
  "40": "asvab",
  "51": "afoqt",
  "52": "sift",
  "53": "astb",
  "54": "oar",
  "56": "hesi-a2",
  "57": "ati-teas",
  "58": "cna",
  "59": "shsat",
  "60": "state-math-test-prep",
};

export function toSubmenu(serviceType: string): "one" | "group" | "subscribe" | null {
  return serviceTypeToSubmenu[serviceType] ?? null;
}

export function toNumericCourseCode(courseCode: string): string | null {
  return courseCodeToNumeric[courseCode] ?? null;
}

export function fromSubmenuToServiceType(submenu: string): string {
  return submenuToServiceType[submenu] ?? submenu;
}

export function fromNumericToCourseCode(code: string): string {
  return numericToCourseCode[code] ?? code;
}
