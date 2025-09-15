import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new admin user in the chatbot system.
 *
 * This operation registers a new admin with the provided internal sender ID and
 * nickname. It checks for duplicate internal_sender_id to prevent conflicts.
 * Upon successful creation, it returns the admin data along with JWT tokens for
 * authentication.
 *
 * @param props - Object containing the admin registration information
 * @param props.admin - Auth payload for admin (not used here since this is a
 *   join operation)
 * @param props.body - Registration information including internal_sender_id and
 *   nickname
 * @returns The newly created admin user with authorization token
 * @throws {Error} If an admin with the same internal_sender_id already exists
 */
export async function postauthAdminJoin(props: {
  admin: AdminPayload;
  body: IChatbotAdmin.ICreate;
}): Promise<IChatbotAdmin.IAuthorized> {
  const { body } = props;

  // Check for existing admin with the same internal_sender_id
  const existing = await MyGlobal.prisma.chatbot_admins.findFirst({
    where: { internal_sender_id: body.internal_sender_id, deleted_at: null },
  });
  if (existing) {
    throw new Error("Duplicate internal_sender_id");
  }

  // Generate new ID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create new admin record
  const created = await MyGlobal.prisma.chatbot_admins.create({
    data: {
      id,
      internal_sender_id: body.internal_sender_id,
      nickname: body.nickname,
      created_at: now,
      updated_at: now,
    },
  });

  // Prepare token expiration timestamps
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1 hour
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7 days

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      { id: created.id, type: "admin" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      { id: created.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  // Return the created admin user with token
  return {
    id: created.id as string & tags.Format<"uuid">,
    internal_sender_id: created.internal_sender_id,
    nickname: created.nickname,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token,
  };
}
