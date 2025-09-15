import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Authenticate existing member user credentials and issue JWT access tokens.
 *
 * This function takes the member login credentials from the request body,
 * verifies the existence and non-deletion of the member in the database, and
 * issues JWT tokens accordingly.
 *
 * @param props - Object containing member login credentials.
 * @param props.member - The member payload initiating the login (not used here
 *   but required).
 * @param props.body - Login credentials including internal_sender_id and
 *   nickname.
 * @returns Authorized member information along with JWT tokens.
 * @throws {Error} When credentials are invalid or member does not exist.
 */
export async function postauthMemberLogin(props: {
  member: MemberPayload;
  body: IChatbotMember.ILogin;
}): Promise<IChatbotMember.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.chatbot_members.findFirst({
    where: {
      internal_sender_id: body.internal_sender_id,
      nickname: body.nickname,
      deleted_at: null,
    },
  });

  if (user === null) {
    throw new Error("Invalid credentials");
  }

  const nowISO = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
    {
      userId: user.id,
      internal_sender_id: user.internal_sender_id,
      nickname: user.nickname,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
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
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
