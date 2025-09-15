import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";

/**
 * Authenticate an existing authenticatedUser using external_user_id and email
 * as mapped from the Spring backend. Issues a session token (JWT) if the user
 * exists, is not soft deleted, and the credentials match.
 *
 * - Only users present in `storyfield_ai_authenticatedusers` with a null
 *   `deleted_at` (active) can log in.
 * - Issues access and refresh JWT tokens with proper claims, expiration, and
 *   issuer 'autobe'.
 * - All audit, trace, and session state is strictly determined by table content;
 *   no password or challenge/response is performed.
 *
 * @param props - Login request props
 * @param props.body - Contains the external_user_id and email for login mapping
 * @returns IStoryfieldAiAuthenticatedUser.IAuthorized session object with
 *   tokens if successful
 * @throws {Error} If credentials are invalid or user is soft deleted
 */
export async function postauthAuthenticatedUserLogin(props: {
  body: IStoryfieldAiAuthenticatedUser.ILogin;
}): Promise<IStoryfieldAiAuthenticatedUser.IAuthorized> {
  const { external_user_id, email } = props.body;
  // Query for user with exact credentials and soft-delete check
  const user = await MyGlobal.prisma.storyfield_ai_authenticatedusers.findFirst(
    {
      where: {
        external_user_id,
        email,
        deleted_at: null,
      },
      select: {
        id: true,
        external_user_id: true,
        email: true,
        actor_type: true,
        created_at: true,
        updated_at: true,
      },
    },
  );
  if (!user)
    throw new Error(
      "Invalid login: user not found or credentials are incorrect, or user is soft deleted.",
    );

  // Build payload for JWT access/refresh tokens
  const jwtPayload = {
    id: user.id,
    type: "authenticatedUser",
  };

  // Access: 1 hour; Refresh: 7 days
  // Calculate future expiration as ISO string without using Date directly in type
  const nowValue = toISOStringSafe(new Date());

  // 1 hour = 3600*1000ms; 7 days = 7*24*3600*1000ms
  // Compute future expires
  const expiresAtValue = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiresAtValue = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Generate JWT tokens
  const accessToken = await new Promise<string>((resolve, reject) => {
    jwt.sign(
      jwtPayload,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
      (err, token) => {
        if (err || typeof token !== "string")
          reject(err ?? new Error("Failed to sign token"));
        else resolve(token);
      },
    );
  });
  const refreshToken = await new Promise<string>((resolve, reject) => {
    jwt.sign(
      { ...jwtPayload, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
      (err, token) => {
        if (err || typeof token !== "string")
          reject(err ?? new Error("Failed to sign refresh token"));
        else resolve(token);
      },
    );
  });

  return {
    id: user.id,
    external_user_id: user.external_user_id,
    email: user.email,
    actor_type: "authenticatedUser",
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiresAtValue,
      refreshable_until: refreshExpiresAtValue,
    },
  };
}
