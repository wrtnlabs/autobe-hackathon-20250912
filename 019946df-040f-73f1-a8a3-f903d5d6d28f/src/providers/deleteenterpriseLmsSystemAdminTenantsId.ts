import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete tenant organization by ID, permanently removing all tenant data.
 *
 * This operation deletes the tenant identified by the provided UUID from the
 * database, including all related data due to Prisma cascade policies. Only
 * system administrators with the 'systemAdmin' role can perform this
 * operation.
 *
 * @param props - Object containing the system administrator payload and tenant
 *   ID to delete
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   deletion
 * @param props.id - The UUID of the tenant to be deleted
 * @returns Promise that resolves when deletion is complete
 * @throws {Error} Throws if tenant does not exist or authorization fails
 */
export async function deleteenterpriseLmsSystemAdminTenantsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  // Authorization is ensured by presence of systemAdmin parameter

  // Verify tenant existence
  await MyGlobal.prisma.enterprise_lms_tenants.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_tenants.delete({ where: { id } });
}
