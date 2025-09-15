import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Authenticate a FlexOffice admin user by verifying email and password
 * credentials.
 *
 * This function locates the admin user by email who is active (not soft
 * deleted), verifies the password using the global password utility, and issues
 * JWT access and refresh tokens with specified expiration.
 *
 * @param props - Contains the admin metadata and login credentials.
 * @param props.admin - The admin payload making the request (not used for auth
 *   here).
 * @param props.body - The login credential containing email and password.
 * @returns The admin ID and authorization tokens including access and refresh
 *   tokens with expiration times.
 * @throws {Error} Throws "Invalid email or password" if authentication fails.
 */
export async function postauthAdminLogin(props: {
  admin: AdminPayload;
  body: IFlexOfficeAdmin.ILogin;
}): Promise<IFlexOfficeAdmin.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.flex_office_admins.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const validPassword = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );

  if (!validPassword) {
    throw new Error("Invalid email or password");
  }

  const now = new Date();

  const expiredAt = toISOStringSafe(new Date(now.getTime() + 60 * 60 * 1000)); // 1 hour later
  const refreshableUntil = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days later

  const accessToken = jwt.sign(
    { id: user.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: "admin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
