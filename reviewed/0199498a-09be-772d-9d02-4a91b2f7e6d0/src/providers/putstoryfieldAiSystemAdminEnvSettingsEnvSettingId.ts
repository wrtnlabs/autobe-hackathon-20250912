import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing environment setting by its unique ID
 * (storyfield_ai_env_settings).
 *
 * This endpoint allows a system administrator to update a configuration record
 * in the environment settings table by its GUID. Only systemAdmin role is
 * permitted. At least one updatable field must be specified in the body
 * (env_key, env_value, env_name, changed_by, change_reason). The operation
 * ensures a full audit trail by always updating the updated_at timestamp and
 * rejects requests on records that are soft-deleted.
 *
 * @param props - { systemAdmin: SystemadminPayload; // The authenticated system
 *   admin user envSettingId: string & tags.Format<'uuid'>; // The environment
 *   setting's unique identifier (UUID) body: IStoryfieldAiEnvSetting.IUpdate;
 *   // The request body with fields to update (all optional, but at least one
 *   required) }
 * @returns The updated environment setting record, with all fields as required
 *   by IStoryfieldAiEnvSetting
 * @throws {Error} If the setting is not found, has been soft-deleted, or if no
 *   fields are provided for update
 */
export async function putstoryfieldAiSystemAdminEnvSettingsEnvSettingId(props: {
  systemAdmin: SystemadminPayload;
  envSettingId: string & tags.Format<"uuid">;
  body: IStoryfieldAiEnvSetting.IUpdate;
}): Promise<IStoryfieldAiEnvSetting> {
  const { systemAdmin, envSettingId, body } = props;

  // 1. Fetch the record, ensure it exists and is not soft-deleted.
  const record = await MyGlobal.prisma.storyfield_ai_env_settings.findFirst({
    where: { id: envSettingId, deleted_at: null },
  });
  if (!record)
    throw new Error("Environment setting not found or has been deleted");

  // 2. Validate that at least one updatable field is present in the body.
  const updatables = [
    "env_key",
    "env_value",
    "env_name",
    "changed_by",
    "change_reason",
  ];
  const hasAtLeastOne = updatables.some(
    (key) =>
      Object.prototype.hasOwnProperty.call(body, key) &&
      (body as Record<string, unknown>)[key] !== undefined,
  );
  if (!hasAtLeastOne)
    throw new Error(
      "At least one updatable field (env_key, env_value, env_name, changed_by, change_reason) must be specified",
    );

  // 3. Perform the update (only supply fields that are defined in the body)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.storyfield_ai_env_settings.update({
    where: { id: envSettingId },
    data: {
      ...(body.env_key !== undefined ? { env_key: body.env_key } : {}),
      ...(body.env_value !== undefined ? { env_value: body.env_value } : {}),
      ...(body.env_name !== undefined ? { env_name: body.env_name } : {}),
      ...(body.changed_by !== undefined ? { changed_by: body.changed_by } : {}),
      ...(body.change_reason !== undefined
        ? { change_reason: body.change_reason }
        : {}),
      updated_at: now,
    },
  });

  // 4. Return the updated object mapped to the API DTO, with proper date formatting.
  return {
    id: updated.id,
    env_key: updated.env_key,
    env_value: updated.env_value,
    env_name: updated.env_name,
    changed_by: updated.changed_by,
    change_reason: updated.change_reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
