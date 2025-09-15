import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentActorLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentActorLoginHistory";
import { IPageIAtsRecruitmentActorLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentActorLoginHistory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List and search paginated actor login history records
 * (ats_recruitment_actor_login_histories)
 *
 * Returns a filtered, paginated list of actor login history records from the
 * audit trail table, supporting security and compliance review. Only
 * authenticated system administrators may invoke this operation. Supports
 * advanced search by actor, role type, outcome, date, device, and pagination.
 *
 * @param props - The request object
 * @param props.systemAdmin - SystemadminPayload of the authenticated requesting
 *   administrator
 * @param props.body - Advanced filtering and paging parameters per
 *   IAtsRecruitmentActorLoginHistory.IRequest
 * @returns A paginated summary grid of login history, including all matching
 *   records
 * @throws {Error} If an unexpected database or type issue occurs
 */
export async function patchatsRecruitmentSystemAdminActorLoginHistories(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentActorLoginHistory.IRequest;
}): Promise<IPageIAtsRecruitmentActorLoginHistory.ISummary> {
  const { body } = props;

  // Enforce maximum and minimum page/limit values for business policy
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? Math.min(body.limit, 100)
      : 20;
  const skip = (page - 1) * limit;

  // Build Prisma where clause with null/undefined checks for each filter
  const where = {
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.actor_type !== undefined &&
      body.actor_type !== null && { actor_type: body.actor_type }),
    ...(body.login_succeeded !== undefined &&
      body.login_succeeded !== null && {
        login_succeeded: body.login_succeeded,
      }),
    ...(body.origin_ip !== undefined &&
      body.origin_ip !== null && { origin_ip: { contains: body.origin_ip } }),
    ...(body.user_agent !== undefined &&
      body.user_agent !== null && {
        user_agent: { contains: body.user_agent },
      }),
    ...((body.login_at_gte !== undefined && body.login_at_gte !== null) ||
    (body.login_at_lte !== undefined && body.login_at_lte !== null)
      ? {
          login_at: {
            ...(body.login_at_gte !== undefined &&
              body.login_at_gte !== null && { gte: body.login_at_gte }),
            ...(body.login_at_lte !== undefined &&
              body.login_at_lte !== null && { lte: body.login_at_lte }),
          },
        }
      : {}),
  };

  // Query both paged data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_actor_login_histories.findMany({
      where,
      orderBy: { login_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.ats_recruitment_actor_login_histories.count({ where }),
  ]);

  // Map db results to ISummary DTO, converting Date values using toISOStringSafe
  const data = rows.map((row) => {
    const result = {
      id: row.id,
      actor_id: row.actor_id,
      actor_type: row.actor_type,
      login_succeeded: row.login_succeeded,
      origin_ip: row.origin_ip === null ? undefined : row.origin_ip,
      user_agent: row.user_agent === null ? undefined : row.user_agent,
      login_at: toISOStringSafe(row.login_at),
    };
    return result;
  });

  // Pagination brand types require Number() to strip Typia tags for compatibility
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
    },
    data,
  };
}
