import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiExternalApiFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiExternalApiFailure";
import { IPageIStoryfieldAiExternalApiFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiExternalApiFailure";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve paginated list of external API failure records for admin
 * review (storyfield_ai_external_api_failures table).
 *
 * This operation allows system administrators to perform advanced filtering and
 * retrieval of all integration failure and external API error records. These
 * records provide insight into system reliability, business process health, and
 * root-cause error attribution for events such as third-party failures, quota
 * overruns, network timeouts, or misconfigurations.
 *
 * Access to this endpoint is restricted to systemAdmin users given the
 * sensitive nature of error logs and the potential inclusion of PII or
 * technical details valuable for security monitoring. The response delivers a
 * summary view for each record, with options to expand details for incident
 * triage or forensics.
 *
 * Business logic includes robust filtering by API type, error code, endpoint,
 * status, affected user, or date range, and supports ordering by newest. This
 * endpoint forms the basis for error dashboards, incident response workflows,
 * and SLA audits.
 *
 * @param props - Object containing the authenticated systemAdmin and
 *   search/filter request body
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the query
 * @param props.body - IRequest containing search/filter parameters for external
 *   API failure logs
 * @returns IPageIStoryfieldAiExternalApiFailure.ISummary paginated API failure
 *   log summaries
 * @throws {Error} If any unexpected system error occurs during the query
 */
export async function patchstoryfieldAiSystemAdminExternalApiFailures(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiExternalApiFailure.IRequest;
}): Promise<IPageIStoryfieldAiExternalApiFailure.ISummary> {
  const { body } = props;

  const page = typeof body.page === "number" ? body.page : 0;
  const defaultLimit = 20;
  const maxLimit = 100;
  const limit =
    typeof body.limit === "number"
      ? Math.min(body.limit, maxLimit)
      : defaultLimit;

  // Build the filter condition object (inline, no intermediate variables for Prisma)
  const where = {
    ...(body.api_type !== undefined &&
      body.api_type !== null && { api_type: body.api_type }),
    ...(body.endpoint !== undefined &&
      body.endpoint !== null && { endpoint: body.endpoint }),
    ...(body.http_method !== undefined &&
      body.http_method !== null && { http_method: body.http_method }),
    ...(body.error_code !== undefined &&
      body.error_code !== null && { error_code: body.error_code }),
    ...(body.storyfield_ai_authenticateduser_id !== undefined &&
      body.storyfield_ai_authenticateduser_id !== null && {
        storyfield_ai_authenticateduser_id:
          body.storyfield_ai_authenticateduser_id,
      }),
    ...(body.storyfield_ai_story_id !== undefined &&
      body.storyfield_ai_story_id !== null && {
        storyfield_ai_story_id: body.storyfield_ai_story_id,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: toISOStringSafe(body.created_from),
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: toISOStringSafe(body.created_to),
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_external_api_failures.findMany({
      where,
      select: {
        id: true,
        storyfield_ai_authenticateduser_id: true,
        storyfield_ai_story_id: true,
        api_type: true,
        endpoint: true,
        http_method: true,
        error_code: true,
        error_message: true,
        retry_count: true,
        created_at: true,
        deleted_at: true,
      },
      orderBy: { created_at: "desc" },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_external_api_failures.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
    },
    data: rows.map((row) => ({
      id: row.id,
      storyfield_ai_authenticateduser_id:
        row.storyfield_ai_authenticateduser_id ?? null,
      storyfield_ai_story_id: row.storyfield_ai_story_id ?? null,
      api_type: row.api_type,
      endpoint: row.endpoint,
      http_method: row.http_method,
      error_code: row.error_code,
      error_message: row.error_message ?? null,
      retry_count: row.retry_count,
      created_at: toISOStringSafe(row.created_at),
      deleted_at:
        row.deleted_at !== undefined && row.deleted_at !== null
          ? toISOStringSafe(row.deleted_at)
          : null,
    })),
  };
}
