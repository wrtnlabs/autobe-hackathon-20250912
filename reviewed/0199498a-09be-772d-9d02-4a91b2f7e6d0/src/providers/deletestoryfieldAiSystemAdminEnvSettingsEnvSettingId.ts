import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently remove a specific environment setting by unique ID
 * (storyfield_ai_env_settings).
 *
 * This operation irreversibly deletes an environment setting from the
 * configuration registry using its unique envSettingId. Removal is intended
 * only for settings that are no longer required, are unsafe to retain (such as
 * expired API keys), or were added in error. Unlike soft deletes, this
 * operation physically removes the record, making restoration impossible once
 * completed.
 *
 * Strict access is enforced: only users with systemAdmin role may invoke this
 * endpoint, and every execution must be auditable. Deletion of critical
 * environment variables should be accompanied by additional policy review to
 * prevent accidental or malicious service impact.
 *
 * Audit logs must record the administrator, time, and contextual justification
 * for each action, ensuring support for post-incident analysis and compliance
 * reviews. This operation does not return a response body on success.
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: Authenticated SystemadminPayload (authorization enforced)
 *   - EnvSettingId: Unique identifier of the environment setting to permanently
 *       remove
 *
 * @returns Void - No content is returned on success
 * @throws {Error} If the environment setting does not exist
 */
export async function deletestoryfieldAiSystemAdminEnvSettingsEnvSettingId(props: {
  systemAdmin: SystemadminPayload;
  envSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { envSettingId } = props;
  const setting = await MyGlobal.prisma.storyfield_ai_env_settings.findUnique({
    where: { id: envSettingId },
  });
  if (!setting) {
    throw new Error("Environment setting not found");
  }
  await MyGlobal.prisma.storyfield_ai_env_settings.delete({
    where: { id: envSettingId },
  });
}
