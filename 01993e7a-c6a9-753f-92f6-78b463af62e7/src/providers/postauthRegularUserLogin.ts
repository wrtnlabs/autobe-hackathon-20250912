import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Log in an existing regularUser by validating email and password hash against
 * recipe_sharing_regularusers records. Upon successful authentication, issue
 * JWT access and refresh tokens for the session.
 *
 * @param props - Object containing regular user payload and login credentials
 * @param props.regularUser - The payload of the regular user making the login
 *   request (not authenticated yet)
 * @param props.body - The login credentials containing email and password hash
 * @returns Authorized regular user object including JWT tokens
 * @throws {Error} When credentials are invalid or user is not found
 */
export async function postauthRegularUserLogin(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRegularUser.ILogin;
}): Promise<IRecipeSharingRegularUser.IAuthorized> {
  const { body } = props;

  // Find user that matches email and is not soft-deleted
  const user = await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
    where: { email: body.email, deleted_at: null },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Verify the provided password hash matches the stored one securely
  const isPasswordValid = await MyGlobal.password.verify(
    body.password_hash,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  // Generate access and refresh tokens
  const accessToken = jwt.sign(
    { id: user.id, type: "regularuser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: "regularuser", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Calculate expiration timestamps as ISO strings
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 3600 * 1000),
  );

  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    password_hash: user.password_hash,
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
