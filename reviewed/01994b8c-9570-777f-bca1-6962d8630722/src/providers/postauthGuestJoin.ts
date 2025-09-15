import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Registers a new guest user account with unique email and issues temporary JWT
 * tokens.
 *
 * This function does:
 *
 * - Checks for duplicate guest email in the database.
 * - Creates a new guest record with generated UUID and timestamps.
 * - Issues access and refresh JWT tokens with guest payload.
 * - Returns authorized guest structure including tokens and token info.
 *
 * @param props - An object containing guest payload and create data
 * @returns Authorized guest with tokens
 * @throws Error if guest email already exists
 */
export async function postauthGuestJoin(props: {
  guest: GuestPayload;
  body: ISubscriptionRenewalGuardianGuest.ICreate;
}): Promise<ISubscriptionRenewalGuardianGuest.IAuthorized> {
  const { body } = props;

  // Check for duplicate email
  const existingGuest =
    await MyGlobal.prisma.subscription_renewal_guardian_guest.findFirst({
      where: {
        email: body.email,
      },
    });
  if (existingGuest !== null) {
    throw new Error("Guest email already registered");
  }

  // Generate new id and timestamps
  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  // Create guest record
  const created =
    await MyGlobal.prisma.subscription_renewal_guardian_guest.create({
      data: {
        id: newId,
        email: body.email,
        created_at: now,
        updated_at: now,
      },
    });

  // Prepare JWT payload
  const payload = {
    id: created.id,
    type: "guest" as const,
  };

  // Calculate expiration timestamps
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  );

  // Create JWT tokens
  const access_token = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh_token = jwt.sign(
    { id: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized guest with tokens and expiration
  return {
    id: created.id,
    access_token,
    refresh_token,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
