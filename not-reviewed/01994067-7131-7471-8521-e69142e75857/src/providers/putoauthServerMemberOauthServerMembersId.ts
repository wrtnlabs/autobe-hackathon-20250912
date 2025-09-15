import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update an OAuth member by unique ID.
 *
 * This operation allows an authenticated member to update their own email,
 * email verification status, password hash, and soft deletion timestamp.
 *
 * Authorization enforces that members can only update their own records.
 *
 * @param props - Object containing member payload, target member ID, and update
 *   body
 * @param props.member - Authenticated member making the request
 * @param props.id - UUID of the member to update
 * @param props.body - Partial update data for member
 * @returns Updated OAuth member information with all fields
 * @throws {Error} If unauthorized access is attempted
 * @throws {Error} If the target member is not found or is soft deleted
 */
export async function putoauthServerMemberOauthServerMembersId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerMember.IUpdate;
}): Promise<IOauthServerMember> {
  const { member, id, body } = props;

  if (member.id !== id) {
    throw new Error("Unauthorized: Cannot update another member");
  }

  const existingMember = await MyGlobal.prisma.oauth_server_members.findUnique({
    where: { id },
  });
  if (!existingMember || existingMember.deleted_at !== null) {
    throw new Error("Member not found or deleted");
  }

  const updatedMember = await MyGlobal.prisma.oauth_server_members.update({
    where: { id },
    data: {
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.email_verified !== undefined
        ? { email_verified: body.email_verified }
        : {}),
      ...(body.password_hash !== undefined
        ? { password_hash: body.password_hash }
        : {}),
      ...(body.deleted_at !== undefined ? { deleted_at: body.deleted_at } : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedMember.id,
    email: updatedMember.email,
    email_verified: updatedMember.email_verified,
    password_hash: updatedMember.password_hash,
    created_at: toISOStringSafe(updatedMember.created_at),
    updated_at: toISOStringSafe(updatedMember.updated_at),
    deleted_at: updatedMember.deleted_at
      ? toISOStringSafe(updatedMember.deleted_at)
      : null,
  };
}
