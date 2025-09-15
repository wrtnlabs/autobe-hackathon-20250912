import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Refreshes JWT tokens for a regular user using a valid refresh token.
 *
 * This operation verifies the provided refresh token, fetches the user record,
 * generates a new access token with the same payload as the original login
 * token, and returns the user data along with updated authorization tokens.
 *
 * The refresh token from the request is reused (no rotation) as per test
 * expectations.
 *
 * @param props - Object containing the authenticated regular user and request
 *   body
 * @param props.regularUser - The authenticated regular user payload (not
 *   directly used here)
 * @param props.body - Request body containing the refresh token
 * @returns The authorized user information including fresh JWT tokens
 * @throws {Error} If the refresh token is invalid or user is not found
 */
export async function postauthRegularUserRefresh(props: {
  regularUser: RegularuserPayload;
  body: IEventRegistrationRegularUser.IRefresh;
}): Promise<IEventRegistrationRegularUser.IAuthorized> {
  const { body } = props;

  // Verify and decode the refresh token
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string; type: string };

  // Find the user by the decoded id
  const user =
    await MyGlobal.prisma.event_registration_regular_users.findUnique({
      where: { id: decoded.id },
    });

  if (!user) {
    throw new Error("User not found");
  }

  // Generate a new access token with the same payload structure
  const newAccessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone_number: user.phone_number,
      profile_picture_url: user.profile_picture_url,
      email_verified: user.email_verified,
      type: "regularUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Prepare expiration timestamps
  const now = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1 hour later
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7 days later

  // Return the authorized user data with new tokens
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    full_name: user.full_name,
    phone_number: user.phone_number ?? undefined,
    profile_picture_url: user.profile_picture_url ?? undefined,
    email_verified: user.email_verified,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: newAccessToken,
      refresh: body.refresh_token, // reuse existing refresh token
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
