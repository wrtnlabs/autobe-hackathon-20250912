import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

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
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin user
 *   (OrganizationadminPayload)
 * @param props.organizationAdminId - The unique identifier (UUID) of the
 *   organization administrator to update
 * @param props.body - Payload containing updatable fields for the organization
 *   admin, such as full_name, email, phone
 * @returns The updated organization admin record with all fields present in the
 *   schema
 * @throws {Error} When attempting to update another admin's profile
 * @throws {Error} When the record does not exist or is soft-deleted
 * @throws {Error} When the email is not unique across active administrators
 */
export async function puthealthcarePlatformOrganizationAdminOrganizationadminsOrganizationAdminId(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationAdminId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformOrganizationAdmin.IUpdate;
}): Promise<IHealthcarePlatformOrganizationAdmin> {
  const { organizationAdmin, organizationAdminId, body } = props;

  // Only allow self-update
  if (organizationAdmin.id !== organizationAdminId) {
    throw new Error("Forbidden: cannot update another admin's profile");
  }

  // Fetch the admin by ID, ensure not soft-deleted
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdminId, deleted_at: null },
    });

  if (!admin) {
    throw new Error("Organization admin not found");
  }

  // If updating email, validate uniqueness
  if (body.email && body.email !== admin.email) {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
        where: {
          email: body.email,
          id: { not: organizationAdminId },
          deleted_at: null,
        },
      });
    if (duplicate) {
      throw new Error("Email must be unique");
    }
  }

  // Perform the update with only permitted fields
  const updated =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.update({
      where: { id: organizationAdminId },
      data: {
        email: body.email ?? undefined,
        full_name: body.full_name ?? undefined,
        phone: body.phone ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    phone: updated.phone ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
