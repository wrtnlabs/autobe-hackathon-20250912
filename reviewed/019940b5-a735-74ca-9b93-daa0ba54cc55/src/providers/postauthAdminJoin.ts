import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new admin user account.
 *
 * Allows an authenticated admin to register a new admin user. Ensures unique
 * email constraint is enforced by database. Stores all required and optional
 * admin fields. Generates JWT access and refresh tokens upon successful
 * creation.
 *
 * @param props - Object containing authenticated admin and admin creation body
 * @param props.admin - The authenticated admin performing this operation
 * @param props.body - The creation payload for the new admin user
 * @returns The newly created admin user with authorization tokens
 * @throws {Error} Throws if email already exists or creation fails
 */
export async function postauthAdminJoin(props: {
  admin: AdminPayload;
  body: IEventRegistrationAdmin.ICreate;
}): Promise<IEventRegistrationAdmin.IAuthorized> {
  const { body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const refreshExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  const created = await MyGlobal.prisma.event_registration_admins.create({
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

  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + refreshExpiryMs),
  );

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    full_name: created.full_name,
    phone_number: created.phone_number ?? null,
    profile_picture_url: created.profile_picture_url ?? null,
    email_verified: created.email_verified,
    created_at: created.created_at,
    updated_at: created.updated_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: now,
      refreshable_until: refreshableUntil,
    },
  };
}
