import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new environment setting record (storyfield_ai_env_settings).
 *
 * Creates a new configuration/audit record for an environment variable or
 * runtime setting in the StoryField AI platform, associated with a system
 * admin.
 *
 * Only authenticated systemAdmin roles may use this operation. Required fields
 * are set from the request body, with all audit and metadata fields generated
 * as per compliance. The returned object reflects the fully registered
 * configuration, including generated id and timestamps.
 *
 * @param props - The input properties for environment setting creation
 * @param props.systemAdmin - The authenticated systemadmin payload
 *   (authorization enforced by decorator)
 * @param props.body - The configuration payload for the environment setting to
 *   create
 * @returns The newly created environment setting record, including all audit
 *   and metadata fields
 * @throws {Error} If the unique constraint on (env_key, env_name) is violated,
 *   or if field size constraints are not met
 */
export async function poststoryfieldAiSystemAdminEnvSettings(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiEnvSetting.ICreate;
}): Promise<IStoryfieldAiEnvSetting> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.storyfield_ai_env_settings.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      env_key: props.body.env_key,
      env_value: props.body.env_value,
      env_name: props.body.env_name,
      changed_by: props.body.changed_by,
      change_reason: props.body.change_reason,
      created_at: now,
      updated_at: now,
      // deleted_at is omitted to default to null
    },
  });

  return {
    id: created.id,
    env_key: created.env_key,
    env_value: created.env_value,
    env_name: created.env_name,
    changed_by: created.changed_by,
    change_reason: created.change_reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
