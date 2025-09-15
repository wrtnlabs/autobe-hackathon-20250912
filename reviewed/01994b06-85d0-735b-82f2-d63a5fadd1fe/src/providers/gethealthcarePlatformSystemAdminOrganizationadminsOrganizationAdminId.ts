import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed profile for specific Organization Admin by
 * organizationAdminId.
 *
 * This API returns a detailed profile for an Organization Admin account in the
 * healthcarePlatform, including identity, email, contact, and audit/created
 * fields. It strictly omits any sensitive credential-related data or
 * unauthorized fields. Access is limited to systemAdmin role users for
 * privileged audit, compliance, and management operations.
 *
 * - Only accessible to authenticated systemAdmin users.
 * - Looks up organization admin by UUID (organizationAdminId).
 * - Will throw an error if not found or is soft-deleted (deleted_at ≠ null).
 * - Null or missing optional fields (phone, deleted_at) are returned as undefined
 *   or null per API contract.
 *
 * @param props - Parameters including systemAdmin authorization and the
 *   organizationAdminId (UUID)
 * @param props.systemAdmin - The authenticated SystemadminPayload. Required for
 *   access control.
 * @param props.organizationAdminId - The unique UUID of the organization admin
 *   to retrieve.
 * @returns The detailed profile of the organization admin user without
 *   credential fields.
 * @throws {Error} When the organization admin is not found or is soft-deleted
 *   (deleted_at ≠ null).
 */
export async function gethealthcarePlatformSystemAdminOrganizationadminsOrganizationAdminId(props: {
  systemAdmin: SystemadminPayload;
  organizationAdminId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformOrganizationAdmin> {
  const { organizationAdminId } = props;
  // Query for active org admin (not soft-deleted)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdminId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!admin) {
    throw new Error("Organization admin not found or has been deleted");
  }
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    phone: admin.phone ?? undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at == null
        ? undefined
        : admin.deleted_at === null
          ? null
          : toISOStringSafe(admin.deleted_at),
  };
}
