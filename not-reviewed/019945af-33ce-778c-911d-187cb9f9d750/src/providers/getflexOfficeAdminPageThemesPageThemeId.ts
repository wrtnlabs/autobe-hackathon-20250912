import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a UI page theme by its unique identifier.
 *
 * This function queries the flex_office_page_themes table using the provided
 * pageThemeId. It returns all relevant fields, converting timestamps to ISO
 * string format with proper branding.
 *
 * @param props - Object containing admin authentication and the pageThemeId
 * @param props.admin - Authenticated admin payload performing the request
 * @param props.pageThemeId - The UUID of the UI page theme to retrieve
 * @returns The detailed UI page theme entity matching the provided ID
 * @throws Error if no theme with the given ID exists
 */
export async function getflexOfficeAdminPageThemesPageThemeId(props: {
  admin: AdminPayload;
  pageThemeId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageTheme> {
  const { admin, pageThemeId } = props;

  const result =
    await MyGlobal.prisma.flex_office_page_themes.findUniqueOrThrow({
      where: { id: pageThemeId },
    });

  return {
    id: result.id,
    name: result.name,
    description: result.description ?? undefined,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
  };
}
