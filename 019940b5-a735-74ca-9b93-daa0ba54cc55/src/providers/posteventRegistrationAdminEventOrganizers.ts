import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new event organizer account.
 *
 * This operation inserts a new record into the
 * event_registration_event_organizers table with the provided creation data. It
 * sets required fields such as id (UUID), email, password_hash, full_name,
 * email_verified and optional fields phone_number and profile_picture_url.
 * Timestamps for created_at and updated_at are set to the current date-time.
 *
 * This endpoint is restricted to admin users.
 *
 * @param props - Object containing the authenticated admin and the body data
 *   for creation
 * @param props.admin - The authenticated admin performing the creation
 * @param props.body - The data to create the new event organizer
 * @returns The full created event organizer record including timestamps
 * @throws {Error} If the creation fails due to database or validation errors
 */
export async function posteventRegistrationAdminEventOrganizers(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventOrganizer.ICreate;
}): Promise<IEventRegistrationEventOrganizer> {
  const { admin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const phone_number =
    body.phone_number === undefined ? null : body.phone_number;
  const profile_picture_url =
    body.profile_picture_url === undefined ? null : body.profile_picture_url;

  const created =
    await MyGlobal.prisma.event_registration_event_organizers.create({
      data: {
        id,
        email: body.email,
        password_hash: body.password_hash,
        full_name: body.full_name,
        phone_number,
        profile_picture_url,
        email_verified: body.email_verified,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    email: created.email,
    password_hash: created.password_hash,
    full_name: created.full_name,
    phone_number: created.phone_number ?? null,
    profile_picture_url: created.profile_picture_url ?? null,
    email_verified: created.email_verified,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
