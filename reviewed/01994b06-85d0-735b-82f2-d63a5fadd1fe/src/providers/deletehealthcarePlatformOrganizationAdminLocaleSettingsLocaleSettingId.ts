import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete (soft-delete) a locale setting from the
 * healthcare_platform_locale_settings table by UUID.
 *
 * This function allows an organization admin user to soft-delete a locale
 * setting entry by its unique ID. The operation will mark the record as deleted
 * by setting the deleted_at field (soft delete) rather than removing it from
 * the DB. Compliance/audit rules are enforced: Only authorized admins from the
 * corresponding organization may delete, and attempts to delete non-existent or
 * already deleted entries will throw errors.
 *
 * @param props - Input containing organizationAdmin (authenticated admin user)
 *   and the UUID of the locale setting to remove
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation
 * @param props.localeSettingId - UUID of the locale setting to be deleted
 * @returns Void
 * @throws {Error} If the locale setting does not exist, is already deleted, or
 *   does not belong to the admin's organization
 */
export async function deletehealthcarePlatformOrganizationAdminLocaleSettingsLocaleSettingId(props: {
  organizationAdmin: OrganizationadminPayload;
  localeSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, localeSettingId } = props;

  // Fetch the locale setting
  const localeSetting =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: { id: localeSettingId },
    });
  if (!localeSetting) {
    throw new Error("Locale setting not found");
  }
  if (localeSetting.deleted_at !== null) {
    throw new Error("Locale setting is already deleted");
  }

  // Fetch the organization admin's record
  const orgAdminRecord =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
    });
  if (!orgAdminRecord) {
    throw new Error("Admin record not found or has been deleted");
  }

  // Fetch the user's org assignments
  const orgAdminAssign =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
        assignment_status: "active",
      },
    });
  if (!orgAdminAssign) {
    throw new Error("Admin is not assigned to any organization");
  }
  // Check that organization matches
  if (
    localeSetting.healthcare_platform_organization_id !==
    orgAdminAssign.healthcare_platform_organization_id
  ) {
    throw new Error(
      "Forbidden: Locale setting does not belong to your organization",
    );
  }

  // Soft-delete by setting deleted_at
  await MyGlobal.prisma.healthcare_platform_locale_settings.update({
    where: { id: localeSettingId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // Optionally, audit log can be created here for compliance
}
