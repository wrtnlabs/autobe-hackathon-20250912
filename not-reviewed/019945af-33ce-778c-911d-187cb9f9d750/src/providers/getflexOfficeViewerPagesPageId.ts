import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Retrieve detailed information of a UI page by its ID.
 *
 * This operation fetches a single UI page entity from the flex_office_pages
 * table, returning all details including theme association, lifecycle status,
 * and timestamps. It excludes soft-deleted pages.
 *
 * Authorization requires authenticated viewer role.
 *
 * @param props - Object containing viewer payload and target pageId.
 * @param props.viewer - Authenticated viewer making the request.
 * @param props.pageId - UUID string identifying the UI page.
 * @returns Detailed UI page entity matching the given pageId.
 * @throws {Error} When no page with the given pageId exists or it is soft
 *   deleted.
 */
export async function getflexOfficeViewerPagesPageId(props: {
  viewer: ViewerPayload;
  pageId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePage> {
  const { pageId } = props;

  const page = await MyGlobal.prisma.flex_office_pages.findUnique({
    where: {
      id: pageId,
      deleted_at: null,
    },
  });

  if (page === null) {
    throw new Error("Page not found");
  }

  return {
    id: page.id,
    flex_office_page_theme_id: page.flex_office_page_theme_id ?? undefined,
    name: page.name,
    description: page.description ?? undefined,
    status: page.status,
    created_at: toISOStringSafe(page.created_at),
    updated_at: toISOStringSafe(page.updated_at),
    deleted_at: page.deleted_at ? toISOStringSafe(page.deleted_at) : null,
  };
}
