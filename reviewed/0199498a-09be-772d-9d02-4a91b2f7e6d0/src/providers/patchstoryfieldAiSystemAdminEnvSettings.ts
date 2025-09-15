import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import { IPageIStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiEnvSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve environment settings with filtering and pagination
 * (storyfield_ai_env_settings table).
 *
 * This endpoint allows a system administrator to retrieve a filtered and
 * paginated list of environment settings from the storyfield_ai_env_settings
 * table. Each entry is a key-value configuration item (such as API tokens,
 * runtime feature toggles, or environment URLs) associated with a deployment
 * environment (e.g., production, staging). The endpoint supports advanced
 * filtering by environment, key name, and changed_by, as well as pagination.
 * The result includes audit fields and is restricted to systemAdmin users for
 * security.
 *
 * @param props - Object with authentication and filter parameters
 * @param props.systemAdmin - The authenticated SystemadminPayload performing
 *   the request
 * @param props.body - Filter criteria and pagination fields
 * @returns Paginated list of environment settings for the query, including
 *   audit fields
 * @throws {Error} If pagination parameters are invalid or if system errors
 *   occur
 */
export async function patchstoryfieldAiSystemAdminEnvSettings(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiEnvSetting.IRequest;
}): Promise<IPageIStoryfieldAiEnvSetting> {
  const { body } = props;
  // --- Pagination: default and sanitize ---
  const rawPage =
    typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const rawLimit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  const skip = (page - 1) * limit;

  // --- Build where condition with soft delete filter ---
  const where = {
    deleted_at: null,
    ...(body.env_name !== undefined &&
      body.env_name !== null && { env_name: body.env_name }),
    ...(body.env_key !== undefined &&
      body.env_key !== null && { env_key: body.env_key }),
    ...(body.changed_by !== undefined &&
      body.changed_by !== null && { changed_by: body.changed_by }),
  };

  // --- Fetch paginated/filtered data and matching total count ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_env_settings.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_env_settings.count({ where }),
  ]);

  // --- Map and convert results (all date fields to string ISO, deleted_at is optional/nullable) ---
  const data = rows.map((row) => ({
    id: row.id,
    env_key: row.env_key,
    env_value: row.env_value,
    env_name: row.env_name,
    changed_by: row.changed_by,
    change_reason: row.change_reason,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  // --- Compute pagination result (all int fields as numbers) ---
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
