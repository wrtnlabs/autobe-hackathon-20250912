import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Registers a new administrator account securely.
 *
 * This endpoint creates a new admin in the subscription_renewal_guardian_admin
 * table, enforcing unique email and hashing the password before storage. It
 * returns JWT tokens for authentication purposes.
 *
 * @param props - The input props including admin payload and create data
 * @param props.admin - AdminPayload representing the authenticated admin
 *   context
 * @param props.body - Data for admin creation complying with
 *   ISubscriptionRenewalGuardianAdmin.ICreate
 * @returns The authorized admin data including JWT token information
 * @throws {Error} When the provided email is already registered
 */
export async function postauthAdminJoin(props: {
  admin: AdminPayload;
  body: ISubscriptionRenewalGuardianAdmin.ICreate;
}): Promise<ISubscriptionRenewalGuardianAdmin.IAuthorized> {
  const { admin, body } = props;

  // Ensure email is unique
  const existing =
    await MyGlobal.prisma.subscription_renewal_guardian_admin.findUnique({
      where: { email: body.email },
    });
  if (existing !== null) {
    throw new Error("Email already exists");
  }

  // Hash the password safely
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Generate required UUID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the new admin record
  const created =
    await MyGlobal.prisma.subscription_renewal_guardian_admin.create({
      data: {
        id,
        email: body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
      },
    });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    { adminId: created.id, email: created.email, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { adminId: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Compute token expiration timestamps
  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600000),
  );

  // Return the newly authorized admin info
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    created_at: created.created_at,
    updated_at: created.updated_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
