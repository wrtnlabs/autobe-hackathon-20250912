import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an organization administrator (healthcare_platform_organizationadmins)
 * record by its ID
 *
 * Updates a specific organization administrator's information, including their
 * full legal name, business email, and phone number as stored in the
 * 'healthcare_platform_organizationadmins' table. This operation is subject to
 * strict audit trails and can only be performed by users with suitable
 * privileges within the healthcare organization.
 *
 * On successful update, the response includes all current record fields and
 * verification of the changes. The operation logs the update timestamp and
 * ensures all business compliance workflows related to administrator updates
 * are followed.
 *
 * Validation checks include email uniqueness, required fields, and enforcement
 * of business logic for organization admin privileges. Conflict or access
 * errors return clear business-oriented error messages. Only fields existent in
 * the schema are used or returned. The update can only be performed if the
 * record is not marked as deleted (soft-deleted).
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the update
 * @param props.organizationAdminId - The UUID of the organization administrator
 *   to update
 * @param props.body - The update payload for admin fields (email, full_name,
 *   phone)
 * @returns The updated organization admin record with all fields
 * @throws {Error} If the admin does not exist, is soft-deleted, or the email is
 *   already taken
 */
export async function puthealthcarePlatformSystemAdminOrganizationadminsOrganizationAdminId(props: {
  systemAdmin: SystemadminPayload;
  organizationAdminId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformOrganizationAdmin.IUpdate;
}): Promise<IHealthcarePlatformOrganizationAdmin> {
  const { organizationAdminId, body } = props;

  // Step 1: Fetch admin ensuring not soft deleted
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdminId,
        deleted_at: null,
      },
    });
  if (!orgAdmin)
    throw new Error("Organization admin not found or has been deleted.");

  // Step 2: If updating email, enforce uniqueness
  if (body.email !== undefined) {
    const existing =
      await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
        where: {
          email: body.email,
          id: { not: organizationAdminId },
          deleted_at: null,
        },
      });
    if (existing)
      throw new Error("The provided email is already taken by another admin.");
  }

  // Step 3: Perform update (only allowed fields and always update updated_at)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.update({
      where: { id: organizationAdminId },
      data: {
        email: body.email ?? undefined,
        full_name: body.full_name ?? undefined,
        phone: body.phone ?? undefined,
        updated_at: now,
      },
    });

  // Step 4: Return the updated profile strictly matching DTO (no as, no Date)
  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    phone: updated.phone ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at == null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
