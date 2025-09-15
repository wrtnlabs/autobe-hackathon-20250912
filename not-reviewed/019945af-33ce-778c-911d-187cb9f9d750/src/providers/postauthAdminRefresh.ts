import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Refresh JWT tokens for an authenticated FlexOffice admin user.
 *
 * Verifies the provided refresh token, ensures the admin user exists and is
 * active, and returns newly issued access and refresh tokens with expiration
 * timestamps.
 *
 * @param props - Object containing the admin payload and refresh token request
 *   body
 * @param props.admin - The authenticated admin making the refresh request
 * @param props.body - The request payload containing the refresh token
 * @returns The authorized admin object with new JWTs and expiration info
 * @throws {Error} Throws if refresh token is invalid, expired, or if admin user
 *   is not found
 */
export async function postauthAdminRefresh(props: {
  admin: AdminPayload;
  body: IFlexOfficeAdmin.IRefresh;
}): Promise<IFlexOfficeAdmin.IAuthorized> {
  const { body } = props;

  // Step 1: Verify the refresh token
  let decodedToken: {
    id: string & tags.Format<"uuid">;
    type: "admin";
  };

  try {
    decodedToken = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string & tags.Format<"uuid">;
      type: string;
    };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  // Step 2: Find the admin user that matches the token subject and is not soft deleted
  const adminUser = await MyGlobal.prisma.flex_office_admins.findFirst({
    where: {
      id: decodedToken.id,
      deleted_at: null,
    },
  });

  if (!adminUser) {
    throw new Error("Admin user not found");
  }

  // Step 3: Generate new access token with the same payload
  const now = toISOStringSafe(new Date());

  // Calculate expiration timestamps
  const accessExpireTimestamp = new Date(
    Date.now() + 3600 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpireTimestamp = new Date(
    Date.now() + 7 * 24 * 3600 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  // Generate access token
  const newAccessToken = jwt.sign(
    {
      id: adminUser.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate refresh token
  const newRefreshToken = jwt.sign(
    {
      id: adminUser.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return the authorized admin with tokens and expiry info
  return {
    id: adminUser.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpireTimestamp,
      refreshable_until: refreshExpireTimestamp,
    },
  };
}
