import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Deletes a custom script entity from the FlexOffice system permanently.
 *
 * This operation permanently removes the custom script record identified by the
 * provided UUID from the flex_office_custom_scripts table. Only active scripts
 * (with deleted_at field null) can be deleted.
 *
 * Authorization is required. Only users with editor or admin roles can perform
 * this deletion.
 *
 * @param props - Object containing the editor payload and custom script ID
 * @param props.editor - Authenticated editor performing the deletion
 * @param props.id - UUID of the custom script to delete
 * @throws {Error} When the custom script does not exist or is already deleted
 */
export async function deleteflexOfficeEditorCustomScriptsId(props: {
  editor: EditorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, id } = props;

  // Verify the script exists and is not deleted
  await MyGlobal.prisma.flex_office_custom_scripts.findFirstOrThrow({
    where: {
      id,
      deleted_at: null,
    },
  });

  // Permanently delete the script
  await MyGlobal.prisma.flex_office_custom_scripts.delete({
    where: { id },
  });
}
