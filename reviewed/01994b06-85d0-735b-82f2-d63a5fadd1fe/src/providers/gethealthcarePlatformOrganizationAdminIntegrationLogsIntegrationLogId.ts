import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformIntegrationLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve full detail for a specific integration log event by ID.
 *
 * This function allows an authenticated organization admin to access full
 * technical and business event data for a single integration log. It ensures
 * that only admins of the relevant organization may view the entry, enforcing
 * strict tenant isolation and security. All timestamps are converted to ISO8601
 * string format; optional properties are mapped according to the DTO contract.
 *
 * @param props - Properties including authenticated OrganizationadminPayload
 *   and the integration log ID to retrieve.
 * @param props.organizationAdmin - Authenticated admin payload (must be active
 *   and have an associated org assignment).
 * @param props.integrationLogId - The unique identifier for the integration log
 *   (UUID).
 * @returns Full IHealthcarePlatformIntegrationLog detail for the log event.
 * @throws {Error} If admin is not assigned to an organization, inactive, or if
 *   the log is not found for that org. Also throws if cross-tenant or deleted
 *   log is queried.
 */
export async function gethealthcarePlatformOrganizationAdminIntegrationLogsIntegrationLogId(props: {
  organizationAdmin: OrganizationadminPayload;
  integrationLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformIntegrationLog> {
  const { organizationAdmin, integrationLogId } = props;

  // 1. Fetch the admin's active org assignment to determine allowed org scope.
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
        assignment_status: "active",
      },
    });
  if (!orgAssignment)
    throw new Error("No active organization assignment found for this admin.");

  // 2. Query the integration log scoped to the admin's organization.
  const log =
    await MyGlobal.prisma.healthcare_platform_integration_logs.findFirst({
      where: {
        id: integrationLogId,
        healthcare_platform_organization_id:
          orgAssignment.healthcare_platform_organization_id,
      },
    });
  if (!log)
    throw new Error(
      "Integration log not found or not accessible for this organization.",
    );

  // 3. Map Prisma (Date fields) to API contract, converting all Date -> ISO8601 strings
  return {
    id: log.id,
    healthcare_platform_organization_id:
      log.healthcare_platform_organization_id,
    integration_type: log.integration_type,
    referenced_transaction_id: log.referenced_transaction_id ?? undefined,
    event_status: log.event_status,
    event_code: log.event_code,
    event_message: log.event_message ?? undefined,
    occurred_at: toISOStringSafe(log.occurred_at),
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
  };
}
