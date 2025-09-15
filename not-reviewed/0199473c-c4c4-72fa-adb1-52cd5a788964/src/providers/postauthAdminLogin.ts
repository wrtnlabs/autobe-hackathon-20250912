import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Authenticate admin user and issue JWT tokens for chatbot_admins table.
 *
 * This API operation verifies the admin user by matching internal_sender_id and
 * nickname with an existing active record (deleted_at = null). On successful
 * authentication, it generates JWT access and refresh tokens with appropriate
 * expiry times and returns authorized admin info along with tokens.
 *
 * This is a public endpoint and does not require existing authentication.
 *
 * @param props - Object containing admin payload and login credentials
 * @param props.admin - The admin payload (not used for login, but required by
 *   signature)
 * @param props.body - The admin login credentials including internal_sender_id
 *   and nickname
 * @returns The authorized admin user info and JWT tokens
 * @throws {Error} Throws error if credentials are invalid
 */
export async function postauthAdminLogin(props: {
  admin: AdminPayload;
  body: IChatbotAdmin.ILogin;
}): Promise<IChatbotAdmin.IAuthorized> {
  const { body } = props;

  const admin = await MyGlobal.prisma.chatbot_admins.findFirst({
    where: {
      internal_sender_id: body.internal_sender_id,
      nickname: body.nickname,
      deleted_at: null,
    },
  });

  if (!admin) throw new Error("Invalid credentials");

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      id: admin.id,
      internal_sender_id: admin.internal_sender_id,
      nickname: admin.nickname,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiry times as ISO strings
  const currentTimestamp = Date.now();
  const expiredAt = toISOStringSafe(new Date(currentTimestamp + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(currentTimestamp + 7 * 24 * 3600 * 1000),
  );

  return {
    id: admin.id,
    internal_sender_id: admin.internal_sender_id,
    nickname: admin.nickname,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
