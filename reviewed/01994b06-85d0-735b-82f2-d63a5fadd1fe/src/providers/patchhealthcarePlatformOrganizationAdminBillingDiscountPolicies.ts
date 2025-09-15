import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import { IPageIHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingDiscountPolicy";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Paginated search for billing discount policies
 * (healthcare_platform_billing_discount_policies).
 *
 * This API enables authenticated organization admins to search, filter, and
 * paginate billing discount policies for their organization. Results are scoped
 * to the admin's organization and exclude soft-deleted records. Supports search
 * by policy name, discount type, activation status, and description, as well as
 * optional creation date range filtering. Pageable with default page size of
 * 20.
 *
 * @param props - The request properties
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.body - Paging and filtering search parameters (query body)
 * @returns Paginated list of discount policy summaries visible to the
 *   organization admin
 * @throws {Error} If database query fails or the admin is unauthorized
 */
export async function patchhealthcarePlatformOrganizationAdminBillingDiscountPolicies(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBillingDiscountPolicy.IRequest;
}): Promise<IPageIHealthcarePlatformBillingDiscountPolicy.ISummary> {
  const { organizationAdmin, body } = props;

  // Always scope to the admin's organization (do not allow impersonation)
  const orgId = organizationAdmin.id;
  // Pagination -- IRequest does not define paging, so we use defaults for now
  const page = 0;
  const limit = 20;
  const skip = page * limit;

  // Build the Prisma where clause for advanced searching
  const where = {
    organization_id: orgId,
    deleted_at: null,
    ...(body.policy_name && { policy_name: { contains: body.policy_name } }),
    ...(body.discount_type && { discount_type: body.discount_type }),
    ...(typeof body.is_active === "boolean" && { is_active: body.is_active }),
    ...(body.description && { description: { contains: body.description } }),
    ...((body.created_at_from || body.created_at_to) && {
      created_at: {
        ...(body.created_at_from && { gte: body.created_at_from }),
        ...(body.created_at_to && { lte: body.created_at_to }),
      },
    }),
  };

  // Parallel query for page data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_discount_policies.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        organization_id: true,
        policy_name: true,
        discount_type: true,
        is_active: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_billing_discount_policies.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      organization_id: row.organization_id,
      policy_name: row.policy_name,
      discount_type: row.discount_type,
      is_active: row.is_active,
    })),
  };
}
