import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new external EMR connector record for interoperability (table:
 * healthcare_platform_external_emr_connectors).
 *
 * This operation registers a new external EMR/EHR integration configuration for
 * an organization, enabling secure interoperability workflows. It validates
 * required fields, organization existence, and uniqueness of [organization,
 * connector_type]. Upon creation, the full connector metadata is returned.
 *
 * Strictly enforces secure configuration policies. Accessible only to system
 * administrators. Throws errors on org not found, uniqueness violations, and
 * invalid input.
 *
 * @param props - Object containing systemAdmin credentials and EMR connector
 *   input
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.body - The external connector config to create (organization,
 *   type, URI, status)
 * @returns The created external EMR connector object
 * @throws {Error} If organization does not exist, or a connector for [org,type]
 *   already exists, or validation fails
 */
export async function posthealthcarePlatformSystemAdminExternalEmrConnectors(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformExternalEmrConnector.ICreate;
}): Promise<IHealthcarePlatformExternalEmrConnector> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  // Verify organization exists (must be active)
  const organization =
    await MyGlobal.prisma.healthcare_platform_organizations.findFirst({
      where: {
        id: props.body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });
  if (!organization) {
    throw new Error("Specified organization not found");
  }
  // Check uniqueness of connector_type for this org
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.findFirst(
      {
        where: {
          healthcare_platform_organization_id:
            props.body.healthcare_platform_organization_id,
          connector_type: props.body.connector_type,
          deleted_at: null,
        },
      },
    );
  if (duplicate) {
    throw new Error("Connector type already exists for this organization");
  }
  // Create new connector
  const created =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.create({
      data: {
        id: id,
        healthcare_platform_organization_id:
          props.body.healthcare_platform_organization_id,
        connector_type: props.body.connector_type,
        connection_uri: props.body.connection_uri,
        status: props.body.status,
        created_at: now,
        updated_at: now,
      },
    });
  // Assemble DTO result
  const result: IHealthcarePlatformExternalEmrConnector = {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    connector_type: created.connector_type,
    connection_uri: created.connection_uri,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    last_sync_at:
      created.last_sync_at !== null && created.last_sync_at !== undefined
        ? toISOStringSafe(created.last_sync_at)
        : undefined,
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
  return result;
}
