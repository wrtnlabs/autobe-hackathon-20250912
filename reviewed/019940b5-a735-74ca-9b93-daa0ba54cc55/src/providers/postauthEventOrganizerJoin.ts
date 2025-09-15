import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Registers a new event organizer user.
 *
 * This endpoint allows public registration for event organizers by providing
 * email, password_hash (hashed password), full name, and optional phone number
 * and profile picture URL. The email must be unique.
 *
 * Upon successful registration, JWT access and refresh tokens are issued.
 *
 * @param props - The registration parameters including the request body.
 * @param props.body - Registration details for the event organizer user.
 * @returns The authorized event organizer data including JWT tokens.
 * @throws {Error} When the email is already registered.
 */
export async function postauthEventOrganizerJoin(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationEventOrganizer.ICreate;
}): Promise<IEventRegistrationEventOrganizer.IAuthorized> {
  const { body } = props;

  const existing =
    await MyGlobal.prisma.event_registration_event_organizers.findUnique({
      where: { email: body.email },
    });
  if (existing) {
    throw new Error(`Email already registered: ${body.email}`);
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const created =
    await MyGlobal.prisma.event_registration_event_organizers.create({
      data: {
        id,
        email: body.email,
        password_hash: body.password_hash,
        full_name: body.full_name,
        phone_number: body.phone_number ?? null,
        profile_picture_url: body.profile_picture_url ?? null,
        email_verified: body.email_verified,
        created_at: now,
        updated_at: now,
      },
    });

  const accessExpiredAt = new Date(Date.now() + 3600 * 1000);
  const refreshExpiredAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const accessExpiredAtISO = toISOStringSafe(accessExpiredAt);
  const refreshExpiredAtISO = toISOStringSafe(refreshExpiredAt);

  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "eventOrganizer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    full_name: created.full_name,
    phone_number: created.phone_number ?? null,
    profile_picture_url: created.profile_picture_url ?? null,
    email_verified: created.email_verified,
    created_at: now,
    updated_at: now,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAtISO,
      refreshable_until: refreshExpiredAtISO,
    },
  };
}
