import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information about a specific tenant.
 *
 * Retrieves the tenant entity by its UUID. Must be called by users authorized
 * as systemAdmin.
 *
 * @param props - Parameters containing systemAdmin payload and tenant ID
 * @returns Detailed tenant information matching IEnterpriseLmsTenant
 * @throws Error if tenant not found
 */
export async function getenterpriseLmsSystemAdminTenantsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsTenant> {
  const { systemAdmin, id } = props;

  const tenant = await MyGlobal.prisma.enterprise_lms_tenants.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Validate UUID type of returned id
  typia.assertGuard<string & tags.Format<"uuid">>(tenant.id);

  return {
    id: tenant.id,
    code: tenant.code,
    name: tenant.name,
    created_at: toISOStringSafe(tenant.created_at),
    updated_at: toISOStringSafe(tenant.updated_at),
    deleted_at: tenant.deleted_at
      ? toISOStringSafe(tenant.deleted_at)
      : undefined,
  };
}
