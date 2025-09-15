import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Registers a new member user account in the chatbot system.
 *
 * Creates a new record in the 'chatbot_members' table with the provided
 * internal sender ID and nickname. Generates JWT access and refresh tokens upon
 * success.
 *
 * This is a public endpoint and requires no prior authentication.
 *
 * @param props - Object containing member payload and registration body data
 * @param props.member - The authenticated member payload (not used for join)
 * @param props.body - Object containing internal_sender_id and nickname for the
 *   new member
 * @returns The authorized member information including authentication tokens
 * @throws {Error} When a member with the same internal_sender_id already exists
 */
export async function postauthMemberJoin(props: {
  member: MemberPayload;
  body: IChatbotMember.ICreate;
}): Promise<IChatbotMember.IAuthorized> {
  const { body } = props;

  // Check for duplicate internal_sender_id
  const existing = await MyGlobal.prisma.chatbot_members.findFirst({
    where: { internal_sender_id: body.internal_sender_id },
  });
  if (existing) {
    throw new Error("Duplicate internal_sender_id");
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  // Create new member record
  const created = await MyGlobal.prisma.chatbot_members.create({
    data: {
      id,
      internal_sender_id: body.internal_sender_id,
      nickname: body.nickname,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      userId: created.id,
      internal_sender_id: created.internal_sender_id,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiration timestamps for tokens
  const nowDate = new Date();
  const expiredAt = toISOStringSafe(new Date(nowDate.getTime() + 3600 * 1000)); // 1 hour later
  const refreshableUntil = toISOStringSafe(
    new Date(nowDate.getTime() + 7 * 24 * 3600 * 1000),
  ); // 7 days later

  return {
    id: created.id,
    internal_sender_id: created.internal_sender_id,
    nickname: created.nickname,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
