import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Creates a user profile record linked to the authenticated member.
 *
 * The user profile contains optional metadata such as nickname, profile
 * picture, and biography, allowing frequent updates without modifying core user
 * data.
 *
 * The member must be authorized and can only create a profile for themselves.
 *
 * @param props - Object containing authentication info and profile creation
 *   data
 * @param props.member - Authenticated member payload
 * @param props.body - User profile creation data
 * @returns The created user profile object
 * @throws {Error} When the authenticated member attempts to create a profile
 *   for another user
 * @throws {Error} When the user_id does not exist or the user is deleted
 */
export async function postoauthServerMemberUserProfiles(props: {
  member: MemberPayload;
  body: IOauthServerUserProfile.ICreate;
}): Promise<IOauthServerUserProfile> {
  const { member, body } = props;

  if (body.user_id !== member.id) {
    throw new Error("Unauthorized: You can only create profiles for yourself.");
  }

  const user = await MyGlobal.prisma.oauth_server_members.findUnique({
    where: { id: body.user_id },
  });

  if (!user || user.deleted_at !== null) {
    throw new Error("User does not exist or has been deleted.");
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_user_profiles.create({
    data: {
      id,
      user_id: body.user_id,
      nickname: body.nickname ?? null,
      profile_picture_url: body.profile_picture_url ?? null,
      biography: body.biography ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    user_id: created.user_id,
    nickname: created.nickname ?? null,
    profile_picture_url: created.profile_picture_url ?? null,
    biography: created.biography ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
