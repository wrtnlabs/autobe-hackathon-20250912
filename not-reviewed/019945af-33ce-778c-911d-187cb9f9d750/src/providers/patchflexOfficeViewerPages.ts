import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import { IPageIFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePage";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Search and list UI pages with filtering and pagination
 *
 * This function retrieves a paginated list of UI pages from the
 * flex_office_pages table. It supports filtering by status, theme id, and a
 * search keyword on name/description. Soft-deleted pages (deleted_at not null)
 * are excluded.
 *
 * @param props - Object containing the viewer payload and search request body
 * @param props.viewer - Authenticated viewer user information
 * @param props.body - Search criteria and pagination parameters
 * @returns Paginated list of UI page summaries, including pagination metadata
 * @throws {Error} Throws error if any database operation fails or invalid input
 */
export async function patchflexOfficeViewerPages(props: {
  viewer: ViewerPayload;
  body: IFlexOfficePage.IRequest;
}): Promise<IPageIFlexOfficePage.ISummary> {
  const { viewer, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereConditions = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.flex_office_page_theme_id !== undefined &&
      body.flex_office_page_theme_id !== null && {
        flex_office_page_theme_id: body.flex_office_page_theme_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { name: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  };

  const [pages, total] = await Promise.all([
    MyGlobal.prisma.flex_office_pages.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_pages.count({ where: whereConditions }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: pages.map((page) => ({
      id: page.id as string & tags.Format<"uuid">,
      name: page.name,
      status: page.status,
      created_at: toISOStringSafe(page.created_at),
    })),
  };
}
