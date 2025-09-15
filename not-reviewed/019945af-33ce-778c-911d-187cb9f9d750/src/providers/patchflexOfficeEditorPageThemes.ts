import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { IPageIFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageTheme";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Search and retrieve a filtered, paginated list of UI page themes.
 *
 * Retrieves FlexOffice UI page themes from the system database with optional
 * filters and pagination parameters. Only active themes (deleted_at is null)
 * are listed. Supports filtering by name with partial matching. Pagination is
 * supported via page and limit.
 *
 * @param props - Object containing the authenticated editor payload and the
 *   request filter and pagination parameters
 * @param props.editor - Authenticated editor user payload
 * @param props.body - Filter and pagination request payload
 * @returns Paginated list of UI page theme summaries matching the search
 *   criteria
 * @throws {Error} When database query fails or invalid parameters are provided
 */
export async function patchflexOfficeEditorPageThemes(props: {
  editor: EditorPayload;
  body: IFlexOfficePageTheme.IRequest;
}): Promise<IPageIFlexOfficePageTheme.ISummary> {
  const { body } = props;

  // Set default page and limit
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build the where condition
  const whereCondition = {
    deleted_at: null as null,
    ...(body.name !== undefined &&
      body.name !== null && {
        name: {
          contains: body.name,
        },
      }),
  };

  // Query the database in parallel for count and paginated results
  const [themes, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_themes.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    }),
    MyGlobal.prisma.flex_office_page_themes.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
    })),
  };
}
