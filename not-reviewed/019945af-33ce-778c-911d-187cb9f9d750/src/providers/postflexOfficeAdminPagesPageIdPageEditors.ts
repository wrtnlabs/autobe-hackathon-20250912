import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new page editor session for a UI page and editor user.
 *
 * This enables collaborative editing by tracking active editor sessions and
 * enforcing concurrency control. Each editor can only be active once per page.
 *
 * @param props - Object containing admin authentication, pageId, and editor
 *   session creation data
 * @param props.admin - Authenticated admin payload performing the operation
 * @param props.pageId - UUID of the UI page for which to create the editor
 *   session
 * @param props.body - Data required to create the editor session (page_id and
 *   editor_id)
 * @returns The newly created IFlexOfficePageEditor record
 * @throws {Error} Throws if Prisma client operation fails
 */
export async function postflexOfficeAdminPagesPageIdPageEditors(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageEditor.ICreate;
}): Promise<IFlexOfficePageEditor> {
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_page_editors.create({
    data: {
      id,
      page_id: props.body.page_id,
      editor_id: props.body.editor_id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    page_id: created.page_id,
    editor_id: created.editor_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
