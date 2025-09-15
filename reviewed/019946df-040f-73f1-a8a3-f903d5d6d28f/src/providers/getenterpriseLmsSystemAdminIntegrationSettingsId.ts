import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsIntegrationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific integration setting by ID
 *
 * This operation retrieves detailed information about an integration setting
 * identified by its unique ID for system admin users.
 *
 * Access is restricted to authorized system admins only.
 *
 * @param props - Object containing the authenticated system admin payload and
 *   the integration setting id.
 * @param props.systemAdmin - Authenticated system admin making the request.
 * @param props.id - UUID of the integration setting to retrieve.
 * @returns The integration setting record matching the ID.
 * @throws {Error} When the integration setting with the given ID does not
 *   exist.
 */
export async function getenterpriseLmsSystemAdminIntegrationSettingsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsIntegrationSettings> {
  const setting =
    await MyGlobal.prisma.enterprise_lms_integration_settings.findUniqueOrThrow(
      {
        where: { id: props.id },
      },
    );

  return {
    id: setting.id,
    tenant_id: setting.tenant_id,
    integration_name: setting.integration_name,
    config_key: setting.config_key,
    config_value: setting.config_value ?? null,
    enabled: setting.enabled,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  };
}
