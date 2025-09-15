import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsIntegrationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new integration setting record in the Enterprise LMS.
 *
 * This operation creates a new integration setting within the Enterprise LMS
 * system, storing configuration details such as API keys, service endpoints,
 * and enablement flags.
 *
 * Authorization: Only users with systemAdmin role can perform this operation.
 *
 * @param props - Object containing systemAdmin user info and integration
 *   setting creation data
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.body - Integration setting data to create
 * @returns The created integration setting entity with all fields populated
 * @throws {Error} Throws if the creation fails due to constraint violation or
 *   other database errors
 */
export async function postenterpriseLmsSystemAdminIntegrationSettings(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsIntegrationSettings.ICreate;
}): Promise<IEnterpriseLmsIntegrationSettings> {
  const { systemAdmin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.enterprise_lms_integration_settings.create({
      data: {
        id,
        tenant_id: body.tenant_id,
        integration_name: body.integration_name,
        config_key: body.config_key,
        config_value: body.config_value ?? null,
        enabled: body.enabled,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    integration_name: created.integration_name,
    config_key: created.config_key,
    config_value: created.config_value ?? null,
    enabled: created.enabled,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
