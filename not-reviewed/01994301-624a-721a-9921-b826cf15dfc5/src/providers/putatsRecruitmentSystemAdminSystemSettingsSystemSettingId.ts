import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing system configuration setting
 * (ats_recruitment_system_settings).
 *
 * This operation updates the value, type, or documentation (description) of a
 * platform-level configuration setting. Only system administrators can perform
 * this action. The setting is identified via its immutable unique ID;
 * setting_name is immutable and cannot be updated once created. All change
 * events are auditable.
 *
 * Attempting to update a non-existent or soft-deleted setting will result in an
 * error. If the update payload lacks any updatable fields, an error is thrown.
 * Only setting_value, setting_type, description can be updated (never id or
 * setting_name).
 *
 * @param props - Object containing required parameters
 * @param props.systemAdmin - The authenticated system administrator
 *   (SystemadminPayload) executing the update
 * @param props.systemSettingId - The unique ID (uuid) of the setting to update
 * @param props.body - Update payload (may contain: setting_value, setting_type,
 *   description)
 * @returns The updated system setting with all fields normalized and date
 *   fields as branded ISO strings
 * @throws {Error} If the setting does not exist, is deleted, or no updatable
 *   fields are provided
 */
export async function putatsRecruitmentSystemAdminSystemSettingsSystemSettingId(props: {
  systemAdmin: SystemadminPayload;
  systemSettingId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentSystemSetting.IUpdate;
}): Promise<IAtsRecruitmentSystemSetting> {
  // Authorization by systemAdmin presence (enforced externally)
  const { systemAdmin, systemSettingId, body } = props;
  // Step 1: Load active setting
  const setting =
    await MyGlobal.prisma.ats_recruitment_system_settings.findFirst({
      where: {
        id: systemSettingId,
        deleted_at: null,
      },
    });
  if (!setting) {
    throw new Error("System setting not found or has been deleted.");
  }
  // Step 2: Ensure body has at least one updatable field
  const updateKeys = [
    typeof body.setting_value !== "undefined",
    typeof body.setting_type !== "undefined",
    typeof body.description !== "undefined",
  ];
  if (!updateKeys.some(Boolean)) {
    throw new Error("No updatable fields provided.");
  }

  // Step 3: Build update object
  const updateFields: {
    setting_value?: string;
    setting_type?: string;
    description?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(typeof body.setting_value !== "undefined"
      ? { setting_value: body.setting_value }
      : {}),
    ...(typeof body.setting_type !== "undefined"
      ? { setting_type: body.setting_type }
      : {}),
    ...(typeof body.description !== "undefined"
      ? { description: body.description }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // Step 4: Perform update
  const updated = await MyGlobal.prisma.ats_recruitment_system_settings.update({
    where: { id: systemSettingId },
    data: updateFields,
  });

  // Step 5: Return normalized DTO
  return {
    id: updated.id,
    setting_name: updated.setting_name,
    setting_value: updated.setting_value,
    setting_type: updated.setting_type,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
