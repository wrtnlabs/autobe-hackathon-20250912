import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing FlexOffice custom script by ID.
 *
 * This operation updates properties such as name, description, script language,
 * and source code content. It requires the user to be an authenticated editor.
 *
 * @param props - Object containing editor info, script ID, and update data
 * @param props.editor - Authenticated editor performing the update
 * @param props.id - UUID of the custom script to be updated
 * @param props.body - Data containing fields to update
 * @returns Updated custom script entity
 * @throws {Error} When the specified custom script does not exist
 */
export async function putflexOfficeEditorCustomScriptsId(props: {
  editor: EditorPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeCustomScript.IUpdate;
}): Promise<IFlexOfficeCustomScript> {
  const { editor, id, body } = props;

  const existingScript =
    await MyGlobal.prisma.flex_office_custom_scripts.findFirst({
      where: {
        id: id,
        deleted_at: null,
      },
    });

  if (!existingScript) {
    throw new Error("Custom script not found");
  }

  // Proceed to update allowed fields
  const updated = await MyGlobal.prisma.flex_office_custom_scripts.update({
    where: { id },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      script_language: body.script_language ?? undefined,
      script_content: body.script_content ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    script_language: updated.script_language,
    script_content: updated.script_content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
