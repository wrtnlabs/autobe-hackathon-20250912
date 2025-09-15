import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * User login operation for role 'user' that validates credentials and returns
 * JWT tokens upon success.
 *
 * This endpoint authenticates the user by email and password, verifying
 * credentials against stored records in the subscription_renewal_guardian_user
 * table. On successful authentication, it issues JWT access and refresh tokens
 * with defined expiration and issuer claims.
 *
 * @param props - Object containing the authenticated user payload and login
 *   credentials.
 * @param props.user - The authenticated user payload (not used in this login
 *   operation but required by props signature).
 * @param props.body - User login credentials containing email and password
 *   hash.
 * @returns Authorization information including user details and JWT tokens.
 * @throws {Error} Throws "Invalid credentials" if authentication fails due to
 *   non-existent user or password mismatch.
 */
export async function postauthUserLogin(props: {
  user: UserPayload;
  body: ISubscriptionRenewalGuardianUser.ILogin;
}): Promise<ISubscriptionRenewalGuardianUser.IAuthorized> {
  const { body } = props;

  // Fetch user from DB by email
  const user =
    await MyGlobal.prisma.subscription_renewal_guardian_user.findFirst({
      where: { email: body.email },
    });

  if (!user) throw new Error("Invalid credentials");

  // Verify password
  const isValid = await MyGlobal.password.verify(
    body.password_hash,
    user.password_hash,
  );
  if (!isValid) throw new Error("Invalid credentials");

  // Compute token expiration timestamps
  const now = Date.now();
  const accessExpired = toISOStringSafe(new Date(now + 3600 * 1000)); // 1 hour from now
  const refreshExpired = toISOStringSafe(new Date(now + 7 * 24 * 3600 * 1000)); // 7 days from now

  // Generate JWT access token
  const access = jwt.sign(
    { id: user.id, email: user.email },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  // Generate JWT refresh token
  const refresh = jwt.sign(
    { id: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Return authorized user info with tokens
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access,
      refresh,
      expired_at: accessExpired,
      refreshable_until: refreshExpired,
    },
  };
}
