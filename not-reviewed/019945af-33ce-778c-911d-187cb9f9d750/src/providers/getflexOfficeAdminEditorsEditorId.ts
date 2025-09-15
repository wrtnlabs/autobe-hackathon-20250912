import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific editor user by ID
 *
 * This operation returns detailed information about a single Editor user from
 * the flex_office_editors table, excluding sensitive information such as
 * password hashes. Only accessible by users with the admin role. Throws a 404
 * error if the editor with the specified ID does not exist.
 *
 * @param props - Object containing the authenticated admin and the editor ID
 * @param props.admin - The authenticated admin performing the request
 * @param props.editorId - The UUID of the editor user to retrieve
 * @returns The detailed editor user information matching IFlexOfficeEditor
 * @throws {Error} Throws if the editor is not found (404)
 */
export async function getflexOfficeAdminEditorsEditorId(props: {
  admin: AdminPayload;
  editorId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeEditor> {
  const { admin, editorId } = props;

  const editor = await MyGlobal.prisma.flex_office_editors.findUniqueOrThrow({
    where: { id: editorId },
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: editor.id,
    name: editor.name,
    email: editor.email,
    created_at: toISOStringSafe(editor.created_at),
    updated_at: toISOStringSafe(editor.updated_at),
  };
}
