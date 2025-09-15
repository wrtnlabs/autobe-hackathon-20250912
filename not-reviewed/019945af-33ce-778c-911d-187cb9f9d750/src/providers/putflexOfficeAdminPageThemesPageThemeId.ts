import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing FlexOffice UI page theme by ID
 *
 * This operation updates the properties of an existing page theme within the
 * FlexOffice system. It ensures the uniqueness of theme name and modifies theme
 * details such as name and description. The operation is authorized for admin
 * users only.
 *
 * @param props - Object containing admin user info, pageThemeId path parameter,
 *   and update body
 * @param props.admin - AdminPayload representing the authenticated admin user
 * @param props.pageThemeId - Unique identifier of the page theme to update
 * @param props.body - Update data for the page theme
 * @returns Updated IFlexOfficePageTheme object with accurate timestamp strings
 * @throws {Error} Throws error if the theme does not exist or the new name
 *   duplicates another theme
 */
export async function putflexOfficeAdminPageThemesPageThemeId(props: {
  admin: AdminPayload;
  pageThemeId: string & tags.Format<"uuid">;
  body: IFlexOfficePageTheme.IUpdate;
}): Promise<IFlexOfficePageTheme> {
  const { admin, pageThemeId, body } = props;

  // 1. Verify that the theme with pageThemeId exists
  const existing =
    await MyGlobal.prisma.flex_office_page_themes.findUniqueOrThrow({
      where: { id: pageThemeId },
    });

  // 2. If body.name is provided, check uniqueness excluding current theme
  if (body.name !== undefined && body.name !== null) {
    const duplicate = await MyGlobal.prisma.flex_office_page_themes.findFirst({
      where: {
        name: body.name,
        NOT: { id: pageThemeId },
      },
    });
    if (duplicate) {
      throw new Error(`Theme name '${body.name}' already exists.`);
    }
  }

  // 3. Update fields (only name and description, css is ignored as it does not exist in DB)
  const updated = await MyGlobal.prisma.flex_office_page_themes.update({
    where: { id: pageThemeId },
    data: {
      name: body.name ?? undefined,
      description: body.description ?? undefined,
    },
  });

  // 4. Return updated theme object with date-time strings
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
