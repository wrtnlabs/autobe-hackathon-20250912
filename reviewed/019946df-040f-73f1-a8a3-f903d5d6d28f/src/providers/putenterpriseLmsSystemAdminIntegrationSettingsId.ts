import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsIntegrationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an integration setting by ID.
 *
 * This endpoint allows a system administrator to modify an existing integration
 * setting configuration by specifying its unique identifier. The updating can
 * include toggling enablement, changing integration names, and updating
 * configuration keys and values.
 *
 * @param props - Object containing the systemAdmin authentication, the
 *   integration setting ID, and the update body with optional fields.
 * @returns The updated integration setting record reflecting all changes.
 * @throws {Error} Throws an error if the specified integration setting ID does
 *   not exist in the database.
 */
export async function putenterpriseLmsSystemAdminIntegrationSettingsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsIntegrationSettings.IUpdate;
}): Promise<IEnterpriseLmsIntegrationSettings> {
  const { systemAdmin, id, body } = props;

  // Verify the integration setting exists
  const existing =
    await MyGlobal.prisma.enterprise_lms_integration_settings.findUnique({
      where: { id },
    });

  if (!existing) {
    throw new Error("Integration setting not found");
  }

  // Perform the update
  const updated =
    await MyGlobal.prisma.enterprise_lms_integration_settings.update({
      where: { id },
      data: {
        integration_name: body.integration_name ?? undefined,
        config_key: body.config_key ?? undefined,
        config_value:
          body.config_value === null ? null : (body.config_value ?? undefined),
        enabled: body.enabled ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return the updated record
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    integration_name: updated.integration_name,
    config_key: updated.config_key,
    config_value: updated.config_value ?? null,
    enabled: updated.enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
