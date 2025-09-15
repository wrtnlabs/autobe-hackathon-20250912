import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";
import { IPageIStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiSystemPolicy";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Admin search and listing of system policy records in
 * storyfield_ai_system_policies.
 *
 * This operation enables system administrators to perform a paginated search
 * and listing of all active and historical system policy records within the
 * Storyfield AI platform. It provides filtering by code, name, type, activation
 * state, and creation date, as well as pagination and sort. Only accessible to
 * actors authorized via SystemadminPayload.
 *
 * @param props - Function parameters containing:
 *
 *   - SystemAdmin: SystemadminPayload (authorization contract, enforced upstream,
 *       required for all system policy access)
 *   - Body: IStoryfieldAiSystemPolicy.IRequest (all optional filters for search and
 *       pagination)
 *
 * @returns Paginated result (IPageIStoryfieldAiSystemPolicy.ISummary)
 *   containing summary views of all system policy definitions matching the
 *   filters.
 * @throws {Error} If a database or internal error occurs.
 */
export async function patchstoryfieldAiSystemAdminSystemPolicies(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiSystemPolicy.IRequest;
}): Promise<IPageIStoryfieldAiSystemPolicy.ISummary> {
  const {
    policy_code,
    name,
    type,
    active,
    created_from,
    created_to,
    page,
    limit,
  } = props.body;

  const normalizedPage = page ?? 0;
  const normalizedLimit = limit ?? 20;
  const skip = Number(normalizedPage) * Number(normalizedLimit);
  const take = Number(normalizedLimit);

  const where = {
    ...(policy_code !== undefined && policy_code !== null && { policy_code }),
    ...(name !== undefined && name !== null && { name }),
    ...(type !== undefined && type !== null && { type }),
    ...(active !== undefined && active !== null && { active }),
    ...((created_from !== undefined && created_from !== null) ||
    (created_to !== undefined && created_to !== null)
      ? {
          created_at: {
            ...(created_from !== undefined &&
              created_from !== null && {
                gte: toISOStringSafe(created_from),
              }),
            ...(created_to !== undefined &&
              created_to !== null && {
                lte: toISOStringSafe(created_to),
              }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_system_policies.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.storyfield_ai_system_policies.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(normalizedPage),
      limit: Number(normalizedLimit),
      records: Number(total),
      pages: Math.ceil(total / (Number(normalizedLimit) || 1)),
    },
    data: items.map((item) => {
      const desc = item.description;
      const deletedAt =
        item.deleted_at !== null && item.deleted_at !== undefined
          ? toISOStringSafe(item.deleted_at)
          : undefined;
      return {
        id: item.id,
        policy_code: item.policy_code,
        name: item.name,
        value: item.value,
        type: item.type,
        active: item.active,
        description: desc,
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: deletedAt,
      };
    }),
  };
}
