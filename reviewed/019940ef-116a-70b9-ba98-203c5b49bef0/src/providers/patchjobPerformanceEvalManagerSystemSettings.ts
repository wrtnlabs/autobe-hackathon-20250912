import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSystemSettings";
import { IPageIJobPerformanceEvalSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalSystemSettings";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Search and retrieve paginated list of jobPerformanceEval system settings.
 *
 * This endpoint allows managers to query system settings with filters, search
 * keywords, pagination, and sorting on setting keys.
 *
 * @param props - Object containing manager authentication and search criteria.
 * @param props.manager - Authenticated manager payload.
 * @param props.body - Request body containing filtering and pagination
 *   parameters.
 * @returns Paginated list of matching job performance evaluation system
 *   settings.
 * @throws {Error} Throws on database or internal errors.
 */
export async function patchjobPerformanceEvalManagerSystemSettings(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalSystemSettings.IRequest;
}): Promise<IPageIJobPerformanceEvalSystemSettings> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where: {
    setting_key?: string;
    OR?: {
      setting_key?: { contains: string };
      description?: { contains: string };
    }[];
  } = {};

  if (body.setting_key !== undefined && body.setting_key !== null) {
    where.setting_key = body.setting_key;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { setting_key: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_system_settings.findMany({
      where: where,
      orderBy: { setting_key: body.order_by === "desc" ? "desc" : "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.job_performance_eval_system_settings.count({
      where: where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      setting_key: r.setting_key,
      setting_value: r.setting_value,
      description: r.description ?? null,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
  };
}
