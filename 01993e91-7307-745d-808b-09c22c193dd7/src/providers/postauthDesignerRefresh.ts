import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Refresh JWT tokens for Designer user (task_management_designer).
 *
 * This operation validates the refresh token from the request body, ensures it
 * belongs to an existing Designer user, and generates new JWT access and
 * refresh tokens. It returns the user's profile information along with the new
 * tokens, enabling seamless session continuation without re-authentication.
 *
 * @param props - Object containing the refresh token in the request body
 * @returns New authorization object with updated token info and user profile
 * @throws {Error} If the refresh token is invalid, expired, or user not found
 */
export async function postauthDesignerRefresh(props: {
  body: ITaskManagementDesigner.IRefresh;
}): Promise<ITaskManagementDesigner.IAuthorized> {
  const { body } = props;

  let decoded;
  try {
    decoded = jwt.verify(body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  // Ensure decoded contains id and type "designer"
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as any).id !== "string" ||
    (decoded as any).type !== "designer"
  ) {
    throw new Error("Invalid token payload");
  }

  const user = await MyGlobal.prisma.task_management_designer.findUniqueOrThrow(
    { where: { id: (decoded as any).id } },
  );

  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const access = jwt.sign(
    { id: user.id, email: user.email, name: user.name, type: "designer" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    { id: user.id, type: "designer", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    name: user.name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
