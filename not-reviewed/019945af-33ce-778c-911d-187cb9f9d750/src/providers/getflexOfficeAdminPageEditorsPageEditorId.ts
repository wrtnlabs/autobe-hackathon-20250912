import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed page editor session information by its unique ID.
 *
 * Fetches the record from the flex_office_page_editors table, including page
 * reference, editor reference, timestamps, and soft delete status. Only
 * authorized admin users can perform this operation.
 *
 * @param props - Object containing admin credentials and pageEditorId.
 * @param props.admin - Authenticated admin performing the retrieval.
 * @param props.pageEditorId - UUID of the target page editor session.
 * @returns Detailed page editor session matching the provided ID.
 * @throws {Error} When no record is found for the given pageEditorId.
 */
export async function getflexOfficeAdminPageEditorsPageEditorId(props: {
  admin: AdminPayload;
  pageEditorId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageEditor> {
  const { admin, pageEditorId } = props;

  const record =
    await MyGlobal.prisma.flex_office_page_editors.findUniqueOrThrow({
      where: { id: pageEditorId },
    });

  return {
    id: record.id,
    page_id: record.page_id,
    editor_id: record.editor_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
