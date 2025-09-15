import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Get single FlexOffice custom script details by ID
 *
 * Retrieves a detailed FlexOffice custom script by its unique identifier. The
 * script includes code, name, language, description, source content, and audit
 * timestamps. Only authorized editors can access this method.
 *
 * @param props - Object containing the editor payload and script ID
 * @param props.editor - The authenticated editor payload
 * @param props.id - Unique identifier of the custom script to retrieve
 * @returns The detailed custom script matching the provided ID
 * @throws {Error} Throws if the script is not found
 */
export async function getflexOfficeEditorCustomScriptsId(props: {
  editor: EditorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeCustomScript> {
  const script =
    await MyGlobal.prisma.flex_office_custom_scripts.findUniqueOrThrow({
      where: { id: props.id },
    });

  return {
    id: script.id,
    code: script.code,
    name: script.name,
    description: script.description ?? null,
    script_language: script.script_language,
    script_content: script.script_content,
    created_at: toISOStringSafe(script.created_at),
    updated_at: toISOStringSafe(script.updated_at),
    deleted_at: script.deleted_at ? toISOStringSafe(script.deleted_at) : null,
  };
}
