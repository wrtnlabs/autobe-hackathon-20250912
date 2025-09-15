import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Refresh JWT authorization tokens using a refresh token for an event organizer
 * user.
 *
 * This endpoint validates the provided refresh token, ensures the event
 * organizer user exists, and issues new JWT access and refresh tokens following
 * the same payload structures as initial login/join operations.
 *
 * @param props - Object containing eventOrganizer authentication payload and
 *   request body with refresh token.
 * @param props.eventOrganizer - The authenticated event organizer payload (not
 *   used directly in this operation).
 * @param props.body - Request body containing the refresh token string.
 * @returns Authorized event organizer user data with newly issued JWT tokens.
 * @throws {Error} If the refresh token is invalid, expired, or if the user is
 *   not found.
 */
export async function postauthEventOrganizerRefresh(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationEventOrganizer.IRefresh;
}): Promise<IEventRegistrationEventOrganizer.IAuthorized> {
  const { body } = props;

  // Verify the refresh token and decode payload
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string; type: string };

  if (decoded.type !== "eventOrganizer") {
    throw new Error("Invalid token type");
  }

  // Fetch the event organizer user by ID
  const organizer =
    await MyGlobal.prisma.event_registration_event_organizers.findUnique({
      where: { id: decoded.id },
    });

  if (!organizer) {
    throw new Error("Event organizer user not found");
  }

  // Generate new access token with same payload structure
  const accessPayload = {
    id: organizer.id,
    email: organizer.email,
    full_name: organizer.full_name,
    email_verified: organizer.email_verified,
    type: "eventOrganizer" as const,
  };

  const newAccessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Generate new refresh token (rotated)
  const newRefreshToken = jwt.sign(
    { id: organizer.id, type: "eventOrganizer", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Prepare datetime fields to string & tags.Format<'date-time'>
  const createdAt = toISOStringSafe(organizer.created_at);
  const updatedAt = toISOStringSafe(organizer.updated_at);

  // Prepare token expiry timestamps
  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Return authorized user info with new tokens
  return {
    id: organizer.id,
    email: organizer.email,
    password_hash: organizer.password_hash,
    full_name: organizer.full_name,
    phone_number: organizer.phone_number ?? undefined,
    profile_picture_url: organizer.profile_picture_url ?? undefined,
    email_verified: organizer.email_verified,
    created_at: createdAt,
    updated_at: updatedAt,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
