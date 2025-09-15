import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import { IPageIHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLegalHold";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list HealthcarePlatformLegalHold entities with filters and
 * pagination.
 *
 * Fetches a paginated, filtered list of legal hold entities for the
 * organization admin, supporting numerous search criteria and field-based
 * filters. Ensures strict RBAC: organization admins may only access legal holds
 * for their assigned organization.
 *
 * @param props - The properties for this operation
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   (must match legal hold organization)
 * @param props.body - Search, filter, and pagination criteria for legal hold
 *   records
 * @returns Paginated legal hold summaries, including key business fields for
 *   compliance or review.
 * @throws Error if organization_id missing or does not match admin's authority,
 *   or if pagination values are out of range
 */
export async function patchhealthcarePlatformOrganizationAdminLegalHolds(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformLegalHold.IRequest;
}): Promise<IPageIHealthcarePlatformLegalHold.ISummary> {
  const { organizationAdmin, body } = props;

  // RBAC check: organizationAdmin can only access their own org's legal holds
  // The organizationAdmin payload only includes their admin user id, not organization_id, so must determine org id by querying assignment.
  // First, find the organization for this admin user (or throw if missing)
  const adminOrg =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (!adminOrg || !adminOrg.healthcare_platform_organization_id)
    throw new Error(
      "Organization admin has no organization assignment or is deleted",
    );

  // Only allow search for the admin's assigned organization
  const requestOrgId = body.organization_id;
  if (
    typeof requestOrgId !== "string" ||
    requestOrgId !== adminOrg.healthcare_platform_organization_id
  ) {
    return {
      pagination: {
        current: 1 as number,
        limit: 10 as number,
        records: 0 as number,
        pages: 0 as number,
      },
      data: [],
    };
  }

  // Default pagination
  const page = body.page ?? (1 as number);
  const limit = body.limit ?? (20 as number);
  if (page < 1 || limit < 1 || limit > 100)
    throw new Error("Invalid pagination parameters");
  const skip = (page - 1) * limit;

  // Build where clause for Prisma (date range logic included)
  let where: Record<string, unknown> = {
    deleted_at: null,
    organization_id: requestOrgId,
  };
  if (body.department_id !== undefined && body.department_id !== null)
    where["department_id"] = body.department_id;
  if (body.subject_type !== undefined && body.subject_type !== null)
    where["subject_type"] = body.subject_type;
  if (body.subject_id !== undefined && body.subject_id !== null)
    where["subject_id"] = body.subject_id;
  if (body.status !== undefined && body.status !== null)
    where["status"] = body.status;
  if (body.reason !== undefined && body.reason !== null)
    where["reason"] = { contains: body.reason };
  if (body.method !== undefined && body.method !== null)
    where["method"] = body.method;
  // Date ranges (effective_at)
  if (
    (body.effective_at_start !== undefined &&
      body.effective_at_start !== null) ||
    (body.effective_at_end !== undefined && body.effective_at_end !== null)
  ) {
    where["effective_at"] = {
      ...(body.effective_at_start !== undefined &&
      body.effective_at_start !== null
        ? { gte: body.effective_at_start }
        : {}),
      ...(body.effective_at_end !== undefined && body.effective_at_end !== null
        ? { lte: body.effective_at_end }
        : {}),
    };
  }
  // Date ranges (release_at)
  if (
    (body.release_at_start !== undefined && body.release_at_start !== null) ||
    (body.release_at_end !== undefined && body.release_at_end !== null)
  ) {
    where["release_at"] = {
      ...(body.release_at_start !== undefined && body.release_at_start !== null
        ? { gte: body.release_at_start }
        : {}),
      ...(body.release_at_end !== undefined && body.release_at_end !== null
        ? { lte: body.release_at_end }
        : {}),
    };
  }

  // Only allow sorting by approved fields
  const allowedSortFields = ["effective_at", "release_at", "status"];
  const sortField =
    body.sort_field && allowedSortFields.includes(body.sort_field)
      ? body.sort_field
      : "effective_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Compose orderBy clause inline for prisma compatibility
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_legal_holds.findMany({
      where: where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
      select: {
        id: true,
        subject_type: true,
        status: true,
        effective_at: true,
        release_at: true,
        department_id: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_legal_holds.count({ where: where }),
  ]);

  // Map results to DTO format (with proper date branding and null/undefined handling)
  const data = rows.map((row) => {
    const r: IHealthcarePlatformLegalHold.ISummary = {
      id: row.id,
      subject_type: row.subject_type,
      status: row.status,
      effective_at: toISOStringSafe(row.effective_at),
    };
    if (row.release_at !== null && row.release_at !== undefined)
      r.release_at = toISOStringSafe(row.release_at);
    if (row.department_id !== null && row.department_id !== undefined)
      r.department_id = row.department_id;
    return r;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
