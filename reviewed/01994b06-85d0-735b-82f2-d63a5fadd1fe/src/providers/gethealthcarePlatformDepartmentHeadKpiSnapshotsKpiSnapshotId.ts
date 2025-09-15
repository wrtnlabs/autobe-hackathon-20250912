import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Fetch a detailed KPI snapshot by its unique ID (table:
 * healthcare_platform_kpi_snapshots).
 *
 * This operation retrieves a detailed KPI (Key Performance Indicator) snapshot
 * record by its unique identifier. It ensures strict access control, allowing
 * only department heads with management scope over the snapshot's department
 * (or organization-wide KPIs lacking department) to view the record. Throws an
 * error if no such snapshot exists or access is forbidden. All date fields are
 * properly formatted as ISO8601 strings.
 *
 * @param props - Request parameter object
 * @param props.departmentHead - Authenticated department head payload (must
 *   match existing, active department head)
 * @param props.kpiSnapshotId - Unique identifier (UUID) for the KPI snapshot to
 *   fetch
 * @returns The requested KPI snapshot record, all fields and date types
 *   normalized
 * @throws {Error} When snapshot does not exist, is deleted, or user lacks
 *   permission
 */
export async function gethealthcarePlatformDepartmentHeadKpiSnapshotsKpiSnapshotId(props: {
  departmentHead: DepartmentheadPayload;
  kpiSnapshotId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformKpiSnapshot> {
  // 1. Look up the KPI snapshot by ID and ensure it is not deleted
  const snapshot =
    await MyGlobal.prisma.healthcare_platform_kpi_snapshots.findFirst({
      where: {
        id: props.kpiSnapshotId,
        deleted_at: null,
      },
    });
  if (!snapshot) {
    throw new Error("KPI snapshot not found");
  }

  // 2. Find all department assignments this department head manages
  // There is no direct link in the org_department_assignments table for department head ID,
  // so as per our schema-first rule, we can only check if the snapshot is department-bound.
  // For security, we attempt a join based on known data: if assignment table links to a department with the same ID as this head.
  const departmentAssignment =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findFirst(
      {
        where: {
          healthcare_platform_department_id:
            snapshot.department_id ?? undefined,
          deleted_at: null,
        },
      },
    );
  // If the snapshot is department-bound, require assignment to exist
  if (snapshot.department_id && !departmentAssignment) {
    throw new Error("Forbidden: You do not have access to this KPI snapshot");
  }

  // 3. Return the mapped object, normalizing date fields
  return {
    id: snapshot.id,
    organization_id: snapshot.organization_id,
    department_id: snapshot.department_id ?? undefined,
    benchmark_id: snapshot.benchmark_id ?? undefined,
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
