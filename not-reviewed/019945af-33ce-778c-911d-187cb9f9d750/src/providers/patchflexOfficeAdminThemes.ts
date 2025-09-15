import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import { IPageIFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeTheme";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and paginate UI themes
 *
 * Retrieve a filtered, sorted, and paginated list of UI/Page Builder themes
 * stored in the FlexOffice system. This operation accesses the
 * flex_office_themes table containing theming information represented by theme
 * names and CSS content.
 *
 * This PATCH endpoint accepts search criteria such as name filters and supports
 * pagination fields like page number and size. The response contains a
 * paginated collection of theme summary information optimized for list
 * displays.
 *
 * Authorized users typically include Admins capable of managing themes.
 *
 * @param props - Object containing admin authentication payload and request
 *   body
 * @param props.admin - The authenticated admin user making the request
 * @param props.body - Filter and pagination parameters for searching themes
 * @returns Paginated summaries of UI themes matching the filters
 * @throws {Error} When page or limit parameters are invalid (less than 1)
 */
export async function patchflexOfficeAdminThemes(props: {
  admin: AdminPayload;
  body: IFlexOfficeTheme.IRequest;
}): Promise<IPageIFlexOfficeTheme.ISummary> {
  const { admin, body } = props;

  // Validate pagination parameters with defaults
  const page = body.page ?? 1;
  if (page < 1) throw new Error("Page number must be >= 1");

  const limit = body.limit ?? 10;
  if (limit < 1) throw new Error("Limit must be >= 1");

  // Build filtering condition for optional name
  const where = {
    ...(body.name !== undefined &&
      body.name !== null &&
      body.name !== "" && { name: { contains: body.name } }),
  };

  // Determine order direction for sorting by name
  const orderBy = {
    name: body.sortOrder === "asc" ? "asc" : "desc",
  };

  // Calculate offset for pagination
  const skip = (page - 1) * limit;

  // Query total and paginated themes in parallel
  const [total, themes] = await Promise.all([
    MyGlobal.prisma.flex_office_themes.count({ where }),
    MyGlobal.prisma.flex_office_themes.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  // Map database results to theme summaries
  const data = themes.map((theme) => ({
    id: typia.assert<string & tags.Format<"uuid">>(theme.id),
    name: theme.name,
  }));

  // Construct pagination details
  const pagination = {
    current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(page),
    limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(limit),
    records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(total),
    pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      Math.ceil(total / limit),
    ),
  };

  return { pagination, data };
}
