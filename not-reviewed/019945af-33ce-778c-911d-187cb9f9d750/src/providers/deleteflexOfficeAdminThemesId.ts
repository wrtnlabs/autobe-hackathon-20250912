import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a theme by ID in flex_office_themes
 *
 * Permanently deletes the theme with the specified UUID from the database.
 * Throws an error if the theme does not exist. Requires admin authorization.
 *
 * @param props - Object containing admin authentication and the theme ID
 * @param props.admin - Authenticated admin payload
 * @param props.id - UUID of the theme to delete
 * @returns Void
 * @throws {Error} Throws if theme not found
 */
export async function deleteflexOfficeAdminThemesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  await MyGlobal.prisma.flex_office_themes.findUniqueOrThrow({
    where: { id },
  });

  await MyGlobal.prisma.flex_office_themes.delete({
    where: { id },
  });
}
