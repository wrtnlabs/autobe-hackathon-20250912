import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import { IPageIHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserAuthentication";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a filtered, paginated list of user authentication records
 * (healthcare_platform_user_authentications).
 *
 * Retrieve a paginated and filtered set of user authentication records from the
 * system, supporting use cases such as security audits, credential inventory
 * management, or compliance reviews in the healthcarePlatform. This endpoint
 * enables searching by user_type, authentication provider, provider_key,
 * organizational context, and creation timestamps, with the option to use
 * multiple combined filters, sorting, and pagination. Only records accessible
 * to the calling organizationAdmin are included.
 *
 * @param props - Object containing search filters and authenticated
 *   organization admin's payload
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - Search filters and pagination parameters
 * @returns Paginated list of user authentication summary records with
 *   pagination metadata
 * @throws {Error} If the authenticated admin is not enrolled or organization
 *   cannot be found
 */
export async function patchhealthcarePlatformOrganizationAdminUserAuthentications(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformUserAuthentication.IRequest;
}): Promise<IPageIHealthcarePlatformUserAuthentication.ISummary> {
  const { organizationAdmin, body } = props;

  // Step 1: Find organization id by this admin
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
      select: { id: true },
    });
  if (!admin) {
    throw new Error("Not enrolled or already deleted");
  }
  // Find org assignment to get organization id
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { user_id: organizationAdmin.id, deleted_at: null },
      select: { healthcare_platform_organization_id: true },
    });
  if (!orgAssignment) {
    throw new Error("Organization assignment not found or access denied");
  }
  const organizationId = orgAssignment.healthcare_platform_organization_id;

  // Step 2: Get all user_ids for this organization (exclude deleted assignments)
  const assignments =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findMany({
      where: {
        healthcare_platform_organization_id: organizationId,
        deleted_at: null,
      },
      select: { user_id: true },
    });
  const userIds = assignments.map((x) => x.user_id);

  // Step 3: Build dynamic filter for authentications
  // Map date filters using toISOStringSafe; null/undefined is not included
  const createdFilter =
    body.created_after || body.created_before
      ? {
          ...(body.created_after !== undefined && {
            gte: toISOStringSafe(body.created_after),
          }),
          ...(body.created_before !== undefined && {
            lte: toISOStringSafe(body.created_before),
          }),
        }
      : undefined;
  // Only use DB filter if values are defined
  const where = {
    user_id: { in: userIds },
    deleted_at: null,
    ...(body.user_type !== undefined && { user_type: body.user_type }),
    ...(body.provider !== undefined && { provider: body.provider }),
    ...(body.provider_key !== undefined && { provider_key: body.provider_key }),
    ...(createdFilter && { created_at: createdFilter }),
  };

  // Step 4: Handle sorting field and order
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const [fieldRaw, orderRaw] = body.sort.split(":");
    const field = fieldRaw?.trim();
    const order: "asc" | "desc" = orderRaw?.trim() === "asc" ? "asc" : "desc";
    if (
      field &&
      ["created_at", "updated_at", "provider", "user_type"].includes(field)
    ) {
      orderBy = { [field]: order };
    }
  }

  // Step 5: Pagination - defaulting page: 1, page_size: 50
  // All pagination numbers must be number & tags.Type<"int32"> & tags.Minimum<0>
  const pageRaw = body.page ?? 1;
  const pageSizeRaw = body.page_size ?? 50;
  const page: number = Number(pageRaw);
  const page_size: number = Number(pageSizeRaw);
  const skip = (page - 1) * page_size;

  // Step 6: Query records and total count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_authentications.findMany({
      where,
      orderBy,
      skip,
      take: page_size,
    }),
    MyGlobal.prisma.healthcare_platform_user_authentications.count({ where }),
  ]);

  // Step 7: Map to ISummary collection (dates converted, null/undefined distinction carefully honored)
  const data = records.map((record) => {
    // All fields are required except optional last_authenticated_at, deleted_at
    // Use undefined if original is null for optional fields
    return {
      id: record.id,
      user_type: record.user_type,
      user_id: record.user_id,
      provider: record.provider,
      provider_key: record.provider_key,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      ...(record.last_authenticated_at !== null &&
      record.last_authenticated_at !== undefined
        ? {
            last_authenticated_at: toISOStringSafe(
              record.last_authenticated_at,
            ),
          }
        : {}),
      ...(record.deleted_at !== null && record.deleted_at !== undefined
        ? { deleted_at: toISOStringSafe(record.deleted_at) }
        : {}),
    };
  });

  // Step 8: Compose paginated result with type-branded numbers
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: page_size as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / page_size) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
