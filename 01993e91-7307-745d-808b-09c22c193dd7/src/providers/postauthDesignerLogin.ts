import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Designer user login operation (task_management_designer)
 *
 * Authenticates an existing Designer user by verifying email and password
 * credentials stored in the 'task_management_designer' table. Only active
 * (non-deleted) users can successfully login.
 *
 * Upon successful authentication, returns the authorized Designer profile along
 * with JWT access and refresh tokens.
 *
 * This endpoint is publicly accessible to initiate sessions.
 *
 * @param props - Object containing the login request body with email and
 *   password.
 * @returns The authorized Designer profile and authentication tokens.
 * @throws {Error} Throws if credentials are invalid or user is deleted.
 */
export async function postauthDesignerLogin(props: {
  body: ITaskManagementDesigner.ILogin;
}): Promise<ITaskManagementDesigner.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.task_management_designer.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!user) throw new Error("Invalid credentials");

  const isValid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );
  if (!isValid) throw new Error("Invalid credentials");

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "designer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
