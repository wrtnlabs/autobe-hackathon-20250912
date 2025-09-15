import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve specific page editor session details
 *
 * This operation retrieves the details of a specific active page editor session
 * associated with a UI page in the FlexOffice system. It returns comprehensive
 * information about the editor session for collaboration management. Only
 * authorized admin users can access this data to ensure privacy and integrity.
 *
 * @param props - Object containing admin authorization payload and UUIDs for
 *   page and pageEditor session
 * @param props.admin - Authenticated admin user making the request
 * @param props.pageId - UUID of the UI page the editor session belongs to
 * @param props.pageEditorId - UUID of the page editor session to retrieve
 * @returns The details of the requested active page editor session
 * @throws {Error} If no matching active page editor session is found
 */
export async function getflexOfficeAdminPagesPageIdPageEditorsPageEditorId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  pageEditorId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageEditor> {
  const { admin, pageId, pageEditorId } = props;

  const record = await MyGlobal.prisma.flex_office_page_editors.findFirst({
    where: {
      id: pageEditorId,
      page_id: pageId,
      deleted_at: null,
    },
  });

  if (record === null) throw new Error("Page editor session not found");

  return {
    id: record.id,
    page_id: record.page_id,
    editor_id: record.editor_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
