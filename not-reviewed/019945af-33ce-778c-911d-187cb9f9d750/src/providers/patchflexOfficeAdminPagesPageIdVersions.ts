import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageVersion";
import { IPageIFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageVersion";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve UI page versions for a given page.
 *
 * This endpoint retrieves a paginated list of version snapshots for a specific
 * UI page. It supports filtering by version numbers, creation dates, and page
 * data content. Results are sorted and paginated according to the provided
 * parameters.
 *
 * Access is restricted to admins with valid authentication.
 *
 * @param props - The request properties including admin payload, target pageId,
 *   and search body
 * @param props.admin - Authenticated admin user performing this operation
 * @param props.pageId - UUID of the UI page to search versions for
 * @param props.body - Request body containing search filters and pagination
 *   parameters
 * @returns Paginated list of page version summaries
 * @throws {Error} If database queries fail or invalid parameters are provided
 */
export async function patchflexOfficeAdminPagesPageIdVersions(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageVersion.IRequest;
}): Promise<IPageIFlexOfficePageVersion.ISummary> {
  const { admin, pageId, body } = props;

  // Prepare pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: {
    flex_office_page_id: string & tags.Format<"uuid">;
    version_number?:
      | (number & tags.Type<"int32">)
      | { in: (number & tags.Type<"int32">)[] };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    page_data?: {
      contains: string;
    };
  } = {
    flex_office_page_id: pageId,
  };

  if (body.version_number !== undefined && body.version_number !== null) {
    where.version_number = body.version_number;
  }
  if (body.version_numbers !== undefined && body.version_numbers !== null) {
    where.version_number = { in: body.version_numbers };
  }
  if (
    (body.created_at_gte !== undefined && body.created_at_gte !== null) ||
    (body.created_at_lte !== undefined && body.created_at_lte !== null)
  ) {
    where.created_at = {};
    if (body.created_at_gte !== undefined && body.created_at_gte !== null) {
      where.created_at.gte = body.created_at_gte;
    }
    if (body.created_at_lte !== undefined && body.created_at_lte !== null) {
      where.created_at.lte = body.created_at_lte;
    }
  }
  if (
    body.page_data_contains !== undefined &&
    body.page_data_contains !== null
  ) {
    where.page_data = {
      contains: body.page_data_contains,
    };
  }

  // Determine orderBy
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sortBy) {
    if (body.sortBy === "id") {
      orderBy = { id: "asc" };
    } else if (body.sortBy === "version_number") {
      orderBy = { version_number: "desc" };
    } else if (body.sortBy === "created_at") {
      orderBy = { created_at: "desc" };
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_versions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        version_number: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_page_versions.count({ where }),
  ]);

  // Map results
  const data = results.map((o) => ({
    id: o.id,
    version_number: o.version_number,
    created_at: toISOStringSafe(o.created_at),
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
