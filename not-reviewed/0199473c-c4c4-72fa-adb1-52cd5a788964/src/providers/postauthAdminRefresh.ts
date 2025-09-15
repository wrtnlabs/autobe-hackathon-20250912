import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Refresh JWT tokens for authenticated admin users in chatbot_admins table.
 *
 * This endpoint refreshes authentication tokens for an admin user with a valid
 * refresh token. It verifies the refresh token, validates the admin user
 * existence, and issues new access and refresh tokens.
 *
 * @param props - Contains the authenticated admin payload and the refresh token
 *   body
 * @param props.admin - The authenticated admin payload
 * @param props.body - Object containing the refresh_token string
 * @returns The authorized admin including their latest JWT tokens
 * @throws {Error} Throws when the refresh token is invalid or expired
 * @throws {Error} Throws when the admin user is not found in the system
 */
export async function postauthAdminRefresh(props: {
  admin: AdminPayload;
  body: IChatbotAdmin.IRefresh;
}): Promise<IChatbotAdmin.IAuthorized> {
  const { body } = props;

  // Verify the refresh token and decode its payload
  let decoded: { id: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string };
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }

  // Find the admin user by decoded ID, throws if not found
  const admin = await MyGlobal.prisma.chatbot_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });

  // Get current ISO date-time string for token expiration tracking
  const now = toISOStringSafe(new Date());

  // Generate new access token with same payload structure
  const accessToken = jwt.sign(
    {
      id: admin.id,
      internal_sender_id: admin.internal_sender_id,
      nickname: admin.nickname,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );

  // Generate new refresh token with tokenType 'refresh'
  const refreshToken = jwt.sign(
    {
      id: admin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );

  // Return the authorized admin data with new tokens
  return {
    id: admin.id as string & tags.Format<"uuid">,
    internal_sender_id: admin.internal_sender_id,
    nickname: admin.nickname,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: now,
      refreshable_until: now,
    },
  };
}
