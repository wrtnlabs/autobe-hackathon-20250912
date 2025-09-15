import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Registers a new administrator user in the FlexOffice system.
 *
 * This function verifies the uniqueness of the email, securely hashes the
 * provided plaintext password, creates a new admin record with timestamp
 * fields, and generates JWT access and refresh tokens with appropriate
 * expiration times.
 *
 * @param props - Object containing admin payload and creation details
 * @param props.admin - The authenticated admin performing the registration
 *   (present due to auth role)
 * @param props.body - The data required to create a new admin user (email and
 *   password)
 * @returns The newly authorized admin object including JWT tokens
 * @throws {Error} Throws an error if the email already exists
 */
export async function postauthAdminJoin(props: {
  admin: AdminPayload;
  body: IFlexOfficeAdmin.ICreate;
}): Promise<IFlexOfficeAdmin.IAuthorized> {
  const { body } = props;

  // Verify email uniqueness
  const existingAdmin = await MyGlobal.prisma.flex_office_admins.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (existingAdmin) throw new Error("Email already registered");

  // Hash plaintext password
  const passwordHash = await MyGlobal.password.hash(body.password);

  // Generate UUID for new admin
  const id = v4() as string & tags.Format<"uuid">;

  // Current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Create admin record
  const created = await MyGlobal.prisma.flex_office_admins.create({
    data: {
      id,
      email: body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    },
  });

  // Calculate expirations as ISO strings
  const accessExpiredAt = new Date(
    Date.now() + 3600 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshableUntil = new Date(
    Date.now() + 7 * 24 * 3600 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
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

  return {
    id: created.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
