import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieve detailed information about a specific designer user by their unique
 * identifier.
 *
 * This operation allows a 'designer' user to fetch their own profile details
 * from the task management system. Access is restricted to prevent viewing
 * other designers' data.
 *
 * @param props - Object containing the authenticated designer payload and the
 *   target designer ID
 * @param props.designer - The authenticated designer user payload
 * @param props.id - The UUID of the designer user to retrieve
 * @returns The detailed designer user object conforming to
 *   ITaskManagementDesigner
 * @throws {Error} If the designer is not found or access is unauthorized
 */
export async function gettaskManagementDesignerTaskManagementDesignersId(props: {
  designer: DesignerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementDesigner> {
  const { designer, id } = props;

  // Fetch the designer record, excluding soft-deleted entries
  const found = await MyGlobal.prisma.task_management_designer.findFirstOrThrow(
    {
      where: {
        id,
        deleted_at: null,
      },
    },
  );

  // Authorization: only the user themself can access their data
  if (found.id !== designer.id) {
    throw new Error("Unauthorized: Cannot access other designer's data");
  }

  // Return the designer data with all dates converted to ISO strings
  return {
    id: found.id,
    email: found.email,
    password_hash: found.password_hash,
    name: found.name,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
