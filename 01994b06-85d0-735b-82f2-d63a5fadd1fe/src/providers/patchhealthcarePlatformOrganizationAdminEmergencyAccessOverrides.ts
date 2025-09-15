import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEmergencyAccessOverride";
import { IPageIHealthcarePlatformEmergencyAccessOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEmergencyAccessOverride";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Searches and retrieves a filtered, paginated list of emergency access
 * override records for compliance and audit review.
 *
 * This operation enables compliance, legal, and security staff to search all
 * 'break-the-glass' (emergency override) audit events in their organization.
 * The search supports extensive filtering by override scope, reason, time
 * window, review status, and user. Results are strictly limited to the
 * administrator's own organization. Full pagination, date handling, and
 * sort-supported. No Date type or type assertions are used, and all field
 * mapping is functional and immutable.
 *
 * @param props - Properties including authenticated organization admin and
 *   request body
 * @returns Paginated page of matching emergency override records with full
 *   audit fields
 * @throws {Error} If organization admin is unassigned from any organization
 */
export async function patchhealthcarePlatformOrganizationAdminEmergencyAccessOverrides(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformEmergencyAccessOverride.IRequest;
}): Promise<IPageIHealthcarePlatformEmergencyAccessOverride> {
  const { organizationAdmin, body } = props;
  const adminOrgResult =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { user_id: organizationAdmin.id, deleted_at: null },
      select: { healthcare_platform_organization_id: true },
    });
  if (!adminOrgResult)
    throw new Error(
      "Organization admin is not currently assigned to any organization.",
    );
  const organization_id = adminOrgResult.healthcare_platform_organization_id;
  const allowedSort = [
    "override_start_at",
    "override_end_at",
    "reason",
    "override_scope",
    "reviewed_by_user_id",
    "reviewed_at",
    "created_at",
  ];
  const sort_by =
    body.sort_by && allowedSort.includes(body.sort_by)
      ? body.sort_by
      : "override_start_at";
  const sort_order =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";
  const page = Number(body.page ?? 1);
  const page_size = Number(body.page_size ?? 20);
  const skip = (page - 1) * page_size;
  const where = {
    organization_id,
    ...(body.user_id !== undefined && { user_id: body.user_id }),
    ...(body.reviewed_by_user_id !== undefined && {
      reviewed_by_user_id: body.reviewed_by_user_id,
    }),
    ...(body.reason !== undefined && { reason: { contains: body.reason } }),
    ...(body.override_scope !== undefined && {
      override_scope: { contains: body.override_scope },
    }),
    ...((body.override_start_at_from !== undefined ||
      body.override_start_at_to !== undefined) && {
      override_start_at: {
        ...(body.override_start_at_from !== undefined && {
          gte: body.override_start_at_from,
        }),
        ...(body.override_start_at_to !== undefined && {
          lte: body.override_start_at_to,
        }),
      },
    }),
    ...((body.override_end_at_from !== undefined ||
      body.override_end_at_to !== undefined) && {
      override_end_at: {
        ...(body.override_end_at_from !== undefined && {
          gte: body.override_end_at_from,
        }),
        ...(body.override_end_at_to !== undefined && {
          lte: body.override_end_at_to,
        }),
      },
    }),
    ...((body.reviewed_at_from !== undefined ||
      body.reviewed_at_to !== undefined) && {
      reviewed_at: {
        ...(body.reviewed_at_from !== undefined && {
          gte: body.reviewed_at_from,
        }),
        ...(body.reviewed_at_to !== undefined && { lte: body.reviewed_at_to }),
      },
    }),
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_emergency_access_overrides.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: page_size,
    }),
    MyGlobal.prisma.healthcare_platform_emergency_access_overrides.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: page_size,
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data: records.map((record) => {
      const result: IHealthcarePlatformEmergencyAccessOverride = {
        id: record.id,
        user_id: record.user_id,
        organization_id: record.organization_id,
        reason: record.reason,
        override_scope: record.override_scope,
        override_start_at: toISOStringSafe(record.override_start_at),
        override_end_at: record.override_end_at
          ? toISOStringSafe(record.override_end_at)
          : null,
        created_at: toISOStringSafe(record.created_at),
      };
      if (
        record.reviewed_by_user_id !== undefined &&
        record.reviewed_by_user_id !== null
      ) {
        result.reviewed_by_user_id = record.reviewed_by_user_id;
      }
      if (record.reviewed_at !== undefined && record.reviewed_at !== null) {
        result.reviewed_at = toISOStringSafe(record.reviewed_at);
      }
      return result;
    }),
  };
}
