import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch detailed information for a specific system setting
 * (ats_recruitment_system_settings).
 *
 * Retrieves the full configuration record for the given systemSettingId,
 * including name, type, value, description, and audit dates. Ensures only
 * active (not soft-deleted) settings are retrievable. Only accessible by
 * authenticated system administrators. Throws error if not found or deleted.
 *
 * @param props - Input properties
 * @param props.systemAdmin - Authenticated system administrator payload
 *   (authorization enforced by decorator)
 * @param props.systemSettingId - UUID of the system setting to retrieve
 * @returns {IAtsRecruitmentSystemSetting} Complete system setting detail object
 * @throws {Error} When system setting is not found or is soft deleted
 */
export async function getatsRecruitmentSystemAdminSystemSettingsSystemSettingId(props: {
  systemAdmin: SystemadminPayload;
  systemSettingId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentSystemSetting> {
  const { systemSettingId } = props;

  // Only active (not deleted) settings are viewable
  const setting =
    await MyGlobal.prisma.ats_recruitment_system_settings.findFirst({
      where: {
        id: systemSettingId,
        deleted_at: null,
      },
    });
  if (!setting) throw new Error("System setting not found");

  return {
    id: setting.id,
    setting_name: setting.setting_name,
    setting_value: setting.setting_value,
    setting_type: setting.setting_type,
    description: setting.description ?? undefined,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
    deleted_at: setting.deleted_at
      ? toISOStringSafe(setting.deleted_at)
      : undefined,
  };
}
