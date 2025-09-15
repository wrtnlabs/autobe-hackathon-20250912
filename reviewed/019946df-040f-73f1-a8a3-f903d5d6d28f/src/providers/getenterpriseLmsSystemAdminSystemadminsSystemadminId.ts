import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve system administrator by ID
 *
 * Retrieves detailed system administrator information by their unique UUID.
 * Access is restricted to authenticated systemAdmin users. Returns the full
 * administrator entity from the enterprise_lms_systemadmin table.
 *
 * @param props - Object containing the authenticated systemAdmin and the
 *   systemadminId UUID
 * @param props.systemAdmin - The authenticated systemAdmin payload
 * @param props.systemadminId - Unique identifier of the system administrator to
 *   retrieve
 * @returns The detailed system administrator information
 * @throws {Error} 404 error if the system administrator is not found
 */
export async function getenterpriseLmsSystemAdminSystemadminsSystemadminId(props: {
  systemAdmin: SystemadminPayload;
  systemadminId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsSystemAdmin> {
  const { systemadminId } = props;

  const admin =
    await MyGlobal.prisma.enterprise_lms_systemadmin.findUniqueOrThrow({
      where: { id: systemadminId },
    });

  return {
    id: admin.id,
    tenant_id: admin.tenant_id,
    email: admin.email,
    password_hash: admin.password_hash,
    first_name: admin.first_name,
    last_name: admin.last_name,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ?? null,
  };
}
