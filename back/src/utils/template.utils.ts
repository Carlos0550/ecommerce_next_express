import { readFile } from "fs/promises";
import path from "path";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const renderTemplate = async (
  templateName: string,
  variables: Record<string, string>
): Promise<string> => {
  const templatePath = path.resolve(process.cwd(), "src", "templates", templateName);
  const raw = await readFile(templatePath, "utf8");

  return Object.entries(variables).reduce((content, [key, value]) => {
    const pattern = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g");
    return content.replace(pattern, value);
  }, raw);
};
