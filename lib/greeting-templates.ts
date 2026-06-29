export type GreetingTypeId =
  | "christmas"
  | "new-year"
  | "diwali"
  | "eid"
  | "holi";

export type GreetingType = {
  id: GreetingTypeId;
  label: string;
  defaultMessage: string;
};

export type GreetingTemplate = {
  id: string;
  label: string;
  imagePath: string;
  thumbPath: string;
};

export const GREETING_TYPES: GreetingType[] = [
  {
    id: "christmas",
    label: "Christmas",
    defaultMessage: "Merry Christmas!",
  },
  {
    id: "new-year",
    label: "New Year",
    defaultMessage: "Happy New Year!",
  },
  {
    id: "diwali",
    label: "Diwali",
    defaultMessage: "Happy Diwali!",
  },
  {
    id: "eid",
    label: "Eid",
    defaultMessage: "Eid Mubarak!",
  },
  {
    id: "holi",
    label: "Holi",
    defaultMessage: "Happy Holi!",
  },
];

function tpl(
  typeId: GreetingTypeId,
  n: number,
  label?: string,
): GreetingTemplate {
  const id = `template-${n}`;
  const base = `/greetings/${typeId}/${id}`;
  const imagePath = `${base}.jpg`;
  return {
    id,
    label: label ?? `Template ${n}`,
    imagePath,
    // Use full image as thumb until optional {id}-thumb.jpg is added
    thumbPath: imagePath,
  };
}

/** Static template registry — add images under public/greetings/{type}/ */
export const GREETING_TEMPLATES: Record<GreetingTypeId, GreetingTemplate[]> = {
  christmas: [tpl("christmas", 1), tpl("christmas", 2), tpl("christmas", 3), tpl("christmas", 4), tpl("christmas", 5)],
  "new-year": [tpl("new-year", 1), tpl("new-year", 2), tpl("new-year", 3), tpl("new-year", 4), tpl("new-year", 5)],
  diwali: [tpl("diwali", 1), tpl("diwali", 2), tpl("diwali", 3)],
  eid: [tpl("eid", 1), tpl("eid", 2), tpl("eid", 3)],
  holi: [tpl("holi", 1), tpl("holi", 2), tpl("holi", 3)],
};

export function getGreetingType(id: GreetingTypeId): GreetingType {
  const found = GREETING_TYPES.find((t) => t.id === id);
  if (!found) return GREETING_TYPES[0];
  return found;
}

export function getDefaultMessage(typeId: GreetingTypeId): string {
  return getGreetingType(typeId).defaultMessage;
}

export function getTemplatesForType(typeId: GreetingTypeId): GreetingTemplate[] {
  return GREETING_TEMPLATES[typeId] ?? GREETING_TEMPLATES.christmas;
}

export function getTemplate(
  typeId: GreetingTypeId,
  templateId: string,
): GreetingTemplate | undefined {
  return getTemplatesForType(typeId).find((t) => t.id === templateId);
}

export const DEFAULT_GREETING_TYPE: GreetingTypeId = "christmas";
