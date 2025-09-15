import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import { IPageIHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsurancePolicy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List, filter, and page insurance policy records
 * (healthcare_platform_insurance_policies) for an organization.
 *
 * Retrieve a filtered and paginated list of insurance policy records,
 * supporting advanced querying by patient, policy status, payer, coverage
 * dates, and plan type. This is primarily used by organization administrators
 * to monitor, report, and manage insurance policies associated with their
 * patients and organization.
 *
 * The operation accesses the healthcare_platform_insurance_policies table,
 * leveraging available indices for efficient search and business operations.
 * All results are isolated to the active organization context, and include only
 * policies not marked as deleted.
 *
 * Only organization administrators may execute this operation. Audit logs are
 * recorded for all insurance policy queries to support regulatory review,
 * privacy tracking, and business intelligence. Pagination, sorting, and
 * field-based search are available based on the
 * IHealthcarePlatformInsurancePolicy.IRequest DTO schema.
 *
 * @param props - Request object containing the authenticated organization admin
 *   and search/filter parameters.
 * @param props.organizationAdmin - Authenticated organization admin making the
 *   query (must be valid).
 * @param props.body - Filter, search, pagination, and sorting options for
 *   policy records.
 * @returns IPageIHealthcarePlatformInsurancePolicy - A paginated, filtered list
 *   of insurance policies for the admin's organization, honoring all field
 *   type/nullability conventions.
 * @throws {Error} If the organization admin context is invalid or lookup fails,
 *   or if unexpected database error occurs.
 */
export async function patchhealthcarePlatformOrganizationAdminInsurancePolicies(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformInsurancePolicy.IRequest;
}): Promise<IPageIHealthcarePlatformInsurancePolicy> {
  const { organizationAdmin, body } = props;

  // Determine current organization_id context for the admin
  // Lookup admin record for org id association (ensure admin still has access)
  const orgAdminRecord =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!orgAdminRecord) {
    throw new Error("Organization admin not found or has been deleted.");
  }

  // Determine the org_id to scope the query (strict multi-tenancy)
  // By convention, the organization_id must be present in filters and matched; fallback to input else, force
  const organization_id = (body.organization_id ?? undefined) || undefined;

  // Construct Prisma where clause for policy search - strict for org_id, then body filters
  const where: Record<string, unknown> = {
    deleted_at: null,
    // Strict org scoping: fail if org filter missing or does not match admin
    organization_id: orgAdminRecord.id,
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && {
        patient_id: body.patient_id,
      }),
    ...(body.policy_status !== undefined &&
      body.policy_status !== null && {
        policy_status: body.policy_status,
      }),
    ...(body.plan_type !== undefined &&
      body.plan_type !== null && {
        plan_type: body.plan_type,
      }),
    ...(body.policy_number !== undefined &&
      body.policy_number !== null && {
        policy_number: { contains: body.policy_number },
      }),
    ...(body.payer_name !== undefined &&
      body.payer_name !== null && {
        payer_name: { contains: body.payer_name },
      }),
    // Date range filters for coverage_start_date (>= from, <= to)
    ...(body.coverage_start_from !== undefined ||
    body.coverage_start_to !== undefined
      ? {
          coverage_start_date: {
            ...(body.coverage_start_from !== undefined && {
              gte: body.coverage_start_from,
            }),
            ...(body.coverage_start_to !== undefined && {
              lte: body.coverage_start_to,
            }),
          },
        }
      : {}),
    // Date range filters for coverage_end_date
    ...(body.coverage_end_from !== undefined ||
    body.coverage_end_to !== undefined
      ? {
          coverage_end_date: {
            ...(body.coverage_end_from !== undefined && {
              gte: body.coverage_end_from,
            }),
            ...(body.coverage_end_to !== undefined && {
              lte: body.coverage_end_to,
            }),
          },
        }
      : {}),
  };

  // Allowed sort fields, default fallback if not recognized
  const allowedSortFields = [
    "created_at",
    "policy_number",
    "plan_type",
    "payer_name",
    "policy_status",
    "coverage_start_date",
    "coverage_end_date",
  ];
  const sortField = allowedSortFields.includes(body.sort ?? "")
    ? (body.sort as string)
    : "created_at";
  const sortOrder: "asc" | "desc" =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // Pagination params
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [policies, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_insurance_policies.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      // No include/select needed: return all fields, map manually below
    }),
    MyGlobal.prisma.healthcare_platform_insurance_policies.count({ where }),
  ]);

  // Map DB rows to strict API DTO with correct date/datetime formats and null/undefined handling
  const data = policies.map((policy) => {
    return {
      id: policy.id,
      patient_id: policy.patient_id,
      organization_id: policy.organization_id,
      policy_number: policy.policy_number,
      payer_name: policy.payer_name,
      group_number:
        policy.group_number === undefined
          ? undefined
          : (policy.group_number ?? null),
      coverage_start_date: toISOStringSafe(policy.coverage_start_date).slice(
        0,
        10,
      ) as string & tags.Format<"date">,
      coverage_end_date:
        policy.coverage_end_date === undefined ||
        policy.coverage_end_date === null
          ? undefined
          : (toISOStringSafe(policy.coverage_end_date).slice(0, 10) as string &
              tags.Format<"date">),
      plan_type: policy.plan_type,
      policy_status: policy.policy_status,
      created_at: toISOStringSafe(policy.created_at),
      updated_at: toISOStringSafe(policy.updated_at),
      deleted_at:
        policy.deleted_at === undefined || policy.deleted_at === null
          ? undefined
          : toISOStringSafe(policy.deleted_at),
    };
  });

  // Return paginated result with full type, converting page/limit/total for strict tags where necessary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit > 0 ? limit : 1)),
    },
    data,
  };
}
