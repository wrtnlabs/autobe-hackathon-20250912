import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Registers a new guest user account in the Enterprise LMS system.
 *
 * This operation allows guest users to self-register temporary accounts with no
 * enrollment permissions but browsing capabilities within the LMS.
 *
 * The process includes duplicate email check within the tenant scope, secure
 * hashing of the provided password, creation of the guest user record, and
 * issuance of JWT access and refresh tokens for session management.
 *
 * @param props - Object containing guest user registration details
 * @param props.guest - The guest payload (not directly used in this operation)
 * @param props.body - Registration input data conforming to
 *   IEnterpriseLmsGuest.ICreate
 * @returns The created guest user information including authorization tokens
 * @throws {Error} When the email is already registered within the tenant
 */
export async function postauthGuestJoin(props: {
  guest: GuestPayload;
  body: IEnterpriseLmsGuest.ICreate;
}): Promise<IEnterpriseLmsGuest.IAuthorized> {
  const { body } = props;

  // Check duplicate email for tenant
  const existing = await MyGlobal.prisma.enterprise_lms_guest.findFirst({
    where: {
      tenant_id: body.tenant_id,
      email: body.email,
      deleted_at: null,
    },
  });
  if (existing) throw new Error("Email already registered for this tenant");

  // Hash password
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Generate UUID for new guest
  const newId = v4() as string & tags.Format<"uuid">;

  // Prepare timestamp
  const now = toISOStringSafe(new Date());

  // Create new guest user
  const created = await MyGlobal.prisma.enterprise_lms_guest.create({
    data: {
      id: newId,
      tenant_id: body.tenant_id,
      email: body.email,
      password_hash: hashedPassword,
      first_name: body.first_name,
      last_name: body.last_name,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Token expiration times
  const accessExpire = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1 hour
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7 days

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: created.id,
      type: "guest",
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
      id: created.id,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized guest user data
  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
    access_token: accessToken,
    refresh_token: refreshToken,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpire,
      refreshable_until: refreshExpire,
    },
  };
}
