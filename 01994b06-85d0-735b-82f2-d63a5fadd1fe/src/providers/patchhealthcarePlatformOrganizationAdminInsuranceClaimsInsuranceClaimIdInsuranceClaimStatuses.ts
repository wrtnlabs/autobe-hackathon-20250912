import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import { IPageIHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceClaimStatus";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List, search, and paginate insurance claim status history for a given
 * insurance claim.
 *
 * Retrieves a paginated list of insurance claim status entries, supporting
 * advanced filtering, sorting, and pagination via the request body. The
 * insuranceClaimId parameter scopes the result set, and only statuses for the
 * specified parent claim are returned. This operation is accessible only to
 * authorized organization admins.
 *
 * Pagination and filtering follows the
 * IHealthcarePlatformInsuranceClaimStatus.IRequest structure. If no results are
 * present for the given claimId, an error is thrown. The response contains a
 * paginated list of histories.
 *
 * @param props - Parameters containing the organization administrator payload,
 *   target insurance claim id, and body request
 * @param props.organizationAdmin - Authenticated organization administrator's
 *   JWT-injected payload
 * @param props.insuranceClaimId - UUID of the parent insurance claim being
 *   queried
 * @param props.body - Search criteria, filter, sorting, and pagination options
 * @returns A paginated, filtered list of insurance claim status entries for the
 *   given claim
 * @throws {Error} When insurance claim does not exist or user is unauthorized
 *   to access the claim
 */
export async function patchhealthcarePlatformOrganizationAdminInsuranceClaimsInsuranceClaimIdInsuranceClaimStatuses(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceClaimStatus.IRequest;
}): Promise<IPageIHealthcarePlatformInsuranceClaimStatus> {
  const { insuranceClaimId, body } = props;

  // 1. Defensive: Check parent claim existence (throws if not found)
  const parentClaim =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.findFirst({
      where: { id: insuranceClaimId },
      select: { id: true },
    });
  if (parentClaim === null) throw new Error("Insurance claim not found");

  // 2. Paging
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build WHERE: Only fields that exist in schema
  const where = {
    claim_id: insuranceClaimId,
    ...(body.status_code !== undefined &&
      body.status_code !== null && { status_code: body.status_code }),
    ...(body.updated_by_id !== undefined &&
      body.updated_by_id !== null && { updated_by_id: body.updated_by_id }),
    ...((body.status_timestamp_from !== undefined &&
      body.status_timestamp_from !== null) ||
    (body.status_timestamp_to !== undefined &&
      body.status_timestamp_to !== null)
      ? {
          status_timestamp: {
            ...(body.status_timestamp_from !== undefined &&
              body.status_timestamp_from !== null && {
                gte: body.status_timestamp_from,
              }),
            ...(body.status_timestamp_to !== undefined &&
              body.status_timestamp_to !== null && {
                lte: body.status_timestamp_to,
              }),
          },
        }
      : {}),
    ...((body.payment_amount_min !== undefined &&
      body.payment_amount_min !== null) ||
    (body.payment_amount_max !== undefined && body.payment_amount_max !== null)
      ? {
          payment_amount: {
            ...(body.payment_amount_min !== undefined &&
              body.payment_amount_min !== null && {
                gte: body.payment_amount_min,
              }),
            ...(body.payment_amount_max !== undefined &&
              body.payment_amount_max !== null && {
                lte: body.payment_amount_max,
              }),
          },
        }
      : {}),
  };

  // 4. orderBy: Only allow valid fields for sorting
  const allowedSortFields = [
    "status_timestamp",
    "status_code",
    "payment_amount",
    "created_at",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { status_timestamp: "desc" };
  if (body.sort_by && allowedSortFields.includes(body.sort_by)) {
    orderBy = {
      [body.sort_by]: body.sort_direction === "asc" ? "asc" : "desc",
    };
  }

  // 5. Query rows and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.count({
      where,
    }),
  ]);

  // 6. Transform rows: branding and type normalization without 'as' or 'Date'.
  const data: IHealthcarePlatformInsuranceClaimStatus[] = rows.map((row) => {
    return {
      id: row.id,
      claim_id: row.claim_id,
      // updated_by_id is optional in DTO; map null to undefined if present
      ...(row.updated_by_id !== null
        ? { updated_by_id: row.updated_by_id }
        : {}),
      status_code: row.status_code,
      status_description: row.status_description,
      // payment_amount is optional in DTO; map null to undefined if present
      ...(row.payment_amount !== null
        ? { payment_amount: row.payment_amount }
        : {}),
      status_timestamp: toISOStringSafe(row.status_timestamp),
      created_at: toISOStringSafe(row.created_at),
    };
  });

  // 7. Paginate - strip branding for pagination fields (no 'as', use Number())
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
