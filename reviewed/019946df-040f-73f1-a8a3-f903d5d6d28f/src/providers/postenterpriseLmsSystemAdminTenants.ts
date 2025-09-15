import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new tenant organization in the Enterprise LMS system.
 *
 * This operation ensures the uniqueness of the tenant code and initializes all
 * required fields including timestamps and ID generation.
 *
 * Only authorized system administrators can perform this action.
 *
 * @param props - Object containing authenticated systemAdmin and tenant
 *   creation data.
 * @param props.systemAdmin - The authenticated system administrator payload.
 * @param props.body - The tenant creation data including unique code and name.
 * @returns The newly created tenant organization record.
 * @throws {Error} When the tenant code already exists.
 */
export async function postenterpriseLmsSystemAdminTenants(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsTenant.ICreate;
}): Promise<IEnterpriseLmsTenant> {
  const { systemAdmin, body } = props;

  // Check for duplicate tenant code (exclude soft-deleted)
  const existing = await MyGlobal.prisma.enterprise_lms_tenants.findFirst({
    where: {
      code: body.code,
      deleted_at: null,
    },
  });

  if (existing) {
    throw new Error("Tenant code already exists");
  }

  // Generate timestamp and UUID
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  // Create the tenant
  const created = await MyGlobal.prisma.enterprise_lms_tenants.create({
    data: {
      id,
      code: body.code,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created tenant record with date fields formatted
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
