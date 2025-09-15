import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Authenticate an event organizer user by email and password.
 *
 * This function verifies the user's existence, ensures the email is verified,
 * and validates the password against the stored hash using MyGlobal.password.
 * Upon success, it generates JWT access and refresh tokens for API access.
 *
 * @param props - Object containing the eventOrganizer payload and login body
 * @param props.eventOrganizer - The event organizer payload initiating login
 * @param props.body - The login credentials including email and password_hash
 * @returns The authorized event organizer user data with JWT tokens
 * @throws {Error} If credentials are invalid or email is not verified
 */
export async function postauthEventOrganizerLogin(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationEventOrganizer.ILogin;
}): Promise<IEventRegistrationEventOrganizer.IAuthorized> {
  const { body } = props;

  // Fetch user by email
  const user =
    await MyGlobal.prisma.event_registration_event_organizers.findUnique({
      where: { email: body.email },
    });

  if (!user || !user.email_verified) {
    throw new Error("Invalid credentials");
  }

  // Verify password using MyGlobal password service
  const isValid = await MyGlobal.password.verify(
    body.password_hash,
    user.password_hash,
  );
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const nowISOString = toISOStringSafe(new Date());

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "eventOrganizer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
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
    phone_number: user.phone_number === null ? null : user.phone_number,
    profile_picture_url:
      user.profile_picture_url === null ? null : user.profile_picture_url,
    email_verified: user.email_verified,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(
        new Date(Date.now() + 3600 * 1000), // 1 hour later
      ),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days later
      ),
    },
  };
}
