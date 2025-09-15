import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new Organization Admin user account in the
 * healthcare_platform_organizationadmins table.
 *
 * This creates a new Organization Admin under the healthcarePlatform system,
 * allowing operational management for a specific tenant (organization).
 * OrgAdmin accounts have privileged business access for delegated operations
 * within their assigned org boundaries. This endpoint can only be called by
 * authenticated System Admins.
 *
 * @param props - The props object
 * @param props.systemAdmin - The authenticated SystemadminPayload. Caller must
 *   be a platform System Admin.
 * @param props.body - The ICreate request: business email, full name, optional
 *   phone
 * @returns The newly created Organization Admin account record (all fields)
 * @throws {Error} If email is not unique or on other database constraint
 *   violations
 */
export async function posthealthcarePlatformSystemAdminOrganizationadmins(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformOrganizationAdmin.ICreate;
}): Promise<IHealthcarePlatformOrganizationAdmin> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const createResult =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email,
        full_name: props.body.full_name,
        phone: props.body.phone ?? undefined,
        created_at: now,
        updated_at: now,
        // 'deleted_at' is omitted so remains null
      },
    });
  return {
    id: createResult.id,
    email: createResult.email,
    full_name: createResult.full_name,
    phone: createResult.phone ?? undefined,
    created_at: toISOStringSafe(createResult.created_at),
    updated_at: toISOStringSafe(createResult.updated_at),
    deleted_at:
      createResult.deleted_at !== undefined && createResult.deleted_at !== null
        ? toISOStringSafe(createResult.deleted_at)
        : null,
  };
}
