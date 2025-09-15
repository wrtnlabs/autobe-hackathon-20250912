import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemAlert";
import { IPageIFlexOfficeSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeSystemAlert";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of system alerts from the
 * flex_office_system_alerts table.
 *
 * This operation supports filtering by severity, resolution status, and
 * creation date ranges. It returns summaries optimized for dashboard display.
 *
 * Requires admin authorization.
 *
 * @param props - Object containing the authenticated admin and request body
 *   with filters and pagination
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Filter and pagination criteria for retrieving system
 *   alerts
 * @returns A paginated summary of system alerts matching the criteria
 * @throws {Error} Throws if database access or query fails
 */
export async function patchflexOfficeAdminSystemAlerts(props: {
  admin: AdminPayload;
  body: IFlexOfficeSystemAlert.IRequest;
}): Promise<IPageIFlexOfficeSystemAlert.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    severity?: string;
    is_resolved?: boolean;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {};

  if (body.severity !== undefined && body.severity !== null) {
    where.severity = body.severity;
  }

  if (body.is_resolved !== undefined && body.is_resolved !== null) {
    where.is_resolved = body.is_resolved;
  }

  if (body.created_after !== undefined && body.created_after !== null) {
    where.created_at = {
      ...(where.created_at ?? {}),
      gte: body.created_after,
    };
  }

  if (body.created_before !== undefined && body.created_before !== null) {
    where.created_at = {
      ...(where.created_at ?? {}),
      lte: body.created_before,
    };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.flex_office_system_alerts.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        severity: true,
        message: true,
        is_resolved: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_system_alerts.count({ where }),
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
      severity: row.severity,
      message: row.message,
      is_resolved: row.is_resolved,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
