import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";
import { IPageIFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeSystemSettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered, paginated list of FlexOffice system settings.
 *
 * This operation allows administrators to query the system settings
 * configurations based on optional filter criteria including the configuration
 * key and creation date ranges. It supports pagination and sorting by key with
 * default ascending order.
 *
 * @param props - The request properties containing admin authentication and
 *   filter criteria
 * @param props.admin - The authenticated admin user payload
 * @param props.body - The filter and pagination request body
 * @returns A paginated list of system setting summaries
 * @throws {Error} Throws if the database query fails or parameters are invalid
 */
export async function patchflexOfficeAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IFlexOfficeSystemSettings.IRequest;
}): Promise<IPageIFlexOfficeSystemSettings.ISummary> {
  const { admin, body } = props;

  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build where condition object
  const where = {
    ...(body.key !== undefined &&
      body.key !== null && {
        key: { contains: body.key },
      }),
    ...((body.created_at_min !== undefined && body.created_at_min !== null) ||
    (body.created_at_max !== undefined && body.created_at_max !== null)
      ? {
          created_at: {
            ...(body.created_at_min !== undefined &&
              body.created_at_min !== null && { gte: body.created_at_min }),
            ...(body.created_at_max !== undefined &&
              body.created_at_max !== null && { lte: body.created_at_max }),
          },
        }
      : {}),
  };

  // Inline orderBy with default ascending
  const orderBy =
    body.order_by_key === "desc" ? { key: "desc" } : { key: "asc" };

  // Run queries concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.flex_office_system_settings.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_system_settings.count({ where }),
  ]);

  // Map to summary list with proper null/undefined handling
  const data = records.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    key: record.key,
    value: record.value === null ? null : (record.value ?? undefined),
    description:
      record.description === null ? null : (record.description ?? undefined),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
