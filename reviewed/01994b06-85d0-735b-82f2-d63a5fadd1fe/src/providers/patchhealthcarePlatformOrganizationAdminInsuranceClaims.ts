import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import { IPageIHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceClaim";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated, filtered list of insurance claim records
 * from healthcare_platform_insurance_claims.
 *
 * Retrieves a filtered and paginated list of insurance claim records from the
 * system for authorized organization admins. Supports advanced search by claim
 * status, insurance policy, invoice number, service date range, payer response
 * status, and organization scope. Only insurance claims assigned to the admin's
 * organization can be searched.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin user
 *   making the request
 * @param props.body - Filtering and pagination criteria for insurance claims
 *   search
 * @returns Paginated results containing insurance claim summaries matching
 *   search criteria
 * @throws {Error} If the user attempts to search claims outside their
 *   organization or passes invalid filters
 */
export async function patchhealthcarePlatformOrganizationAdminInsuranceClaims(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformInsuranceClaim.IRequest;
}): Promise<IPageIHealthcarePlatformInsuranceClaim.ISummary> {
  const { organizationAdmin, body } = props;

  // Step 1: Discover all insurance_policy_ids for this org
  const policies =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findMany({
      where: { organization_id: organizationAdmin.id },
      select: { id: true },
    });
  const orgPolicyIds = policies.map((p) => p.id);

  // Step 2: Build where filter using only allowed fields, ensure only org's policy claims are visible
  const where = {
    deleted_at: null,
    // If insurance_policy_id provided, must be among allowed policies
    ...(body.insurance_policy_id !== undefined &&
    body.insurance_policy_id !== null
      ? orgPolicyIds.includes(body.insurance_policy_id)
        ? { insurance_policy_id: body.insurance_policy_id }
        : { insurance_policy_id: "__prohibit__match__" } // blocks non-org scope
      : { insurance_policy_id: { in: orgPolicyIds } }),
    ...(body.invoice_id !== undefined && body.invoice_id !== null
      ? { invoice_id: body.invoice_id }
      : {}),
    ...(body.claim_number !== undefined && body.claim_number !== null
      ? { claim_number: body.claim_number }
      : {}),
    ...(body.submission_status !== undefined && body.submission_status !== null
      ? { submission_status: body.submission_status }
      : {}),
    ...(body.last_payer_response_code !== undefined &&
    body.last_payer_response_code !== null
      ? { last_payer_response_code: body.last_payer_response_code }
      : {}),
    ...(body.last_payer_response_description !== undefined &&
    body.last_payer_response_description !== null
      ? {
          last_payer_response_description: body.last_payer_response_description,
        }
      : {}),
    ...((body.service_start_date_from !== undefined &&
      body.service_start_date_from !== null) ||
    (body.service_start_date_to !== undefined &&
      body.service_start_date_to !== null)
      ? {
          service_start_date: {
            ...(body.service_start_date_from !== undefined &&
            body.service_start_date_from !== null
              ? { gte: body.service_start_date_from }
              : {}),
            ...(body.service_start_date_to !== undefined &&
            body.service_start_date_to !== null
              ? { lte: body.service_start_date_to }
              : {}),
          },
        }
      : {}),
    ...((body.service_end_date_from !== undefined &&
      body.service_end_date_from !== null) ||
    (body.service_end_date_to !== undefined &&
      body.service_end_date_to !== null)
      ? {
          service_end_date: {
            ...(body.service_end_date_from !== undefined &&
            body.service_end_date_from !== null
              ? { gte: body.service_end_date_from }
              : {}),
            ...(body.service_end_date_to !== undefined &&
            body.service_end_date_to !== null
              ? { lte: body.service_end_date_to }
              : {}),
          },
        }
      : {}),
  };

  // Step 3: Determine sort field and direction -- only allow known safe fields
  const allowedOrderFields = [
    "created_at",
    "service_start_date",
    "claim_number",
    "submission_status",
    "total_claimed_amount",
    "invoice_id",
    "insurance_policy_id",
  ];
  const orderByField =
    body.order_by !== undefined &&
    body.order_by !== null &&
    allowedOrderFields.includes(body.order_by)
      ? body.order_by
      : "created_at";
  const orderDirection = body.order_direction === "asc" ? "asc" : "desc";

  // Step 4: Pagination
  const page = body.page !== undefined && body.page !== null ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Step 5: Parallel fetch data & total
  const [claims, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_insurance_claims.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: Number(limit),
      select: {
        id: true,
        invoice_id: true,
        insurance_policy_id: true,
        claim_number: true,
        submission_status: true,
        total_claimed_amount: true,
        service_start_date: true,
        service_end_date: true,
        last_payer_response_code: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_insurance_claims.count({ where }),
  ]);

  // Step 6: Format for output spec. Ensure dates to ISO string.
  const summaryList = claims.map((claim) => {
    const summary: IHealthcarePlatformInsuranceClaim.ISummary = {
      id: claim.id,
      invoice_id: claim.invoice_id,
      insurance_policy_id: claim.insurance_policy_id,
      claim_number: claim.claim_number,
      submission_status: claim.submission_status,
      total_claimed_amount: claim.total_claimed_amount,
      service_start_date: toISOStringSafe(claim.service_start_date),
    };
    if (
      claim.service_end_date !== undefined &&
      claim.service_end_date !== null
    ) {
      summary.service_end_date = toISOStringSafe(claim.service_end_date);
    } else {
      summary.service_end_date = null;
    }
    if (
      claim.last_payer_response_code !== undefined &&
      claim.last_payer_response_code !== null
    ) {
      summary.last_payer_response_code = claim.last_payer_response_code;
    }
    return summary;
  });

  // Pagination
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / Number(limit)),
  };

  return {
    pagination,
    data: summaryList,
  };
}
