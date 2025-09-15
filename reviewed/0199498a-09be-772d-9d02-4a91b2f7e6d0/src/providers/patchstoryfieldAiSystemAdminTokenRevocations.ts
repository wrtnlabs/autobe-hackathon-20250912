import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTokenRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTokenRevocation";
import { IPageIStoryfieldAiTokenRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiTokenRevocation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search, filter, and retrieve a paginated list of token revocation events
 * (systemAdmin only; storyfield_ai_token_revocations)
 *
 * This operation enables system administrators to search, filter, and paginate
 * all authentication token revocation audit events. Filtering is supported by
 * user, admin, token hash, revocation reason (partial), and creation date
 * window. The response returns a page of summary views, providing the necessary
 * details for security audit, compliance, and abuse tracking, ordered by most
 * recent event.
 *
 * @param props - Input parameters
 * @param props.systemAdmin - The authorized SystemadminPayload for the system
 *   admin making the request
 * @param props.body - The filter and pagination options for the search
 * @returns A paginated list of summary information (ISummary) about matching
 *   token revocation events
 * @throws {Error} If invalid paging parameters are supplied
 */
export async function patchstoryfieldAiSystemAdminTokenRevocations(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiTokenRevocation.IRequest;
}): Promise<IPageIStoryfieldAiTokenRevocation.ISummary> {
  const { body } = props;

  // Pagination defaults and limit enforcement
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const rawLimit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const limit = rawLimit > 100 ? 100 : rawLimit;
  const skip = (page - 1) * limit;

  // Build the where clause functionally, ensuring undefined/null are handled
  const where = {
    ...(body.token_hash !== undefined &&
      body.token_hash !== null && { token_hash: body.token_hash }),
    ...(body.revoked_reason !== undefined &&
      body.revoked_reason !== null && {
        revoked_reason: { contains: body.revoked_reason },
      }),
    ...(body.authenticated_user_id !== undefined &&
      body.authenticated_user_id !== null && {
        authenticated_user_id: body.authenticated_user_id,
      }),
    ...(body.system_admin_id !== undefined &&
      body.system_admin_id !== null && {
        system_admin_id: body.system_admin_id,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Query records and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_token_revocations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        authenticated_user_id: true,
        system_admin_id: true,
        token_hash: true,
        revoked_reason: true,
        revoked_by_ip: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.storyfield_ai_token_revocations.count({ where }),
  ]);

  // Format result respecting all DTO constraints, no native Date, no type assertion
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: limit > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
    },
    data: results.map((item) => ({
      id: item.id,
      authenticated_user_id:
        item.authenticated_user_id === null ? null : item.authenticated_user_id,
      system_admin_id:
        item.system_admin_id === null ? null : item.system_admin_id,
      token_hash: item.token_hash,
      revoked_reason: item.revoked_reason,
      revoked_by_ip: item.revoked_by_ip === null ? null : item.revoked_by_ip,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
