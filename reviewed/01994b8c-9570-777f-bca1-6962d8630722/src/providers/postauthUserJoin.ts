import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * User registration operation for role 'user' to create a new user account with
 * email and password hash. This operation ensures secure authentication upon
 * successful account creation by issuing JWT tokens. Access is public without
 * prior authentication.
 *
 * @param props - Object containing the user payload and registration data
 *   (email and password hash).
 * @param props.user - The authenticated user payload initiating the request
 *   (not used here but part of the signature).
 * @param props.body - The registration data including unique email and
 *   plaintext password to hash.
 * @returns Authorization information including the newly created user details
 *   and JWT tokens.
 * @throws {Error} When the email is already registered.
 */
export async function postauthUserJoin(props: {
  user: UserPayload;
  body: ISubscriptionRenewalGuardianUser.ICreate;
}): Promise<ISubscriptionRenewalGuardianUser.IAuthorized> {
  const { body } = props;

  const existingUser =
    await MyGlobal.prisma.subscription_renewal_guardian_user.findUnique({
      where: { email: body.email },
    });

  if (existingUser) {
    throw new Error(`User with email ${body.email} already exists.`);
  }

  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  const newUserId = v4() as string & tags.Format<"uuid">;

  const now = toISOStringSafe(new Date());

  const createdUser =
    await MyGlobal.prisma.subscription_renewal_guardian_user.create({
      data: {
        id: newUserId,
        email: body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
      },
    });

  const accessToken = jwt.sign(
    {
      userId: createdUser.id,
      email: createdUser.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: createdUser.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600000),
  );

  return {
    id: createdUser.id,
    email: createdUser.email,
    password_hash: createdUser.password_hash,
    created_at: now,
    updated_at: now,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
