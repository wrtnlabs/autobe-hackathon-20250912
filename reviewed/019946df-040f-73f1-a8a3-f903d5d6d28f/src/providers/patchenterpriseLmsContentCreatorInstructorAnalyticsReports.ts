import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { IPageIEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnalyticsReport";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Search and retrieve a filtered, paginated list of analytics reports.
 *
 * Retrieves paginated summaries of analytics reports filtered by tenant ID,
 * report type, and search term matching report name or type.
 *
 * Supports sorting by report_name, report_type, created_at, updated_at, or
 * generated_at fields, ascending or descending.
 *
 * @param props - Properties including content creator/instructor auth payload
 *   and request body
 * @param props.contentCreatorInstructor - The authenticated content
 *   creator/instructor user
 * @param props.body - The request body containing filter and pagination
 *   parameters
 * @returns Paginated list of analytics report summaries
 * @throws {Error} When page or limit parameters are invalid
 */
export async function patchenterpriseLmsContentCreatorInstructorAnalyticsReports(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsAnalyticsReport.IRequest;
}): Promise<IPageIEnterpriseLmsAnalyticsReport.ISummary> {
  const { contentCreatorInstructor, body } = props;

  // Validate and normalize pagination parameters
  const page = body.page;
  const limit = body.limit;

  if (page < 1) throw new Error("Page number must be greater than 0");
  if (limit < 1) throw new Error("Limit must be greater than 0");

  // Build the where filter object for Prisma
  const where: {
    tenant_id?: string & tags.Format<"uuid">;
    report_type?: { contains: string };
    OR?: {
      report_name?: { contains: string };
      report_type?: { contains: string };
    }[];
  } = {};

  if (body.tenant_id !== undefined && body.tenant_id !== null) {
    where.tenant_id = body.tenant_id;
  }
  if (body.report_type !== undefined && body.report_type !== null) {
    where.report_type = { contains: body.report_type };
  }
  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { report_name: { contains: body.search } },
      { report_type: { contains: body.search } },
    ];
  }

  // Determine order by field and direction
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (
    body.order !== undefined &&
    body.order !== null &&
    body.order.length > 0
  ) {
    const direction: "asc" | "desc" = body.order.startsWith("-")
      ? "desc"
      : "asc";
    const field = body.order.replace(/^[-+]/, "");
    if (
      [
        "report_name",
        "report_type",
        "created_at",
        "updated_at",
        "generated_at",
      ].includes(field)
    ) {
      orderBy = { [field]: direction };
    }
  }

  // Retrieve data using Prisma
  const [data, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_analytics_reports.findMany({
      where,
      select: {
        id: true,
        report_name: true,
        report_type: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_analytics_reports.count({ where }),
  ]);

  // Return paginated results matching the summary DTO
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
