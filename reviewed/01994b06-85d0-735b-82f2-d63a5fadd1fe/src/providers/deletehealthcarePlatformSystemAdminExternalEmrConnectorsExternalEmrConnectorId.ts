import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently deletes an external EMR connector configuration by its unique ID.
 *
 * This operation is for highly privileged system admin use only. It
 * hard-deletes the connector from the database (not soft-deleted) and logs an
 * audit record. An error is thrown if the specified connector does not exist.
 * Deletions may impact data synchronization and operational integrity; use with
 * caution.
 *
 * @param props - Request context containing:
 *
 *   - SystemAdmin: Authenticated system admin payload
 *   - ExternalEmrConnectorId: UUID of the external EMR connector
 *
 * @returns Void
 * @throws {Error} If the connector does not exist or deletion fails
 */
export async function deletehealthcarePlatformSystemAdminExternalEmrConnectorsExternalEmrConnectorId(props: {
  systemAdmin: SystemadminPayload;
  externalEmrConnectorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, externalEmrConnectorId } = props;

  // Step 1: Confirm connector exists
  const connector =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.findUnique(
      {
        where: { id: externalEmrConnectorId },
      },
    );
  if (connector === null) {
    throw new Error("External EMR connector does not exist");
  }

  // Step 2: Hard delete the external EMR connector
  await MyGlobal.prisma.healthcare_platform_external_emr_connectors.delete({
    where: { id: externalEmrConnectorId },
  });

  // Step 3: Audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: connector.healthcare_platform_organization_id,
      action_type: "DELETE",
      event_context: "Deleted external EMR connector",
      related_entity_type: "external_emr_connector",
      related_entity_id: externalEmrConnectorId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
