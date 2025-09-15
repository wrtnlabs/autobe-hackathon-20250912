import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfiles";
import { IPageIOauthServerUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserProfiles";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Searches and retrieves a filtered, paginated list of user profiles from the
 * OAuth server.
 *
 * This function supports filtering by nickname and user ID, pagination with
 * page and limit, and sorting by updated_at descending.
 *
 * Authorized only for authenticated members.
 *
 * @param props.member Authenticated member making the request
 * @param props.body Search and pagination parameters (nickname, user_id, page,
 *   limit)
 * @returns Paginated summary of user profiles matching the criteria
 * @throws {Error} When page or limit parameters are out of valid range
 */
export async function patchoauthServerMemberUserProfiles(props: {
  member: MemberPayload;
  body: IOauthServerUserProfiles.IRequest;
}): Promise<IPageIOauthServerUserProfiles.ISummary> {
  const { member, body } = props;

  // Validate and normalize pagination
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  if (page < 1) throw new Error("Invalid page number, must be >= 1");
  if (limit < 1) throw new Error("Invalid limit number, must be >= 1");

  // Compose where condition
  const where = {
    deleted_at: null as null,
    ...(body.nickname !== undefined && body.nickname !== null
      ? { nickname: { contains: body.nickname } }
      : {}),
    ...(body.user_id !== undefined && body.user_id !== null
      ? { user_id: body.user_id }
      : {}),
  };

  // Calculate pagination offset
  const skip = (page - 1) * limit;

  // Fetch records and count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_user_profiles.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        nickname: true,
        profile_picture_url: true,
        biography: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.oauth_server_user_profiles.count({ where }),
  ]);

  // Map database rows to output format with date string conversion
  const data = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    user_id: row.user_id as string & tags.Format<"uuid">,
    nickname: row.nickname ?? null,
    profile_picture_url: row.profile_picture_url ?? null,
    biography: row.biography ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

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
