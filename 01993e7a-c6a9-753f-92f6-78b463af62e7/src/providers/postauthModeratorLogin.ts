import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Authenticate a moderator user and issue JWT tokens upon successful login.
 *
 * This endpoint accepts moderator login credentials, verifies the user's email
 * and password against the stored hash in the database, and ensures the account
 * is not soft-deleted. Upon successful validation, generates JWT access and
 * refresh tokens with defined expiration, and returns authorized moderator user
 * information along with tokens.
 *
 * @param props - Object containing moderator authentication payload and login
 *   request body.
 * @param props.moderator - The ModeratorPayload context (not used here but
 *   required by signature).
 * @param props.body - The login credentials containing email and password hash.
 * @returns The authenticated moderator user data including JWT tokens.
 * @throws {Error} Throws error when email not found, password is invalid, or
 *   account is deleted.
 */
export async function postauthModeratorLogin(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingModerator.ILogin;
}): Promise<IRecipeSharingModerator.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.recipe_sharing_moderators.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isValid = await MyGlobal.password.verify(
    body.password_hash,
    user.password_hash,
  );
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  const issuedAt = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    username: user.username,
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
