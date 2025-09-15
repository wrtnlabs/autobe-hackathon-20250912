import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new FlexOffice custom script.
 *
 * This operation allows editors to create custom programmable script modules in
 * JavaScript or Python. The script must have a unique business code, a name, a
 * scripting language, an optional description, and source content.
 *
 * @param props - Object containing the editor payload and script creation data.
 * @param props.editor - The authenticated editor performing the creation.
 * @param props.body - The data required to create the custom script.
 * @returns The full created FlexOffice custom script entity.
 * @throws {Error} If the script_language is invalid (not 'javascript' or
 *   'python').
 * @throws {Error} If the code is already used (duplicate violation).
 */
export async function postflexOfficeEditorCustomScripts(props: {
  editor: EditorPayload;
  body: IFlexOfficeCustomScript.ICreate;
}): Promise<IFlexOfficeCustomScript> {
  const { editor, body } = props;

  // Validate script_language as either 'javascript' or 'python'
  if (
    body.script_language !== "javascript" &&
    body.script_language !== "python"
  ) {
    throw new Error("Invalid script_language");
  }

  // Check for duplicate code to ensure uniqueness
  const existing = await MyGlobal.prisma.flex_office_custom_scripts.findUnique({
    where: { code: body.code },
  });

  if (existing) {
    throw new Error(`Duplicate code: ${body.code}`);
  }

  // Generate UUID for id and current timestamps
  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the new custom script record
  const created = await MyGlobal.prisma.flex_office_custom_scripts.create({
    data: {
      id: newId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      script_language: body.script_language,
      script_content: body.script_content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return all fields with proper date formatting compatible with DTO
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    script_language: created.script_language,
    script_content: created.script_content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
