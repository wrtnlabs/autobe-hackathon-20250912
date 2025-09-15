import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Permanently delete a theme by its unique identifier.
 *
 * This operation removes the theme record from the flex_office_themes table
 * completely. It requires an authenticated editor to perform the deletion. If
 * the theme does not exist, an error is thrown.
 *
 * @param props - Object containing the authenticated editor payload and the
 *   theme ID.
 * @param props.editor - The authenticated editor performing the deletion.
 * @param props.id - Unique identifier of the theme to delete.
 * @throws {Error} Throws if the theme with the specified ID does not exist.
 */
export async function deleteflexOfficeEditorThemesId(props: {
  editor: EditorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.flex_office_themes.findUniqueOrThrow({
    where: { id: props.id },
  });

  await MyGlobal.prisma.flex_office_themes.delete({
    where: { id: props.id },
  });
}
