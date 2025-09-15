import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Login operation for viewers authenticating credentials and issuing JWT access
 * tokens.
 *
 * This endpoint validates the viewer user's email and password against the
 * flex_office_viewers table, ensuring the user is active (not soft deleted). On
 * successful authentication, it issues JWT access and refresh tokens embedding
 * the viewer role.
 *
 * Unauthorized or invalid login attempts will result in errors.
 *
 * @param props - Contains viewer payload (not used) and login credentials.
 * @param props.viewer - Authenticated viewer payload (not used in login).
 * @param props.body - Login credentials for viewer authentication.
 * @returns Authorized viewer login result with JWT tokens and expiry
 *   timestamps.
 * @throws {Error} When the user is not found or the password is invalid.
 */
export async function postauthViewerLogin(props: {
  viewer: ViewerPayload;
  body: IFlexOfficeViewer.ILogin;
}): Promise<IFlexOfficeViewer.IAuthorized> {
  const { body } = props;

  // Find active viewer by email
  const user = await MyGlobal.prisma.flex_office_viewers.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!user) throw new Error("Invalid credentials");

  // Verify password
  const isValid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );
  if (!isValid) throw new Error("Invalid credentials");

  // Current time and token expiries as ISO strings
  const now = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Generate access token
  const accessToken = jwt.sign(
    {
      id: user.id,
      type: "viewer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      id: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
