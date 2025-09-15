import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get detailed information of an OAuth member by ID.
 *
 * This operation retrieves the member's email, email verification status,
 * password hash, and audit timestamps including creation, update, and soft
 * deletion status.
 *
 * Access is restricted to authenticated members.
 *
 * @param props - Object containing authenticated member payload and target
 *   member ID
 * @param props.member - The authenticated member making the request
 * @param props.id - UUID of the member to retrieve
 * @returns OAuth server member details
 * @throws Error if member with the given ID does not exist
 */
export async function getoauthServerMemberOauthServerMembersId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerMember> {
  const { member, id } = props;

  const found = await MyGlobal.prisma.oauth_server_members.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      email: true,
      email_verified: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: found.id,
    email: found.email,
    email_verified: found.email_verified,
    password_hash: found.password_hash,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
