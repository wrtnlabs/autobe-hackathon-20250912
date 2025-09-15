import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new external EMR connector record for interoperability (table:
 * healthcare_platform_external_emr_connectors).
 *
 * Registers a new integration connector record for a third-party EMR/EHR
 * system, scoped to the requesting organization admin. This endpoint enforces
 * unique (org_id, connector_type) and restricts creation strictly to the
 * admin's own organization. On success, returns the fully detailed EMR
 * connector configuration, including all timestamps, branded as required by API
 * contracts.
 *
 * @param props - Parameters for EMR connector creation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - Object containing organization ID, connector type/vendor,
 *   connection endpoint, and status
 * @returns IHealthcarePlatformExternalEmrConnector - The newly created external
 *   EMR connector
 * @throws {Error} When permissions, uniqueness, or input validation fails
 */
export async function posthealthcarePlatformOrganizationAdminExternalEmrConnectors(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformExternalEmrConnector.ICreate;
}): Promise<IHealthcarePlatformExternalEmrConnector> {
  const { organizationAdmin, body } = props;

  // 1. Authorization: Ensure organization admin exists and is not deleted
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!admin) {
    throw new Error("Not a valid organization admin user");
  }

  // 2. Authorization: The organization admin may only register to their own organization
  // To enforce: find admin's org assignment (user_org_assignments table) matching requested org
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new Error(
      "Permission denied: Admin cannot create connector for this organization",
    );
  }

  // 3. Uniqueness: Connector type must be unique per organization (active, i.e. not deleted)
  const existing =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.findFirst(
      {
        where: {
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id,
          connector_type: body.connector_type,
          deleted_at: null,
        },
      },
    );
  if (existing) {
    throw new Error(
      "A connector of this type already exists for this organization",
    );
  }

  // 4. Validation: connection_uri must be a non-empty string, basic URI check (starts with http or https)
  const uri = body.connection_uri;
  if (!uri || typeof uri !== "string" || uri.trim().length === 0) {
    throw new Error("connection_uri must be provided and non-empty");
  }
  if (!/^https?:\/\//.test(uri)) {
    throw new Error(
      "connection_uri must be a well-formed URI (http(s) scheme required)",
    );
  }

  // 5. Validation: connector_type and status
  if (!body.connector_type || body.connector_type.trim().length === 0) {
    throw new Error("connector_type must be non-empty");
  }
  if (!body.status || body.status.trim().length === 0) {
    throw new Error("status must be non-empty");
  }

  // 6. Insert connector; generate ID/branding and current timestamp for created/updated_at
  const now = toISOStringSafe(new Date());
  const item =
    await MyGlobal.prisma.healthcare_platform_external_emr_connectors.create({
      data: {
        id: v4(),
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        connector_type: body.connector_type,
        connection_uri: body.connection_uri,
        status: body.status,
        created_at: now,
        updated_at: now,
        last_sync_at: null,
        deleted_at: null,
      },
    });

  // 7. Return with branding and strict type
  return {
    id: item.id,
    healthcare_platform_organization_id:
      item.healthcare_platform_organization_id,
    connector_type: item.connector_type,
    connection_uri: item.connection_uri,
    status: item.status,
    // Nullable/optional fields must be assigned undefined if not set
    last_sync_at:
      item.last_sync_at === null
        ? undefined
        : toISOStringSafe(item.last_sync_at),
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at === null ? undefined : toISOStringSafe(item.deleted_at),
  };
}
