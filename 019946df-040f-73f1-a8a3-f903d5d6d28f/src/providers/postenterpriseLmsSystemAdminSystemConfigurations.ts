import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfiguration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new system configuration setting.
 *
 * This operation creates a unique system configuration record in the
 * enterprise_lms_system_configurations table, recording platform-wide settings
 * such as feature flags and integration toggles. Only users with systemAdmin
 * role are authorized to perform this operation.
 *
 * @param props - The systemAdmin authentication payload and create request
 *   body.
 * @param props.systemAdmin - The authorized systemAdmin payload.
 * @param props.body - The system configuration creation payload containing key,
 *   value, and optional description.
 * @returns The newly created system configuration record with timestamps.
 * @throws {Error} Throws if creation fails due to duplicate key or database
 *   error.
 */
export async function postenterpriseLmsSystemAdminSystemConfigurations(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSystemConfiguration.ICreate;
}): Promise<IEnterpriseLmsSystemConfiguration> {
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.enterprise_lms_system_configurations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        key: props.body.key,
        value: props.body.value,
        description: props.body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    key: created.key,
    value: created.value,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
