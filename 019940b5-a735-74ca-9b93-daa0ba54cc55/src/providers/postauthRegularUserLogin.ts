import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Authenticate a regular user using their email and password hash.
 *
 * This endpoint validates the credentials against the
 * event_registration_regular_users table. It ensures that the email exists, the
 * password hash matches, and the email is verified. If successful, it issues
 * JWT access and refresh tokens.
 *
 * @param props - Object containing the authenticated regular user payload and
 *   login body.
 * @param props.regularUser - The authenticated regular user payload (not used
 *   here but included for contract).
 * @param props.body - Object containing email and password_hash for login.
 * @returns The authorized regular user object including tokens and user
 *   details.
 * @throws {Error} When credentials are invalid or email is not verified.
 */
export async function postauthRegularUserLogin(props: {
  regularUser: RegularuserPayload;
  body: IEventRegistrationRegularUser.ILogin;
}): Promise<IEventRegistrationRegularUser.IAuthorized> {
  const { body } = props;

  const user =
    await MyGlobal.prisma.event_registration_regular_users.findUnique({
      where: { email: body.email },
    });

  if (!user) throw new Error("Invalid credentials");

  const passwordValid = await MyGlobal.password.verify(
    body.password_hash,
    user.password_hash,
  );

  if (!passwordValid) throw new Error("Invalid credentials");

  if (!user.email_verified) throw new Error("Email not verified");

  const now = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
    {
      id: user.id,
      type: "regularUser",
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

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    full_name: user.full_name,
    phone_number: user.phone_number ?? null,
    profile_picture_url: user.profile_picture_url ?? null,
    email_verified: user.email_verified,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
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
