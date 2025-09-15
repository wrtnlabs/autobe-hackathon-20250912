import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";
import { IPageISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISubscriptionRenewalGuardianVendor";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Search and retrieve a filtered, paginated list of subscription vendors
 *
 * This endpoint returns subscription vendors filtered by name and deletion
 * status, supporting pagination and sorting. Users must be authenticated.
 *
 * @param props - Object containing user authentication and request body
 * @param props.user - Authenticated user payload
 * @param props.body - Request containing filter and pagination options
 * @returns Paginated summary of subscription vendors
 * @throws {Error} When authentication fails or DB access errors occur
 */
export async function patchsubscriptionRenewalGuardianUserVendors(props: {
  user: UserPayload;
  body: ISubscriptionRenewalGuardianVendor.IRequest;
}): Promise<IPageISubscriptionRenewalGuardianVendor.ISummary> {
  const { user, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    name?: { contains: string };
    deleted_at?: null;
  } = {};

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  if (body.include_deleted !== undefined && body.include_deleted !== null) {
    if (!body.include_deleted) {
      where.deleted_at = null;
    }
  } else {
    where.deleted_at = null;
  }

  let sortBy = body.sort_by ?? "created_at";
  let sortOrder = body.sort_order ?? "desc";

  if (sortBy !== "name" && sortBy !== "created_at") {
    sortBy = "created_at";
  }

  if (sortOrder !== "asc" && sortOrder !== "desc") {
    sortOrder = "desc";
  }

  const [vendors, total] = await Promise.all([
    MyGlobal.prisma.subscription_renewal_guardian_vendors.findMany({
      where,
      select: {
        id: true,
        name: true,
        created_at: true,
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.subscription_renewal_guardian_vendors.count({ where }),
  ]);

  const data = vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    created_at: toISOStringSafe(vendor.created_at),
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0> as number,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0> as number,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0> as number,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number,
    },
    data,
  };
}
