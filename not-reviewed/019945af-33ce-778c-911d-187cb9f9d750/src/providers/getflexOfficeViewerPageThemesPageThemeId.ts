import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Retrieve detailed information of a UI page theme by ID.
 *
 * This function fetches a FlexOffice UI page theme entity by its unique
 * identifier. It returns all schema-verified attributes including name,
 * optional description, and audit timestamps. The css content is not included
 * since it's not defined in the current Prisma schema.
 *
 * @param props - Object containing authenticated viewer and a pageThemeId UUID.
 * @param props.viewer - The authenticated viewer making the request.
 * @param props.pageThemeId - UUID string identifying the UI page theme to
 *   retrieve.
 * @returns The detailed UI page theme record matching the pageThemeId.
 * @throws {Error} Throws error if the page theme is not found.
 */
export async function getflexOfficeViewerPageThemesPageThemeId(props: {
  viewer: ViewerPayload;
  pageThemeId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageTheme> {
  const record =
    await MyGlobal.prisma.flex_office_page_themes.findUniqueOrThrow({
      where: { id: props.pageThemeId },
    });

  return {
    id: record.id,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
