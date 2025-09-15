import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a UI theme by ID
 *
 * Retrieve detailed information about a specific UI/Page Builder theme
 * identified by its unique ID. Themes store CSS content and metadata for
 * consistent UI appearance.
 *
 * This GET operation fetches all fields of the theme entity from the
 * flex_office_themes table.
 *
 * Authorized users with Admin or Editor roles can access this endpoint to view
 * or manage theme details.
 *
 * @param props - Object containing admin authentication and the theme ID
 * @param props.admin - The authenticated admin making the request
 * @param props.id - The UUID of the theme to retrieve
 * @returns The complete IFlexOfficeTheme entity
 * @throws {Error} Throws if the theme does not exist or the ID is invalid
 */
export async function getflexOfficeAdminThemesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeTheme> {
  const { admin, id } = props;

  const theme = await MyGlobal.prisma.flex_office_themes.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      css: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: theme.id,
    name: theme.name,
    css: theme.css ?? null,
    created_at: toISOStringSafe(theme.created_at),
    updated_at: toISOStringSafe(theme.updated_at),
  };
}
