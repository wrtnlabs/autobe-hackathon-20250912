import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import { IPageIFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSource";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a list of data sources with filtering and pagination
 * support.
 *
 * This operation returns a paginated summary list of external data sources
 * registered in the system. Filtering by name (partial match), type, and active
 * status is supported. Pagination parameters page and limit control result
 * size.
 *
 * Authorization is enforced via the admin payload.
 *
 * @param props - Object containing the admin payload and request filters
 * @param props.admin - The authenticated admin user payload
 * @param props.body - Filter and pagination parameters as per
 *   IFlexOfficeDataSource.IRequest
 * @returns Paginated summary list matching the search criteria
 * @throws Error if database access fails
 */
export async function patchflexOfficeAdminDataSources(props: {
  admin: AdminPayload;
  body: IFlexOfficeDataSource.IRequest;
}): Promise<IPageIFlexOfficeDataSource.ISummary> {
  const { body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;
  const skip = page * limit;

  const where: {
    name?: { contains: string };
    type?: string;
    is_active?: boolean;
  } = {};

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  if (body.type !== undefined && body.type !== null) {
    where.type = body.type;
  }

  if (body.is_active !== undefined && body.is_active !== null) {
    where.is_active = body.is_active;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_data_sources.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        is_active: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_data_sources.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      is_active: item.is_active,
    })),
  };
}
