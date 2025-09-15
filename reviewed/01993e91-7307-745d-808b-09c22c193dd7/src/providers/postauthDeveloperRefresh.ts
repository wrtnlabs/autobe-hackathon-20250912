import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Token refresh operation for developer users using a valid refresh token.
 *
 * This function verifies the provided refresh token, ensures the token type is
 * 'developer', retrieves the associated developer user from the database, and
 * issues new JWT access and refresh tokens with appropriate expiration. It
 * returns the developer's authorized profile along with new token details.
 *
 * @param props - Object containing developer auth payload and refresh token
 *   body
 * @param props.developer - The developer auth payload (not used here but
 *   required for signature)
 * @param props.body - The request body containing the refresh token
 * @returns The authorized developer profile with new JWT tokens
 * @throws {Error} When refresh token is missing or invalid
 * @throws {Error} When developer user is not found or is deleted
 */
export async function postauthDeveloperRefresh(props: {
  developer: DeveloperPayload;
  body: ITaskManagementDeveloper.IRefresh;
}): Promise<ITaskManagementDeveloper.IAuthorized> {
  const { body } = props;

  if (!body.refresh_token) {
    throw new Error("Refresh token must be provided");
  }

  let decoded: { id: string & tags.Format<"uuid">; type: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string & tags.Format<"uuid">; type: string };
  } catch {
    throw new Error("Invalid refresh token");
  }

  if (decoded.type !== "developer") {
    throw new Error("Invalid token type for developer refresh");
  }

  const developer = await MyGlobal.prisma.task_management_developer.findFirst({
    where: { id: decoded.id, deleted_at: null },
  });

  if (!developer) {
    throw new Error("Developer not found or deleted");
  }

  const payload = {
    id: developer.id,
    type: "developer" as const,
  };

  const accessExpiredInSeconds = 3600; // 1 hour
  const refreshExpiredInSeconds = 7 * 24 * 3600; // 7 days

  const nowSec = Math.floor(Date.now() / 1000);

  const newAccessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessExpiredInSeconds,
    issuer: "autobe",
  });

  const newRefreshToken = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExpiredInSeconds,
      issuer: "autobe",
    },
  );

  // Calculate expiration dates using toISOStringSafe
  const expired_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date((nowSec + accessExpiredInSeconds) * 1000),
  );
  const refreshable_until: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date((nowSec + refreshExpiredInSeconds) * 1000),
  );

  return {
    id: developer.id,
    email: developer.email,
    password_hash: developer.password_hash,
    name: developer.name,
    created_at: toISOStringSafe(developer.created_at),
    updated_at: toISOStringSafe(developer.updated_at),
    deleted_at: developer.deleted_at
      ? toISOStringSafe(developer.deleted_at)
      : undefined,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
