import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Refresh JWT tokens for an authenticated member to maintain session continuity
 * in the chatbot system.
 *
 * Requires providing a valid refresh token confirming session validity. Returns
 * new authorization tokens and user details. Role is 'member'. Supports
 * continued access without re-login.
 *
 * @param props - Object containing member payload and refresh token body
 * @param props.member - The authenticated member payload
 * @param props.body - Request body containing the refresh token
 * @returns Refreshed authorized member information with JWT tokens
 * @throws {Error} When token verification fails or user not found
 */
export async function postauthMemberRefresh(props: {
  member: MemberPayload;
  body: IChatbotMember.IRefresh;
}): Promise<IChatbotMember.IAuthorized> {
  const { body } = props;

  // Verify the refresh token
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string; type: string; tokenType?: string };

  if (decoded.tokenType !== "refresh") {
    throw new Error("Invalid token type");
  }

  // Fetch the member user by id
  const user = await MyGlobal.prisma.chatbot_members.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Calculate token expiration times as ISO strings
  const nowMs = Date.now();
  const accessExpiryMs = nowMs + 3600 * 1000; // 1 hour
  const refreshExpiryMs = nowMs + 7 * 24 * 3600 * 1000; // 7 days

  const expired_at = new Date(accessExpiryMs).toISOString() as string &
    tags.Format<"date-time">;
  const refreshable_until = new Date(refreshExpiryMs).toISOString() as string &
    tags.Format<"date-time">;

  // Generate new access token
  const accessToken = jwt.sign(
    { id: user.id, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate new refresh token
  const refreshToken = jwt.sign(
    { id: user.id, type: "member", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: user.id,
    internal_sender_id: user.internal_sender_id,
    nickname: user.nickname,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
