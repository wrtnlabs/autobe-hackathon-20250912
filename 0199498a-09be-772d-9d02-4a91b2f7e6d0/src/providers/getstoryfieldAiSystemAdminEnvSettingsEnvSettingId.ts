import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific environment setting by its unique ID
 * (storyfield_ai_env_settings).
 *
 * This function allows a system administrator to fetch full details for a
 * single environment setting by its unique identifier. Only active
 * (non-soft-deleted) settings are accessible. Returned information includes all
 * key fields, configuration metadata, and audit trails for compliance. If the
 * record is not found or is soft-deleted, an error is thrown.
 *
 * @param props - The function parameter object
 * @param props.systemAdmin - The authenticated system administrator payload
 *   (authorization required)
 * @param props.envSettingId - The unique identifier of the environment setting
 *   to retrieve (UUID)
 * @returns The full environment setting record with all audit and configuration
 *   fields populated.
 * @throws {Error} If the environment setting does not exist or has been soft
 *   deleted.
 */
export async function getstoryfieldAiSystemAdminEnvSettingsEnvSettingId(props: {
  systemAdmin: SystemadminPayload;
  envSettingId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiEnvSetting> {
  const { envSettingId } = props;

  const envSetting = await MyGlobal.prisma.storyfield_ai_env_settings.findFirst(
    {
      where: {
        id: envSettingId,
        deleted_at: null,
      },
    },
  );

  if (!envSetting) {
    throw new Error("Environment setting not found");
  }

  return {
    id: envSetting.id,
    env_key: envSetting.env_key,
    env_value: envSetting.env_value,
    env_name: envSetting.env_name,
    changed_by: envSetting.changed_by,
    change_reason: envSetting.change_reason,
    created_at: toISOStringSafe(envSetting.created_at),
    updated_at: toISOStringSafe(envSetting.updated_at),
    deleted_at: null,
  };
}
