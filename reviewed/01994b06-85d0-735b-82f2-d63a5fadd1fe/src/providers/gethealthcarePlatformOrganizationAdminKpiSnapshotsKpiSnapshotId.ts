import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Fetch a detailed KPI snapshot by its unique ID (table:
 * healthcare_platform_kpi_snapshots) for analytics and reporting.
 *
 * This endpoint retrieves a single KPI snapshot record from the
 * healthcare_platform_kpi_snapshots table by its unique identifier. The KPI
 * snapshot includes information about a specific organizational or departmental
 * performance indicator, such as KPI name, value, label, benchmark linkage,
 * observation timestamp, calculation config, and description.
 *
 * Strict access control is enforced: only admins assigned to the organization
 * matching the KPI snapshot's organization_id may access this record.
 * Soft-deleted records (deleted_at non-null) cannot be viewed. Error feedback
 * is provided for missing or unauthorized access.
 *
 * @param props - Object containing required parameters for this operation
 * @param props.organizationAdmin - The authenticated organization admin user
 *   making the request (OrganizationadminPayload)
 * @param props.kpiSnapshotId - The unique identifier (UUID) of the KPI snapshot
 *   to retrieve
 * @returns The IHealthcarePlatformKpiSnapshot object for the requested snapshot
 * @throws {Error} If the organization assignment is not found for the admin
 * @throws {Error} If the KPI snapshot does not exist or is not active
 * @throws {Error} If the admin is not authorized to access the snapshot
 *   (organization_id mismatch)
 */
export async function gethealthcarePlatformOrganizationAdminKpiSnapshotsKpiSnapshotId(props: {
  organizationAdmin: OrganizationadminPayload;
  kpiSnapshotId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformKpiSnapshot> {
  const { organizationAdmin, kpiSnapshotId } = props;

  // 1. Lookup admin's current organization assignment (ensures user is active and assigned)
  const adminAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
        assignment_status: "active",
      },
      select: {
        healthcare_platform_organization_id: true,
      },
    });
  if (!adminAssignment) {
    throw new Error(
      "Organization admin does not have any active organization assignment",
    );
  }

  // 2. Fetch the KPI snapshot by id (and not soft-deleted)
  const snapshot =
    await MyGlobal.prisma.healthcare_platform_kpi_snapshots.findFirst({
      where: {
        id: kpiSnapshotId,
        deleted_at: null,
      },
    });
  if (!snapshot) {
    throw new Error("KPI snapshot not found");
  }

  // 3. Authorization: ensure this KPI snapshot belongs to the admin's organization
  if (
    snapshot.organization_id !==
    adminAssignment.healthcare_platform_organization_id
  ) {
    throw new Error(
      "Forbidden: KPI snapshot does not belong to your organization",
    );
  }

  // 4. Map to the DTO with correct type/nullable handling and datetime conversion
  return {
    id: snapshot.id,
    organization_id: snapshot.organization_id,
    // department_id and benchmark_id are optional+nullable
    department_id:
      typeof snapshot.department_id === "string"
        ? snapshot.department_id
        : undefined,
    benchmark_id:
      typeof snapshot.benchmark_id === "string"
        ? snapshot.benchmark_id
        : undefined,
    kpi_name: snapshot.kpi_name,
    label: snapshot.label,
    description: snapshot.description ?? undefined,
    calculation_config_json: snapshot.calculation_config_json,
    value: snapshot.value,
    recorded_at: toISOStringSafe(snapshot.recorded_at),
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    deleted_at: snapshot.deleted_at
      ? toISOStringSafe(snapshot.deleted_at)
      : undefined,
  };
}
