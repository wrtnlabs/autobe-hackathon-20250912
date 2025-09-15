import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete (soft-delete) a locale setting from the
 * healthcare_platform_locale_settings table by UUID.
 *
 * This function marks the locale setting as deleted using the `deleted_at`
 * field, supporting compliance and data retention requirements. Only locale
 * settings that are currently active (not already deleted) can be marked as
 * deleted. If the setting does not exist or has already been deleted, a
 * not-found error is thrown. Attempts to delete protected/default settings are
 * not enforced here since the schema lacks required/default flags. Deletion
 * events should be audit-logged externally.
 *
 * @param props - The parameters required for the operation.
 * @param props.systemAdmin - Authenticated SystemadminPayload (for
 *   authorization context)
 * @param props.localeSettingId - The UUID of the locale setting to delete
 *   (soft-delete)
 * @returns Void
 * @throws {Error} If the locale setting is not found or already deleted.
 */
export async function deletehealthcarePlatformSystemAdminLocaleSettingsLocaleSettingId(props: {
  systemAdmin: SystemadminPayload;
  localeSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, localeSettingId } = props;

  // 1. Only systemAdmin is authorized (payload presence suffices; deeper auth checked by decorator/middleware)

  // 2. Find the locale setting by UUID, only if not already deleted
  const locale =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: {
        id: localeSettingId,
        deleted_at: null,
      },
    });
  if (locale === null) {
    throw new Error("Locale setting not found or already deleted");
  }

  // 3. Mark as soft-deleted (deleted_at = now)
  await MyGlobal.prisma.healthcare_platform_locale_settings.update({
    where: { id: localeSettingId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Return void (nothing)
}
