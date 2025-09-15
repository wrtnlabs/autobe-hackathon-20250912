import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import { IPageITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementPmo";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Search filtered, paginated PMO list
 *
 * Retrieves a list of Project Management Officers (PMOs) from the database
 * filtered by an optional search string that matches email or name. Supports
 * pagination with page and limit parameters and returns the results sorted
 * ascending by email address.
 *
 * Only PMO role authenticated users can access this endpoint.
 *
 * @param props - Object containing the authenticated PMO and request body
 * @param props.pmo - The authenticated PMO user
 * @param props.body - Filtering and pagination parameters conforming to
 *   ITaskManagementPmo.IRequest
 * @returns A paginated summary list of PMOs matching the search criteria
 * @throws {Error} When the database operation fails or invalid parameters are
 *   passed
 */
export async function patchtaskManagementPmoTaskManagementPmos(props: {
  pmo: PmoPayload;
  body: ITaskManagementPmo.IRequest;
}): Promise<IPageITaskManagementPmo.ISummary> {
  const { body } = props;

  // Default pagination and validation
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  if (page < 1) {
    throw new Error("Page must be greater than or equal to 1");
  }
  if (limit < 1) {
    throw new Error("Limit must be greater than or equal to 1");
  }

  const skip = (page - 1) * limit;

  // Build filter conditions
  const whereConditions =
    body.search !== null &&
    body.search !== undefined &&
    body.search.trim() !== ""
      ? {
          OR: [
            { email: { contains: body.search } },
            { name: { contains: body.search } },
          ],
        }
      : {};

  // Query database for list and count
  const [pmos, total] = await Promise.all([
    MyGlobal.prisma.task_management_pmo.findMany({
      where: { ...whereConditions, deleted_at: null },
      skip,
      take: limit,
      orderBy: { email: "asc" },
    }),
    MyGlobal.prisma.task_management_pmo.count({
      where: { ...whereConditions, deleted_at: null },
    }),
  ]);

  // Build paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: pmos.map((pmo) => ({
      id: pmo.id as string & tags.Format<"uuid">,
      email: pmo.email,
      name: pmo.name,
    })),
  };
}
