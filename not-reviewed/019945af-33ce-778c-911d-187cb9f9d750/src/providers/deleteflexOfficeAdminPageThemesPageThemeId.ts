import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a FlexOffice UI page theme by ID
 *
 * This API endpoint permanently deletes a UI page theme record identified by
 * the pageThemeId parameter.
 *
 * Authorization is restricted to admin users only.
 *
 * @param props - Object containing the admin user and pageThemeId path
 *   parameter
 * @param props.admin - Authenticated admin user performing the deletion
 * @param props.pageThemeId - UUID of the page theme to delete
 * @throws Error if the page theme does not exist
 */
export async function deleteflexOfficeAdminPageThemesPageThemeId(props: {
  admin: AdminPayload;
  pageThemeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.flex_office_page_themes.findUnique({
    where: { id: props.pageThemeId },
  });

  if (!existing)
    throw new Error(`Page theme with id ${props.pageThemeId} does not exist`);

  await MyGlobal.prisma.flex_office_page_themes.delete({
    where: { id: props.pageThemeId },
  });
}
