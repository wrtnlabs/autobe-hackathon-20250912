import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import { IPageIOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserGameProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Search and list game profiles for a user profile.
 *
 * This operation retrieves a filtered and paginated list of external game
 * profiles associated with a specific user profile while ensuring the
 * requesting member has authorization to access the data.
 *
 * Authorization check is performed by verifying the user profile belongs to the
 * authenticated member.
 *
 * Filters include platform, player_name (partial match), season, created_at,
 * updated_at, deleted_at, with pagination and sort capabilities.
 *
 * @param props - Object containing member info, target user profile ID, and
 *   filter body
 * @returns Paginated summary of user game profiles
 * @throws Error if user profile not found or unauthorized access
 */
export async function patchoauthServerMemberUserProfilesUserProfileIdGameProfiles(props: {
  member: MemberPayload;
  userProfileId: string & tags.Format<"uuid">;
  body: IOauthServerUserGameProfile.IRequest;
}): Promise<IPageIOauthServerUserGameProfile.ISummary> {
  const { member, userProfileId, body } = props;

  // Authorization check - verify userProfile ownership
  const userProfile =
    await MyGlobal.prisma.oauth_server_user_profiles.findUnique({
      where: { id: userProfileId },
    });

  if (!userProfile) {
    throw new Error("User profile not found");
  }

  if (userProfile.user_id !== member.id) {
    throw new Error("Unauthorized access to user profile");
  }

  // Build where condition
  const where: {
    user_profile_id: string & tags.Format<"uuid">;
    platform?: string;
    player_name?: { contains: string };
    season?: string;
    created_at?: string & tags.Format<"date-time">;
    updated_at?: string & tags.Format<"date-time">;
    deleted_at?: (string & tags.Format<"date-time">) | null;
  } = {
    user_profile_id: userProfileId,
  };

  if (body.platform !== undefined && body.platform !== null) {
    where.platform = body.platform;
  }

  if (body.player_name !== undefined && body.player_name !== null) {
    where.player_name = { contains: body.player_name };
  }

  if (body.season !== undefined && body.season !== null) {
    where.season = body.season;
  }

  if (body.created_at !== undefined && body.created_at !== null) {
    where.created_at = body.created_at;
  }

  if (body.updated_at !== undefined && body.updated_at !== null) {
    where.updated_at = body.updated_at;
  }

  if (body.deleted_at !== undefined && body.deleted_at !== null) {
    where.deleted_at = body.deleted_at;
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const skip = (page - 1) * limit;

  // Parse sorting instructions
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (
    body.sort !== undefined &&
    body.sort !== null &&
    body.sort.trim() !== ""
  ) {
    const [field, dir] = body.sort.trim().split(/\s+/);
    const direction = (dir || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    orderBy = { [field]: direction };
  }

  // Query database
  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_game_profiles.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_game_profiles.count({ where }),
  ]);

  // Convert results for response
  const data = results.map((item) => ({
    id: item.id,
    user_profile_id: item.user_profile_id,
    platform: item.platform,
    player_name: item.player_name,
    season: item.season ?? undefined,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
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
