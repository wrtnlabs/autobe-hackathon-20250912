import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed FlexOffice permission information by ID.
 *
 * This function fetches a single permission entity from the
 * flex_office_permissions table identified by the given UUID. It includes all
 * relevant fields such as permission_key, description, status, created_at,
 * updated_at, and deleted_at.
 *
 * Authorization: Requires an authenticated admin user.
 *
 * @param props - Object containing admin authentication and permission ID
 *   parameter
 * @param props.admin - Authenticated admin payload
 * @param props.id - UUID of the permission to retrieve
 * @returns Promise resolving to the detailed IFlexOfficePermission entity
 * @throws Error if the permission does not exist (throws by Prisma
 *   findUniqueOrThrow)
 */
export async function getflexOfficeAdminPermissionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePermission> {
  const { admin, id } = props;

  // Authorization is enforced externally by adminAuthorize decorator

  const record =
    await MyGlobal.prisma.flex_office_permissions.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    permission_key: record.permission_key,
    description: record.description ?? null,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
