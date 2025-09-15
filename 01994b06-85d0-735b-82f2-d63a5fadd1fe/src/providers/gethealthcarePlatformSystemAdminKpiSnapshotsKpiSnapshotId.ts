import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch a detailed KPI snapshot by its unique ID (table:
 * healthcare_platform_kpi_snapshots) for analytics and reporting.
 *
 * This operation retrieves a specific KPI (Key Performance Indicator) snapshot
 * by its unique identifier for analytics dashboards and compliance reporting.
 * Returns detailed information regarding a single KPI snapshot, including
 * value, label, computation details, reference benchmarks, and time context.
 * Only system administrators may access this operation. Throws error if the KPI
 * snapshot does not exist or is deleted.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated system administrator requesting
 *   access
 * @param props.kpiSnapshotId - Unique identifier (UUID) of the KPI snapshot to
 *   fetch
 * @returns The full detail of the KPI snapshot record
 *   (IHealthcarePlatformKpiSnapshot)
 * @throws {Error} If the KPI snapshot was not found, deleted, or access is
 *   denied
 */
export async function gethealthcarePlatformSystemAdminKpiSnapshotsKpiSnapshotId(props: {
  systemAdmin: SystemadminPayload;
  kpiSnapshotId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformKpiSnapshot> {
  const { kpiSnapshotId } = props;
  const snapshot =
    await MyGlobal.prisma.healthcare_platform_kpi_snapshots.findUnique({
      where: { id: kpiSnapshotId, deleted_at: null },
      select: {
        id: true,
        organization_id: true,
        department_id: true,
        benchmark_id: true,
        kpi_name: true,
        label: true,
        description: true,
        calculation_config_json: true,
        value: true,
        recorded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!snapshot) throw new Error("KPI snapshot not found");
  return {
    id: snapshot.id,
    organization_id: snapshot.organization_id,
    department_id:
      snapshot.department_id === null ? undefined : snapshot.department_id,
    benchmark_id:
      snapshot.benchmark_id === null ? undefined : snapshot.benchmark_id,
    kpi_name: snapshot.kpi_name,
    label: snapshot.label,
    description:
      snapshot.description === null ? undefined : snapshot.description,
    calculation_config_json: snapshot.calculation_config_json,
    value: snapshot.value,
    recorded_at: toISOStringSafe(snapshot.recorded_at),
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    deleted_at:
      snapshot.deleted_at === null
        ? undefined
        : toISOStringSafe(snapshot.deleted_at),
  };
}
