import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { IPageIEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnalyticsReport";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

export async function patchenterpriseLmsDepartmentManagerAnalyticsReports(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsAnalyticsReport.IRequest;
}): Promise<IPageIEnterpriseLmsAnalyticsReport.ISummary> {
  const { departmentManager, body } = props;

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const where: { [key: string]: unknown } = {
    tenant_id: departmentManager.id,
    deleted_at: null,
  };

  if (body.report_type !== undefined && body.report_type !== null) {
    where.report_type = body.report_type;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { report_name: { contains: body.search } },
      { report_type: { contains: body.search } },
    ];
  }

  let orderBy: { [key: string]: "asc" | "desc" } = { generated_at: "desc" };

  if (body.order !== undefined && body.order !== null) {
    const orderText = body.order.trim();
    if (orderText.startsWith("-")) {
      const orderField = orderText.slice(1);
      if (orderField === "generated_at" || orderField === "created_at") {
        orderBy = { [orderField]: "desc" };
      }
    } else {
      if (orderText === "generated_at" || orderText === "created_at") {
        orderBy = { [orderText]: "asc" };
      }
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_analytics_reports.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        report_name: true,
        report_type: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_analytics_reports.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((report) => ({
      id: report.id,
      report_name: report.report_name,
      report_type: report.report_type,
    })),
  };
}
