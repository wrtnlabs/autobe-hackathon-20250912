import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Refresh authorization token for contentCreatorInstructor
 *
 * This endpoint renews JWT access tokens using a valid refresh token for the
 * Content Creator/Instructor role, maintaining session continuity securely. It
 * validates the refresh token's integrity and expiry, verifies the user status,
 * and issues new access and refresh tokens accordingly.
 *
 * @param props - Object containing the authenticated payload and refresh token
 * @param props.contentCreatorInstructor - Authenticated
 *   contentCreatorInstructor payload
 * @param props.body - Request body containing refresh token string
 * @returns New authorized contentCreatorInstructor object with fresh tokens
 * @throws {Error} When the refresh token is invalid, expired, or user inactive
 */
export async function postauthContentCreatorInstructorRefresh(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsContentCreatorInstructor.IRefresh;
}): Promise<IEnterpriseLmsContentCreatorInstructor.IAuthorized> {
  const { body } = props;

  // Verify and decode the refresh token
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });

  // Validate the decoded payload shape and type property without assertion
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("id" in decoded) ||
    !("type" in decoded) ||
    decoded.type !== "contentcreatorinstructor"
  ) {
    throw new Error("Invalid refresh token payload");
  }

  // Use non-type assertive access
  const userId = String((decoded as Record<string, unknown>).id);

  // Find the user from database
  const user =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findFirst({
      where: {
        id: userId,
        status: "active",
        deleted_at: null,
      },
    });

  if (!user) {
    throw new Error("User not found or inactive");
  }

  // Current timestamp for token expiry
  const nowTimestamp = Date.now();

  // Calculate expiry dates as ISO strings
  const accessTokenExpiry = toISOStringSafe(
    new Date(nowTimestamp + 60 * 60 * 1000),
  ); // 1 hour
  const refreshTokenExpiry = toISOStringSafe(
    new Date(nowTimestamp + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Generate new access token
  const accessToken = jwt.sign(
    {
      id: user.id,
      type: "contentcreatorinstructor",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate new refresh token
  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: "contentcreatorinstructor",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized user data conforming to IAuthorized
  return {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    password_hash: user.password_hash,
    first_name: user.first_name,
    last_name: user.last_name,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshTokenExpiry,
    },
  };
}
