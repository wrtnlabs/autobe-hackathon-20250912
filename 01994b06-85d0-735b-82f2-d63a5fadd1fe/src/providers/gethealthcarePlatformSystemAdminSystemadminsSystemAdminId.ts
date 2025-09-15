import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve platform system administrator details by ID
 * (healthcare_platform_systemadmins)
 *
 * Fetches a system administrator's profile using their UUID. Requires
 * systemAdmin authentication. Includes all standard fields but never returns
 * credential or password info. Allows lookup of both active and soft-deleted
 * admins (for audit/compliance). Returns 404-style error if not found.
 *
 * @param props - Parameters including authenticated systemAdmin payload and
 *   target systemAdminId
 *
 *   - SystemAdmin: Authenticated payload for privileged access enforcement
 *   - SystemAdminId: UUID of the admin to retrieve
 *
 * @returns System administrator's profile info (never includes credential
 *   fields)
 * @throws {Error} If the admin is not found, returns a 404-style error.
 */
export async function gethealthcarePlatformSystemAdminSystemadminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformSystemAdmin> {
  const { systemAdmin, systemAdminId } = props;

  const admin =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: {
        id: systemAdminId,
      },
    });

  if (admin === null) {
    throw new Error("System administrator not found");
  }

  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    phone: admin.phone ?? undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
  };
}
